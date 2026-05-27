# SPEC-V4 Fase 4 — Monitor de Renovaciones

**Fase:** 4 de 4  
**Página nueva:** `/renewals`  
**Entrada sidebar:** "Renovaciones" con icono `CalendarClock` (lucide-react)  
**Dependencias:** Ninguna directa (usa ARRLineItem del snapshot activo)

---

## 1. Descripción funcional

El Monitor de Renovaciones es una herramienta **forward-looking**: para cada par `(account × product_type)` activo hoy, muestra cuándo expira su último contrato y si ya hay o no una renovación firmada. Es la capa de alerta temprana que alimentará en el futuro el módulo de Predictive Revenue.

**Valor operativo inmediato:** el equipo de ventas y el CFO tienen en un vistazo qué contratos expiran en los próximos N meses, cuáles están ya asegurados (renovación firmada en Salesforce) y cuáles siguen en riesgo.

---

## 2. Lógica de detección

### Definición de "fecha de vencimiento" de un cliente×BL

Para cada `(account_name, product_type)` con ARR activo en el snapshot:

```python
max_end = MAX(end_month_normalized)
         de todos los ARRLineItems activos de esa cuenta×BL
```

### Detección de renovación ya firmada

Una renovación está firmada si existe al menos un `ARRLineItem` para la misma `(account_name, product_type)` con:

```python
start_month > max_end
```

Es decir, hay un contrato que empieza después de que termine el último activo.

### Estados de cada cuenta×BL

| Estado | Condición | Color UI |
|--------|-----------|----------|
| **Renovado** | Existe ARRLineItem con `start_month > max_end` | Verde |
| **En riesgo** | `max_end` cae dentro del horizonte configurado y no hay renovación | Naranja/rojo |
| **Fuera de horizonte** | `max_end` está más allá del horizonte configurado | Gris neutro |

### Horizonte configurable

El usuario selecciona con un selector cuántos meses hacia adelante quiere ver: **3 / 6 / 12 meses** (o número libre). Por defecto: 6 meses.

Solo se muestran en la tabla contratos cuyo `max_end` cae dentro del horizonte seleccionado. Los contratos renovados dentro de ese horizonte también se muestran (en verde) para dar visibilidad de qué ya está gestionado.

---

## 3. Layout de la página

```
┌──────────────────────────────────────────────────────────────────────┐
│  Monitor de Renovaciones                                              │
│  Contratos que expiran en los próximos N meses                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Horizonte: [ 3 meses ] [ 6 meses ] [ 12 meses ] [ Libre: ___ ]     │
│                                                                      │
│  KPI CARDS                                                           │
│  ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐  │
│  │ ARR en riesgo      │ │ ARR ya renovado    │ │ Contratos en     │  │
│  │ -1.240.000 €       │ │ +870.000 €         │ │ riesgo: 18       │  │
│  │ en los próx. 6 m.  │ │ en los próx. 6 m.  │ │ Renovados: 12    │  │
│  └────────────────────┘ └────────────────────┘ └──────────────────┘  │
│                                                                      │
│  GRÁFICO DE BARRAS — Vencimientos por mes                            │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Barras agrupadas por mes de vencimiento:                    │    │
│  │  ■ En riesgo (naranja)  ■ Ya renovado (verde)               │    │
│  │                                                              │    │
│  │  Jun 26 │██░░░░│  Jul 26 │███░░░│  Ago 26 │░░│  Sep 26 │██│ │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  TABLA DE CONTRATOS                          [↓ Exportar CSV]       │
│                                                                      │
│  Filtrar: [ Todos ▾ ] [ Solo en riesgo ] [ Solo renovados ]         │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Estado │ Cliente       │ BL         │ ARR actual │ Vence   │ Δ │  │
│  ├────────┼───────────────┼────────────┼────────────┼─────────┼───┤  │
│  │ ✓ verde│ Mapfre        │ SaaS LMS   │ 48.000 €   │ Jul 26  │+2%│  │
│  │ ⚠ naran│ Banco Santan. │ SaaS Skills│ 36.000 €   │ Jun 26  │ — │  │
│  │ ⚠ naran│ Empresa XYZ  │ SaaS Author│ 24.000 €   │ Aug 26  │ — │  │
│  └────────┴───────────────┴────────────┴────────────┴─────────┴───┘  │
│                                                                      │
│  Nota: "Renovado" significa que existe un nuevo contrato firmado     │
│  en Salesforce que comienza tras la fecha de vencimiento actual.     │
└──────────────────────────────────────────────────────────────────────┘
```

### Columnas de la tabla

| Columna | Descripción |
|---------|-------------|
| Estado | Icono + color: ✓ Renovado (verde) / ⚠ En riesgo (naranja) |
| Cliente | `account_name` |
| Línea de Negocio | `product_type` |
| Consultor | `opportunity_owner` del contrato más reciente |
| ARR actual | ARR de este mes para esa cuenta×BL |
| Fecha de vencimiento | `max_end` formateado como "Jun 2026" |
| Meses restantes | Número de meses hasta `max_end` desde hoy |
| ARR renovación | Si está renovado: ARR del nuevo contrato. Si no: "—" |
| Δ renovación | Si renovado: variación % entre ARR actual y ARR renovación (Up/Down) |

---

## 4. Backend

### Nuevo archivo: `app/backend/api/routes/renewals.py`

#### Endpoint: `GET /api/renewals/monitor`

**Query params:**
```
snapshot_id:    UUID   (opcional, default = último snapshot)
horizon_months: int    (default = 6, rango válido: 1–24)
product_type:   str    (opcional)
account_name:   str    (opcional)
status:         str    (enum: "all" | "at_risk" | "renewed", default = "all")
```

**Lógica:**

```python
def get_renewal_monitor(snapshot_id, horizon_months, filters):
    today = date.today()
    horizon_end = today + relativedelta(months=horizon_months)

    # 1. Obtener todos los ARRLineItems activos hoy, agrupados por (account, product_type)
    # 2. Para cada grupo, calcular max_end = MAX(end_month_normalized)
    # 3. Filtrar: max_end entre today y horizon_end
    # 4. Detectar renovaciones: existe ARRLineItem con start_month > max_end para el mismo grupo

    results = []
    for (account, product_type), items in grouped_items.items():
        max_end = max(item.end_month_normalized for item in items)
        
        if not (today <= max_end <= horizon_end):
            continue
        
        # Buscar renovación
        renewal_items = [i for i in all_items_of_account_bl 
                        if i.start_month > max_end]
        is_renewed = len(renewal_items) > 0
        
        renewal_arr = sum(
            daily_price_to_monthly(i) for i in renewal_items
            if i.start_month == min(r.start_month for r in renewal_items)
        ) if is_renewed else None

        current_arr = compute_monthly_arr(items, today)
        
        results.append(RenewalItem(
            account_name=account,
            product_type=product_type,
            consultant=items[0].consultant,
            current_arr=current_arr,
            expiry_month=max_end,
            months_remaining=months_between(today, max_end),
            is_renewed=is_renewed,
            renewal_arr=renewal_arr,
            renewal_delta_pct=((renewal_arr - current_arr) / current_arr * 100) 
                              if renewal_arr else None,
            status="renewed" if is_renewed else "at_risk",
        ))

    return sorted(results, key=lambda x: (x.status == "renewed", x.expiry_month))
```

**Response body:**
```python
class RenewalItem(BaseModel):
    account_name: str
    product_type: str
    consultant: str
    current_arr: Decimal
    expiry_month: date
    months_remaining: int
    is_renewed: bool
    renewal_arr: Optional[Decimal]
    renewal_delta_pct: Optional[float]
    status: Literal["renewed", "at_risk"]

class RenewalSummary(BaseModel):
    at_risk_arr: Decimal
    at_risk_count: int
    renewed_arr: Decimal
    renewed_count: int
    horizon_months: int

class RenewalMonitorResponse(BaseModel):
    items: List[RenewalItem]
    summary: RenewalSummary
    # Para el gráfico de barras por mes
    by_month: List[dict]   # [{month, at_risk_arr, renewed_arr}, ...]
```

---

### Registro en el router

```python
from app.backend.api.routes import renewals
app.include_router(renewals.router, prefix="/api/renewals", tags=["renewals"])
```

---

## 5. Frontend

### Nuevo archivo: `app/frontend/app/renewals/page.tsx`

#### Estado del componente

```typescript
const { productType, accountName } = useAnalysisFilters()
const [horizonMonths, setHorizonMonths] = useState(6)
const [statusFilter, setStatusFilter] = useState<"all" | "at_risk" | "renewed">("all")

const monitor = useQuery({
  queryKey: ["renewals-monitor", snapshotId, horizonMonths, productType, accountName],
  queryFn: () => api.renewals.monitor({ horizon_months: horizonMonths, product_type: productType, account_name: accountName }),
})
```

#### Selector de horizonte

Cuatro botones: `3 meses | 6 meses | 12 meses` + input libre numérico. El botón activo se marca visualmente. Al cambiar, se refrescan todas las queries.

#### KPI Cards

Tres cards:
- **ARR en riesgo**: suma del `current_arr` de todos los items `at_risk`. Color rojo.
- **ARR ya renovado**: suma del `renewal_arr` de items `renewed`. Color verde.
- **Conteo**: "N en riesgo · M renovados"

#### Gráfico de vencimientos por mes (`RenewalsByMonthChart.tsx`)

- Recharts `<BarChart>` agrupado, dos barras por mes: "En riesgo" (naranja `#f97316`) y "Renovado" (verde `#22c55e`)
- X axis: los meses dentro del horizonte
- Tooltip: mes, ARR en riesgo, ARR renovado, conteo de contratos

#### Tabla de contratos

Columna Estado usa badge de color:
- `⚠ En riesgo` → badge naranja
- `✓ Renovado` → badge verde con importe de renovación

Filtros de estado como botones: Todos | Solo en riesgo | Solo renovados.

Ordenación por defecto: "En riesgo" primero, luego por fecha de vencimiento ascendente (los más urgentes arriba).

#### Exportación CSV

Botón "↓ Exportar CSV" genera un fichero con todas las columnas de la tabla, incluyendo el campo `status` en texto plano.

#### Entrada en el sidebar

```tsx
{ href: "/renewals", label: "Renovaciones", icon: CalendarClock }
```

---

## 6. Consideraciones de diseño

### Qué NO hace este módulo

- No predice la probabilidad de renovación (eso es Predictive Revenue, futura app separada).
- No modifica datos ni permite marcar manualmente como "renovado" — la fuente de verdad es siempre Salesforce vía el snapshot.
- No distingue entre "no renovado todavía" y "decidido no renovar" — esa información solo existe en Planhardt/CRM, que expresamente se descartó.

### Limitación conocida

Si un cliente renueva con un gap de 1-2 meses (contrato termina enero, nuevo contrato empieza marzo), aparecerá como "En riesgo" hasta que el nuevo contrato entre en el snapshot. Esto es correcto: refleja que en el snapshot actual no hay continuidad garantizada. El consultable directo de Salesforce es la única forma de resolverlo antes de que se importe un nuevo snapshot.

---

## 7. Criterios de aceptación

- [ ] La página `/renewals` aparece en el sidebar como "Renovaciones" con icono `CalendarClock`
- [ ] Los botones 3/6/12 meses actualizan todos los datos sin recargar la página
- [ ] El input libre de horizonte acepta valores entre 1 y 24 meses
- [ ] Contratos con renovación firmada en Salesforce aparecen en verde con el ARR de la renovación
- [ ] Contratos sin renovación aparecen en naranja, ordenados por urgencia (vencimiento más próximo primero)
- [ ] El gráfico muestra la distribución de vencimientos mes a mes dentro del horizonte
- [ ] Los filtros del sidebar (Línea de Negocio, Cliente) aplican correctamente
- [ ] El exportar CSV incluye todas las columnas con el estado en texto legible
- [ ] La nota explicativa sobre qué significa "Renovado" es visible en la página
- [ ] Si no hay contratos que venzan en el horizonte seleccionado, se muestra estado vacío con mensaje explicativo
