"""
ARR Expert — IA embebida con acceso a datos reales de ARR.
  POST /api/expert/chat
"""

import json
import os
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.backend.api.routes.arr import _latest_snapshot_id, _last_day_of_month, _month_range
from app.backend.db.connection import get_db
from app.backend.db.models import ARRLineItem, RawOpportunityLineItem, Snapshot, SnapshotAlert, SnapshotStripeMRR

router = APIRouter()

SYSTEM_PROMPT = """Eres el ARR Expert de isEazy, una empresa de e-learning B2B con sede en España.
Actúas como un experto en negocios SaaS especializado en e-learning.

Tu rol es analizar datos de ARR (Annual Recurring Revenue) de isEazy y proporcionar
insights accionables al equipo financiero.

CONTEXTO DE NEGOCIO DE ISEAZY:
- isEazy tiene varias líneas de producto:
  - SaaS LMS: plataforma de gestión de aprendizaje
  - SaaS AIO (All In One): solución LMS + creación de contenido
  - SaaS Author: herramienta de autoría de contenido e-learning (offline)
  - Author Online (Stripe): versión online/SaaS de Author, facturación por Stripe
  - SaaS Engage: herramienta de comunicación interna
  - SaaS Skills: plataforma de gestión de competencias
- Todo el ARR está en EUR
- Los datos provienen de Salesforce (líneas SaaS) y Stripe (Author Online)
- El ARR se calcula anualizando los contratos activos en cada mes

INSTRUCCIONES DE RESPUESTA:
1. Basa SIEMPRE tus respuestas exclusivamente en los datos disponibles en las tools.
   Nunca inventes datos ni extrapoles sin advertirlo claramente.
2. Cuando respondas con datos numéricos, incluye SIEMPRE una tabla para claridad.
3. Cuando sea relevante, incluye un gráfico para visualizar tendencias.
4. Ofrece contexto de industria SaaS cuando sea útil (benchmarks de churn, crecimiento, etc.)
   pero diferenciando claramente lo que son datos reales vs. conocimiento de industria.
5. Si el usuario pregunta algo que no puedes responder con los datos disponibles,
   dilo explícitamente en lugar de especular.
6. Responde siempre en español.
7. Sé conciso pero completo. Prioriza insights accionables.

FORMATO DE SALIDA:
Tu respuesta debe ser un JSON válido con la siguiente estructura exacta:
{
  "blocks": [
    {"type": "text", "content": "...análisis narrativo..."},
    {"type": "table", "table_title": "...", "columns": [...], "rows": [[...], ...]},
    {"type": "chart", "chart_type": "bar|line", "chart_title": "...",
     "chart_data": [...], "x_key": "...", "data_keys": [...], "colors": [...]}
  ]
}
Incluye solo los bloques necesarios para la respuesta. El texto siempre primero.
NO incluyas ningún texto fuera del JSON."""

EXPERT_TOOLS = [
    {
        "name": "get_arr_summary",
        "description": "Obtiene ARR mensual por tipo de producto para un rango de fechas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month_from": {"type": "string", "description": "YYYY-MM-DD"},
                "month_to": {"type": "string", "description": "YYYY-MM-DD"},
                "product_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Lista de tipos de producto a filtrar. Si vacío, devuelve todos.",
                },
                "mode": {"type": "string", "enum": ["from_start", "from_close"]},
            },
        },
    },
    {
        "name": "get_top_accounts",
        "description": "Obtiene los N clientes con mayor ARR en un periodo.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month_from": {"type": "string", "description": "YYYY-MM-DD"},
                "month_to": {"type": "string", "description": "YYYY-MM-DD"},
                "product_types": {"type": "array", "items": {"type": "string"}},
                "limit": {"type": "integer", "description": "Número de cuentas a devolver. Default 10."},
            },
        },
    },
    {
        "name": "get_arr_mom_changes",
        "description": "Obtiene variaciones mes a mes del ARR con detalle de clientes y productos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "Mes a analizar YYYY-MM-DD"},
                "product_types": {"type": "array", "items": {"type": "string"}},
            },
        },
    },
    {
        "name": "get_stripe_mrr",
        "description": "Obtiene datos de Stripe MRR (Author Online) para un rango de fechas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month_from": {"type": "string"},
                "month_to": {"type": "string"},
            },
        },
    },
    {
        "name": "get_data_quality_summary",
        "description": "Obtiene un resumen de alertas de calidad de datos del snapshot activo.",
        "input_schema": {
            "type": "object",
            "properties": {
                "include_reviewed": {"type": "boolean"},
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ExpertChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []
    snapshot_id: Optional[UUID] = None
    combine_lms_aio: bool = False
    combine_author: bool = False


class ExpertResponseBlock(BaseModel):
    type: Literal["text", "table", "chart"]
    content: Optional[str] = None
    table_title: Optional[str] = None
    columns: Optional[List[str]] = None
    rows: Optional[List[List[str]]] = None
    chart_type: Optional[Literal["bar", "line", "area"]] = None
    chart_title: Optional[str] = None
    chart_data: Optional[List[Dict[str, Any]]] = None
    x_key: Optional[str] = None
    data_keys: Optional[List[str]] = None
    colors: Optional[List[str]] = None


class ExpertChatResponse(BaseModel):
    blocks: List[ExpertResponseBlock]
    tokens_used: int
    model: str


# ---------------------------------------------------------------------------
# Tool implementations (query DB directly)
# ---------------------------------------------------------------------------

def _tool_get_arr_summary(
    db: Session,
    snapshot_id: UUID,
    month_from: Optional[str],
    month_to: Optional[str],
    product_types: Optional[List[str]],
    mode: str = "from_start",
) -> dict:
    d_from = date.fromisoformat(month_from).replace(day=1) if month_from else None
    d_to = date.fromisoformat(month_to).replace(day=1) if month_to else None

    if mode == "from_close":
        rows = (
            db.query(ARRLineItem, RawOpportunityLineItem)
            .join(RawOpportunityLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
            .filter(
                ARRLineItem.snapshot_id == snapshot_id,
                ARRLineItem.is_saas == True,
                ARRLineItem.excluded_from_arr == False,
            )
            .all()
        )
        active_items = []
        for arr, raw in rows:
            if product_types and arr.product_type not in product_types:
                continue
            opp_type = (raw.opportunity_type or "").lower().strip()
            if (
                opp_type == "nuevo negocio"
                and raw.subscription_start_date
                and raw.close_date < raw.subscription_start_date
            ):
                active_start = raw.close_date.replace(day=1)
            else:
                active_start = arr.start_month
            active_items.append((active_start, arr.end_month_normalized, arr.product_type, float(arr.annualized_value)))
    else:
        q = db.query(ARRLineItem).filter(
            ARRLineItem.snapshot_id == snapshot_id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
        )
        if product_types:
            q = q.filter(ARRLineItem.product_type.in_(product_types))
        items = q.all()
        active_items = [(i.start_month, i.end_month_normalized, i.product_type, float(i.annualized_value)) for i in items]

    if not active_items:
        return {"months": [], "total": 0}

    starts = [i[0] for i in active_items]
    ends = [i[1] for i in active_items]
    range_start = d_from or min(starts)
    range_end = d_to or max(ends)

    months_list = _month_range(range_start, range_end)
    result = []
    for m in months_list:
        m_end = _last_day_of_month(m)
        by_type: dict = {}
        for start, end, ptype, val in active_items:
            if start <= m_end and end >= m:
                pt = ptype or "Unknown"
                by_type[pt] = by_type.get(pt, 0.0) + val
        if by_type:
            result.append({"month": m.isoformat(), "by_product_type": by_type, "total": sum(by_type.values())})
    return {"months": result}


def _tool_get_top_accounts(
    db: Session,
    snapshot_id: UUID,
    month_from: Optional[str],
    month_to: Optional[str],
    product_types: Optional[List[str]],
    limit: int = 10,
) -> dict:
    d_from = date.fromisoformat(month_from).replace(day=1) if month_from else None
    d_to = date.fromisoformat(month_to).replace(day=1) if month_to else None

    q = db.query(ARRLineItem).options(joinedload(ARRLineItem.raw_line_item)).filter(
        ARRLineItem.snapshot_id == snapshot_id,
        ARRLineItem.is_saas == True,
        ARRLineItem.excluded_from_arr == False,
    )
    if product_types:
        q = q.filter(ARRLineItem.product_type.in_(product_types))
    items = q.all()

    account_totals: dict[str, float] = {}
    for item in items:
        if d_from and item.end_month_normalized < d_from:
            continue
        if d_to and item.start_month > d_to:
            continue
        account = (item.raw_line_item.account_name if item.raw_line_item else None) or "Sin cuenta"
        account_totals[account] = account_totals.get(account, 0.0) + float(item.annualized_value)

    sorted_accounts = sorted(account_totals.items(), key=lambda x: x[1], reverse=True)
    return {
        "accounts": [
            {"rank": i + 1, "account_name": name, "total_arr": arr}
            for i, (name, arr) in enumerate(sorted_accounts[:limit])
        ]
    }


def _tool_get_arr_mom_changes(
    db: Session,
    snapshot_id: UUID,
    month: str,
    product_types: Optional[List[str]],
) -> dict:
    target = date.fromisoformat(month).replace(day=1)
    if target.month == 1:
        prev = target.replace(year=target.year - 1, month=12)
    else:
        prev = target.replace(month=target.month - 1)

    def arr_for_month(m: date) -> dict:
        m_end = _last_day_of_month(m)
        q = db.query(ARRLineItem).options(joinedload(ARRLineItem.raw_line_item)).filter(
            ARRLineItem.snapshot_id == snapshot_id,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
            ARRLineItem.start_month <= m_end,
            ARRLineItem.end_month_normalized >= m,
        )
        if product_types:
            q = q.filter(ARRLineItem.product_type.in_(product_types))
        items = q.all()
        by_type: dict[str, float] = {}
        by_account: dict[str, float] = {}
        for i in items:
            pt = i.product_type or "Unknown"
            acc = (i.raw_line_item.account_name if i.raw_line_item else None) or "Sin cuenta"
            by_type[pt] = by_type.get(pt, 0.0) + float(i.annualized_value)
            by_account[acc] = by_account.get(acc, 0.0) + float(i.annualized_value)
        return {"total": sum(by_type.values()), "by_product_type": by_type, "by_account": by_account}

    current = arr_for_month(target)
    previous = arr_for_month(prev)
    delta = current["total"] - previous["total"]
    pct = (delta / previous["total"] * 100) if previous["total"] > 0 else None

    top_gainers = sorted(
        [(k, current["by_account"].get(k, 0) - previous["by_account"].get(k, 0)) for k in set(list(current["by_account"].keys()) + list(previous["by_account"].keys()))],
        key=lambda x: x[1], reverse=True
    )[:5]
    top_losers = sorted(top_gainers, key=lambda x: x[1])[:5]

    return {
        "month": target.isoformat(),
        "prev_month": prev.isoformat(),
        "current_total": current["total"],
        "prev_total": previous["total"],
        "delta": delta,
        "delta_pct": round(pct, 2) if pct is not None else None,
        "by_product_type_current": current["by_product_type"],
        "by_product_type_prev": previous["by_product_type"],
        "top_gainers": [{"account": a, "delta": d} for a, d in top_gainers],
        "top_losers": [{"account": a, "delta": d} for a, d in top_losers],
    }


def _tool_get_stripe_mrr(
    db: Session,
    snapshot_id: UUID,
    month_from: Optional[str],
    month_to: Optional[str],
) -> dict:
    d_from = date.fromisoformat(month_from) if month_from else None
    d_to = date.fromisoformat(month_to) if month_to else None
    q = db.query(SnapshotStripeMRR).filter(SnapshotStripeMRR.snapshot_id == snapshot_id)
    rows = q.all()
    result = []
    for r in rows:
        m = r.month if isinstance(r.month, date) else date.fromisoformat(str(r.month))
        if d_from and m < d_from:
            continue
        if d_to and m > d_to:
            continue
        result.append({"month": m.isoformat(), "mrr": float(r.mrr), "arr_equivalent": float(r.mrr) * 12})
    result.sort(key=lambda x: x["month"])
    return {"stripe_mrr": result}


def _tool_get_data_quality_summary(
    db: Session,
    snapshot_id: UUID,
    include_reviewed: bool = False,
) -> dict:
    q = db.query(SnapshotAlert).filter(SnapshotAlert.snapshot_id == snapshot_id)
    if not include_reviewed:
        q = q.filter(SnapshotAlert.reviewed == False)
    alerts = q.all()
    by_type: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    for a in alerts:
        by_type[a.alert_type] = by_type.get(a.alert_type, 0) + 1
        by_severity[a.severity] = by_severity.get(a.severity, 0) + 1
    return {
        "total_alerts": len(alerts),
        "by_type": by_type,
        "by_severity": by_severity,
        "include_reviewed": include_reviewed,
    }


def _dispatch_tool(tool_name: str, tool_input: dict, db: Session, snapshot_id: UUID) -> dict:
    if tool_name == "get_arr_summary":
        return _tool_get_arr_summary(
            db, snapshot_id,
            tool_input.get("month_from"),
            tool_input.get("month_to"),
            tool_input.get("product_types"),
            tool_input.get("mode", "from_start"),
        )
    elif tool_name == "get_top_accounts":
        return _tool_get_top_accounts(
            db, snapshot_id,
            tool_input.get("month_from"),
            tool_input.get("month_to"),
            tool_input.get("product_types"),
            tool_input.get("limit", 10),
        )
    elif tool_name == "get_arr_mom_changes":
        return _tool_get_arr_mom_changes(
            db, snapshot_id,
            tool_input.get("month", date.today().replace(day=1).isoformat()),
            tool_input.get("product_types"),
        )
    elif tool_name == "get_stripe_mrr":
        return _tool_get_stripe_mrr(
            db, snapshot_id,
            tool_input.get("month_from"),
            tool_input.get("month_to"),
        )
    elif tool_name == "get_data_quality_summary":
        return _tool_get_data_quality_summary(
            db, snapshot_id,
            tool_input.get("include_reviewed", False),
        )
    return {"error": f"Unknown tool: {tool_name}"}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ExpertChatResponse)
def expert_chat(
    request: ExpertChatRequest,
    db: Session = Depends(get_db),
):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY no configurado. Contacta al administrador.")

    # Limit message length
    message = request.message[:2000]

    # Resolve snapshot
    snapshot_id = request.snapshot_id or _latest_snapshot_id(db)

    # Build conversation history (max last 20 messages)
    history = request.conversation_history[-20:]
    messages: list = [{"role": m.role, "content": m.content} for m in history]
    messages.append({"role": "user", "content": message})

    client = anthropic.Anthropic(api_key=api_key)
    model = "claude-sonnet-4-6"
    total_tokens = 0

    # Agentic loop: Claude can call tools multiple times before final answer
    while True:
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=EXPERT_TOOLS,
            messages=messages,
        )
        total_tokens += response.usage.input_tokens + response.usage.output_tokens

        if response.stop_reason == "tool_use":
            # Process all tool calls in this response
            tool_results = []
            assistant_content = response.content

            for block in response.content:
                if block.type == "tool_use":
                    result = _dispatch_tool(block.name, block.input, db, snapshot_id)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, default=str),
                    })

            # Add assistant message with tool calls, then tool results
            messages.append({"role": "assistant", "content": assistant_content})
            messages.append({"role": "user", "content": tool_results})

        else:
            # Final response — extract text and parse JSON
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text = block.text
                    break

            # Parse the JSON response from Claude
            try:
                # Strip markdown code fences if present
                cleaned = final_text.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                    cleaned = cleaned.rsplit("```", 1)[0]
                parsed = json.loads(cleaned)
                blocks_data = parsed.get("blocks", [])
                # Coerce table rows to strings (Claude sometimes returns numbers)
                for block in blocks_data:
                    if block.get("type") == "table" and "rows" in block:
                        block["rows"] = [[str(cell) for cell in row] for row in block["rows"]]
            except (json.JSONDecodeError, KeyError):
                blocks_data = [{"type": "text", "content": final_text}]

            blocks = [ExpertResponseBlock(**b) for b in blocks_data]
            return ExpertChatResponse(blocks=blocks, tokens_used=total_tokens, model=model)
