# Current State
**Última actualización:** 2026-04-17
**Agente:** Claude Code (sesión 7)

---

## Objetivo del proyecto

Construir una aplicación web (**ARR Command Center**) que sustituya el proceso manual:
> Salesforce → Excel → cálculo manual del CFO

La app calcula, visualiza y audita el ARR (Annual Recurring Revenue) de isEazy.

**Usuarios finales:** CFO + equipo de finanzas de isEazy.  
**Stack:** Python/FastAPI + PostgreSQL + React/Next.js.

---

## Estado actual: FASES A, B y C COMPLETADAS

| Fase | Nombre | Estado | Tests |
|------|--------|--------|-------|
| A | Motor de cálculo + infraestructura | ✅ completa | 17/17 |
| B | Backend API FastAPI | ✅ completa | 21/21 |
| C | Frontend Next.js | ✅ completa | build OK |
| D | Historial de snapshots en UI | ⏳ pendiente | — |
| E | Integración real Salesforce | ⏳ pendiente | — |
| F | Panel de alertas en UI | ⏳ pendiente | — |
| G | Input Stripe en UI + vista consultor | ⏳ pendiente | — |
| H | Endurecimiento, tests e2e, UX final | ⏳ pendiente | — |

**Tests backend: 38/38 pasan** (`pytest tests/` sin necesidad de Docker).  
**Frontend: build de producción exitoso**, `npm run build` sin errores.

---

## Decisiones confirmadas (no cambiar en el MVP)

| Decisión | Valor | Fuente |
|----------|-------|--------|
| Fórmula ARR | `(precio_real / días_periodo_normalizado) × 365` | Excel + CFO |
| Fidelidad al Excel | Replicar exactamente, flags para mejoras futuras | ADR-001 |
| Fuente principal datos | Salesforce API (OAuth2 + SOQL) | ADR-002 |
| Fuente Author Online | Stripe = input manual en UI (V1, no API) | ADR-002 + CFO |
| Variable Invoicing | Misma lógica SaaS si producto es tipo SaaS | CFO confirmado |
| Moneda | Todo EUR, sin conversión de divisa | CFO confirmado |
| Stack técnico | Python/FastAPI + PostgreSQL + React/Next.js | ADR-003 |
| Clasificación SaaS | Tabla maestra `product_classifications` | ADR-001 |

---

## Reglas de negocio críticas (leer antes de tocar el motor de cálculo)

1. **Fórmula:** `annualized_value = (real_price / service_days) × 365`
2. **real_price** = `quantity × unit_price`
3. **start_month** = primer día del mes de `effective_start`
4. **raw_days** = `effective_end - effective_start` (días naturales)
5. **end_month_normalized** = `start_month + raw_days - 1`
6. **service_days** = `end_month_normalized - start_month`
7. **Activo en mes M si:** `start_month ≤ último_día_M AND end_month_normalized ≥ primer_día_M`
8. **Sin fecha inicio:** usa `close_date` como proxy (AS-01)
9. **Sin fecha fin:** asume `effective_start + 365 días` (AS-02)
10. **Producto no clasificado:** excluido del ARR, genera alerta ERROR

---

## Mapa de archivos del proyecto

```
ARR_Command_Center/
├── app/backend/
│   ├── main.py                    ← FastAPI app, CORS, routers
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── config/
│   │   └── settings.py            ← carga .env (DATABASE_URL, SF_*)
│   ├── db/
│   │   ├── connection.py          ← SQLAlchemy engine + get_db()
│   │   ├── models.py              ← todos los modelos ORM
│   │   └── migrations/versions/
│   │       └── 0001_initial_schema.py
│   ├── core/
│   │   ├── arr_calculator.py      ← motor de cálculo (replica Excel AJ)
│   │   ├── alert_checker.py       ← resumen de calidad de datos
│   │   └── snapshot_manager.py    ← crea snapshot completo en BD
│   └── api/
│       ├── schemas.py             ← modelos Pydantic request/response
│       └── routes/
│           ├── arr.py             ← GET /api/arr/summary|by-consultant|line-items
│           ├── snapshots.py       ← GET /api/snapshots, /api/snapshots/{id}
│           ├── sync.py            ← POST /api/sync (mock SF en Fase B)
│           ├── config.py          ← CRUD /api/config/products|consultants
│           ├── stripe.py          ← GET/PUT /api/stripe-mrr
│           └── alerts.py          ← GET /api/alerts, PATCH /api/alerts/{id}
├── app/frontend/                  ← ✅ Next.js 16 + React 19 + Tailwind 4
│   ├── next.config.ts             ← rewrites /api/* → http://localhost:8000/api/*
│   ├── lib/
│   │   ├── types.ts               ← TypeScript types espejo de schemas.py
│   │   ├── api.ts                 ← cliente API tipado con axios
│   │   ├── utils.ts               ← formatEUR, formatPct, colores por producto
│   │   └── providers.tsx          ← React Query QueryClientProvider
│   ├── components/
│   │   ├── Sidebar.tsx            ← navegación lateral (activo por pathname)
│   │   ├── SyncButton.tsx         ← botón "Actualizar SF" con spinner
│   │   ├── KPICards.tsx           ← 3 tarjetas: ARR, MoM€, MoM%
│   │   ├── ARRChart.tsx           ← gráfico líneas por producto (recharts)
│   │   ├── ARRBreakdownTable.tsx  ← tabla desglose por línea de negocio
│   │   └── FilterBar.tsx          ← filtros línea/fechas
│   └── app/
│       ├── layout.tsx             ← root layout con Sidebar + Providers
│       ├── page.tsx               ← Dashboard principal (Fase C)
│       ├── consultants/page.tsx   ← ARR por consultor con filas expandibles
│       ├── stripe/page.tsx        ← Input MRR Stripe con modal edición
│       ├── alerts/page.tsx        ← Alertas agrupadas por tipo, marcar revisadas
│       └── config/page.tsx        ← CRUD productos y consultores inline
├── scripts/
│   ├── import_excel_data.py       ← Excel → BD (crea snapshot "excel_import")
│   ├── validate_vs_excel.py       ← compara ARR app vs Excel línea a línea
│   └── beta_report.py             ← informe completo en terminal (sin SF ni frontend)
├── tests/
│   ├── test_arr_calculator.py     ← 17 tests unitarios del motor
│   └── test_api.py                ← 21 tests de endpoints (SQLite in-memory)
├── conftest.py                    ← DATABASE_URL fallback para tests sin Docker
├── docker-compose.yml             ← PostgreSQL puerto 5432 (arruser/arrpass/arrdb)
└── .env.example                   ← plantilla de variables
```

---

## API implementada (Fase B)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/arr/summary` | ARR mensual por producto. Params: `snapshot_id`, `month_from`, `month_to`, `product_type` |
| GET | `/api/arr/by-consultant` | ARR por consultor para un mes. Params: `snapshot_id`, `month`, `country` |
| GET | `/api/arr/line-items` | Lista paginada de line items. Params: `snapshot_id`, `is_saas`, `product_type`, `page`, `page_size` |
| GET | `/api/snapshots` | Lista todos los snapshots (más reciente primero) |
| GET | `/api/snapshots/{id}` | Detalle de un snapshot |
| POST | `/api/sync` | Dispara recálculo (mock en Fase B, real SF en Fase E) |
| GET | `/api/alerts` | Alertas de un snapshot. Params: `snapshot_id`, `reviewed` |
| PATCH | `/api/alerts/{id}` | Marcar alerta como revisada con nota |
| GET | `/api/config/products` | Lista productos clasificados |
| POST | `/api/config/products` | Añadir producto |
| PUT | `/api/config/products/{id}` | Editar clasificación de producto |
| GET | `/api/config/consultants` | Lista consultores con país |
| PUT | `/api/config/consultants/{id}` | Editar consultor |
| GET | `/api/stripe-mrr` | MRR Stripe de un snapshot |
| PUT | `/api/stripe-mrr` | Añadir/editar MRR Stripe (upsert) |
| GET | `/api/health` | Health check |

Docs interactivas en: `http://localhost:8000/docs`

---

## Cómo arrancar el proyecto desde cero

```bash
# 1. Base de datos
docker-compose up -d

# 2. Dependencias Python
pip install -r app/backend/requirements.txt

# 3. Variables de entorno
cp .env.example .env
# Editar .env con DATABASE_URL=postgresql://arruser:arrpass@localhost:5432/arrdb

# 4. Schema de BD
cd app/backend && alembic upgrade head && cd ../..

# 5. Importar Excel (crea snapshot base)
python scripts/import_excel_data.py

# 6. Validar paridad con Excel (debe salir PASS)
python scripts/validate_vs_excel.py

# 7. Tests (sin Docker)
pytest tests/

# 8. Servidor API
uvicorn app.backend.main:app --reload --port 8000

# 9. Frontend
cd app/frontend && npm install && npm run dev
# Abre http://localhost:3000

# 10. Informe beta (valida números sin frontend ni SF)
python scripts/beta_report.py
```

---

## Frontend (Fase C) — detalles técnicos

- **Stack:** Next.js 16.2.4, React 19, Tailwind CSS 4, TypeScript 5
- **Datos:** React Query v5 (staleTime 30s), axios, proxy rewrites `/api/*`
- **Gráficos:** recharts 3.x
- **Rutas:** `/` dashboard, `/consultants`, `/stripe`, `/alerts`, `/config`
- **Nota versión:** Next.js 16 renombró `middleware.ts` → `proxy.ts`; Tailwind 4 usa `@import "tailwindcss"` en globals.css (sin config file)

---

## Modo beta: validar sin Salesforce ni frontend

```bash
# Primera vez: importa Excel y genera informe completo
python scripts/beta_report.py --reimport

# Usos siguientes
python scripts/beta_report.py --month 2025-03

# Guardar a fichero
python scripts/beta_report.py --output informe.txt
```

---

## Riesgos abiertos

| ID | Riesgo | Severidad | Cuándo se resuelve |
|----|--------|-----------|-------------------|
| RT-01 | Mapeo exacto de campos en Salesforce puede diferir | ALTA | Fase E — verificar con admin SF |
| RT-02 | Tabla de productos desactualizada (nombres ≠ SF) | ALTA | Fase E — comparar con export real de SF |
| RT-03 | `validate_vs_excel.py` no ejecutado contra BD real | MEDIA | Primera vez que se levante Docker |
| Q-05 | ¿TaaS debe incluirse en ARR SaaS? | BAJA | Validar con CFO antes de Fase E |
| Q-06 | ¿Doble conteo en renovaciones? | MEDIA | Validar con CFO antes de Fase E |
| Q-08 | ¿Desde qué fecha son fiables los campos de suscripción en SF? | MEDIA | Preguntar al admin SF en Fase E |

---

## Próximo paso

**Fase D — Historial de snapshots en UI.**

Leer antes de empezar:
1. `docs/handover/NEXT_STEPS.md` — checklist detallado de Fase D
2. `docs/specs/10_versioning_and_snapshots.md` — spec de snapshots
3. `app/backend/api/schemas.py` — tipos SnapshotSummary y SnapshotDetail
