# SPEC-V4 Fase 1 — Revisor de Snapshot

**Fase:** 1 de 2  
**Página nueva:** `/snapshot-review`  
**Entrada sidebar:** "Revisor de Snapshot" con icono `GitCompare` (lucide-react)  
**Dependencias:** Ninguna (trabaja con datos ya almacenados en snapshots existentes)

---

## 1. Descripción funcional

El Revisor de Snapshot permite comparar **cómo han cambiado los datos históricos** entre dos snapshots distintos. Su propósito es detectar correcciones retroactivas: Salesforce puede modificar datos de enero 2025 en mayo 2026, y el Revisor muestra exactamente qué oportunidades cambiaron y en cuánto.

**Lógica central:** para los mismos meses históricos, ¿qué diferencias existen entre los datos tal como los vio el Snapshot A (referencia/antiguo) y el Snapshot B (actual/nuevo)?

### Flujo de usuario

1. El usuario entra a `/snapshot-review`.
2. Selecciona **Snapshot A** (referencia, el más antiguo) y **Snapshot B** (el más reciente o "actual").
3. La pantalla muestra un **gráfico de líneas** con el ARR mensual total de ambos snapshots superpuestos, cubriendo todos los meses que ambos tienen en común.
4. Debajo del gráfico, el usuario selecciona un **mes específico** en un desplegable.
5. Aparece la **tabla de detalle** de ese mes: comparativa línea a línea entre snapshot A y snapshot B, con los cambios resaltados.

---

## 2. Layout de la página

```
┌──────────────────────────────────────────────────────────────────────┐
│  Revisor de Snapshot                                                  │
│  Detecta cambios retroactivos entre dos versiones de los datos        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  SELECTOR DE SNAPSHOTS                                                │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐│
│  │ Snapshot A (referencia)         │  │ Snapshot B (actual)         ││
│  │ [Dropdown: lista de snapshots]  │  │ [Dropdown: default=último]  ││
│  │ Snapshot: 2025-03-15 · manual   │  │ Snapshot: 2026-05-20 · auto ││
│  └─────────────────────────────────┘  └─────────────────────────────┘│
│                                                                       │
│  GRÁFICO DE LÍNEAS — ARR mensual total (todos los meses en común)     │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  ── Snapshot A (referencia)    ── Snapshot B (actual)          │   │
│  │  8M ┤              ╭───────────────────╮                       │   │
│  │  7M ┤──────────────╯ · · · · · · · · · ╰────                  │   │
│  │  6M ┤ · · · · ╭──────────────────────────────                  │   │
│  │  5M ┤─────────╯                                                │   │
│  │     └───────────────────────────────────────────────────────── │   │
│  │       Ene 25  Mar 25  May 25  Jul 25  Sep 25  Nov 25  Ene 26   │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  DETALLE POR MES                                                      │
│  Seleccionar mes: [Dropdown: Ene 2025 ▾]                              │
│                                                                       │
│  [Mostrar solo filas con cambios  ○●]   Exportar cambios  [↓ CSV]    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ sf_line_item_id │ Oportunidad │ Cliente │ BL │ Snap A │ Snap B │Δ│ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ [verde]  nueva  │ ...         │ ...     │... │   —    │ 24.000 │+│ │
│  │ [rojo] eliminada│ ...         │ ...     │... │ 18.000 │   —    │-│ │
│  │ [amari] modific.│ ...         │ ...     │... │ 35.000 │ 37.500 │+│ │
│  │ [gris]  igual   │ ...         │ ...     │... │ 12.000 │ 12.000 │=│ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  Resumen del mes: X filas nuevas · Y eliminadas · Z modificadas       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend

### Nuevo archivo: `app/backend/api/routes/snapshot_review.py`

#### Endpoint 1: `GET /api/snapshot-review/monthly-totals`

Devuelve el ARR mensual total de cada snapshot para el gráfico de líneas.

**Query params:**
```
snapshot_a_id: UUID (requerido)
snapshot_b_id: UUID (requerido)
product_type:  str  (opcional, filtro sidebar)
account_name:  str  (opcional, filtro sidebar)
```

**Lógica:**
```python
# Para cada snapshot, sumar ARRMonthlySummary agrupado por mes
# Si product_type está presente, filtrar product_type = product_type
# Si account_name está presente:
#   - No se puede filtrar ARRMonthlySummary directamente (no tiene account_name)
#   - Usar ARRLineItem JOIN RawOpportunityLineItem WHERE account_name = account_name
#   - Calcular monthly ARR manualmente (ver helper get_monthly_arr_by_account_bl)
# En caso normal (sin account_name), usar ARRMonthlySummary para performance

SELECT month, SUM(arr_value) as arr_total
FROM arr_monthly_summaries
WHERE snapshot_id = :snapshot_id
  AND (:product_type IS NULL OR product_type = :product_type)
GROUP BY month
ORDER BY month
```

**Response body:**
```python
class MonthlyTotalPoint(BaseModel):
    month: date
    arr_a: Optional[Decimal]   # None si ese mes no existe en snapshot A
    arr_b: Optional[Decimal]   # None si ese mes no existe en snapshot B

class SnapshotComparisonTotals(BaseModel):
    snapshot_a: SnapshotMeta   # id, created_at, notes
    snapshot_b: SnapshotMeta
    data: List[MonthlyTotalPoint]
    months_common: int          # meses presentes en ambos snapshots
    months_only_in_a: int
    months_only_in_b: int
```

---

#### Endpoint 2: `GET /api/snapshot-review/period-detail`

Devuelve la comparativa línea a línea para un mes concreto.

**Query params:**
```
snapshot_a_id: UUID   (requerido)
snapshot_b_id: UUID   (requerido)
month:         date   (requerido, YYYY-MM-DD primer día del mes)
product_type:  str    (opcional)
account_name:  str    (opcional)
only_changes:  bool   (default False — si True, excluye filas sin delta)
```

**Lógica:**

El mes `M` está cubierto por un `ARRLineItem` cuando `start_month <= M <= end_month_normalized`.

La contribución mensual de un `ARRLineItem` al mes M es:
```python
# days_in_month = número de días del mes M
# service_days_in_M = min(effective_end_date, last_day_M) - max(effective_start_date, first_day_M) + 1
# monthly_arr_contribution = daily_price * service_days_in_M
```

Para la comparativa, se hace un FULL OUTER JOIN entre los `ARRLineItem` de los dos snapshots para el mes M, usando como clave de join el `sf_line_item_id` de la tabla `RawOpportunityLineItem`.

```sql
-- Pseudocódigo SQL conceptual
WITH items_a AS (
    SELECT 
        r.sf_line_item_id,
        r.sf_opportunity_id,
        r.opportunity_name,
        r.account_name,
        r.business_line,
        ali.product_type,
        r.opportunity_owner AS consultant,
        (ali.daily_price * days_in_month(:month)) AS monthly_arr
    FROM arr_line_items ali
    JOIN raw_opportunity_line_items r ON ali.raw_line_item_id = r.id
    WHERE ali.snapshot_id = :snapshot_a_id
      AND ali.start_month <= :month
      AND ali.end_month_normalized >= :month
      AND ali.is_saas = true
      AND ali.excluded_from_arr = false
),
items_b AS (
    -- Misma query para snapshot_b_id
)
SELECT
    COALESCE(a.sf_line_item_id, b.sf_line_item_id) AS sf_line_item_id,
    COALESCE(a.sf_opportunity_id, b.sf_opportunity_id) AS sf_opportunity_id,
    COALESCE(a.opportunity_name, b.opportunity_name) AS opportunity_name,
    COALESCE(a.account_name, b.account_name) AS account_name,
    COALESCE(a.business_line, b.business_line) AS business_line,
    COALESCE(a.product_type, b.product_type) AS product_type,
    COALESCE(a.consultant, b.consultant) AS consultant,
    COALESCE(a.monthly_arr, 0) AS arr_a,
    COALESCE(b.monthly_arr, 0) AS arr_b,
    COALESCE(b.monthly_arr, 0) - COALESCE(a.monthly_arr, 0) AS delta
FROM items_a a
FULL OUTER JOIN items_b b ON a.sf_line_item_id = b.sf_line_item_id
```

**Clasificación de cada fila:**
```python
def classify_change(arr_a, arr_b) -> str:
    if arr_a == 0:   return "new"       # Solo en B
    if arr_b == 0:   return "removed"   # Solo en A
    if arr_a != arr_b: return "modified"
    return "unchanged"
```

**Response body:**
```python
class PeriodDetailRow(BaseModel):
    sf_line_item_id: str
    sf_opportunity_id: str
    opportunity_name: str
    account_name: str
    business_line: str
    product_type: str
    consultant: str
    arr_a: Decimal
    arr_b: Decimal
    delta: Decimal
    delta_pct: Optional[float]  # None si arr_a == 0
    change_type: Literal["new", "removed", "modified", "unchanged"]

class PeriodDetailResponse(BaseModel):
    month: date
    rows: List[PeriodDetailRow]
    summary: dict   # {new: N, removed: N, modified: N, unchanged: N, total_delta: Decimal}
```

---

### Registro en el router

Añadir en `app/backend/main.py`:
```python
from app.backend.api.routes import snapshot_review
app.include_router(snapshot_review.router, prefix="/api/snapshot-review", tags=["snapshot-review"])
```

---

## 4. Frontend

### Nuevo archivo: `app/frontend/app/snapshot-review/page.tsx`

#### Estado del componente

```typescript
const [snapshotAId, setSnapshotAId] = useState<string | null>(null)
const [snapshotBId, setSnapshotBId] = useState<string | null>(null)  // default: último
const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
const [onlyChanges, setOnlyChanges] = useState(false)

// Queries
const monthlyTotals = useQuery(...)   // sólo cuando ambos IDs están presentes
const periodDetail  = useQuery(...)   // sólo cuando selectedMonth está presente
```

#### Componente: Selector de Snapshots

- Usa el endpoint existente `GET /api/snapshots` para listar todos los snapshots disponibles.
- Cada opción muestra: `fecha (YYYY-MM-DD) · tipo (manual/auto) · notes si existen`
- Snapshot B tiene default = el snapshot más reciente.
- Snapshot A tiene default = el penúltimo snapshot.
- Validación: A y B no pueden ser el mismo snapshot.

#### Componente: Gráfico de líneas (`SnapshotComparisonChart.tsx`)

- Recharts `<LineChart>` con `<ResponsiveContainer width="100%" height={320}>`
- Dos `<Line>`: Snapshot A (color `#9ca3af`, trazo discontinuo) y Snapshot B (color `#6d35ff`, trazo sólido)
- Eje X: meses. Eje Y: ARR en EUR (formatter `Intl.NumberFormat`).
- `<Tooltip>` muestra: mes · ARR_A · ARR_B · Delta.
- Meses donde solo existe uno de los dos snapshots se representan con punto vacío en la otra línea.
- Al hacer click en un punto del gráfico, se selecciona ese mes en el desplegable del detalle.

#### Componente: Tabla de detalle (`SnapshotDetailTable.tsx`)

**Columnas:**
| Campo | Cabecera | Ancho |
|-------|----------|-------|
| change_type | Cambio (icono color) | 80px |
| sf_line_item_id | ID SF | 120px |
| sf_opportunity_id | Oportunidad SF | 140px |
| opportunity_name | Oportunidad | flex |
| account_name | Cliente | 160px |
| business_line | Línea | 100px |
| product_type | Producto | 120px |
| consultant | Consultor | 140px |
| arr_a | Snap A (€) | 110px, right-align |
| arr_b | Snap B (€) | 110px, right-align |
| delta | Δ (€) | 100px, right-align, color |
| delta_pct | Δ % | 80px, right-align, color |

**Código de colores de filas:**
- `new` → fondo verde muy tenue (`bg-green-50`), icono ➕
- `removed` → fondo rojo muy tenue (`bg-red-50`), icono ➖
- `modified` → fondo amarillo muy tenue (`bg-amber-50`), icono ✱
- `unchanged` → sin color especial, icono =

**Toggle "Solo cambios":** oculta las filas con `change_type === "unchanged"`.

**Resumen debajo de la tabla:**
```
X nuevas  ·  Y eliminadas  ·  Z modificadas  ·  W sin cambios  |  Δ total: +/-N €
```

#### Llamadas API — añadir en `app/frontend/lib/api.ts`

```typescript
snapshotReview: {
  monthlyTotals: (params: {
    snapshot_a_id: string
    snapshot_b_id: string
    product_type?: string
    account_name?: string
  }) =>
    client
      .get<SnapshotComparisonTotals>("/snapshot-review/monthly-totals", { params })
      .then(r => r.data),

  periodDetail: (params: {
    snapshot_a_id: string
    snapshot_b_id: string
    month: string
    product_type?: string
    account_name?: string
    only_changes?: boolean
  }) =>
    client
      .get<PeriodDetailResponse>("/snapshot-review/period-detail", { params })
      .then(r => r.data),
}
```

#### Tipos — añadir en `app/frontend/lib/types.ts`

```typescript
export interface SnapshotMeta {
  id: string
  created_at: string
  sync_type: string
  notes?: string
}

export interface MonthlyTotalPoint {
  month: string
  arr_a: number | null
  arr_b: number | null
}

export interface SnapshotComparisonTotals {
  snapshot_a: SnapshotMeta
  snapshot_b: SnapshotMeta
  data: MonthlyTotalPoint[]
  months_common: number
  months_only_in_a: number
  months_only_in_b: number
}

export type ChangeType = "new" | "removed" | "modified" | "unchanged"

export interface PeriodDetailRow {
  sf_line_item_id: string
  sf_opportunity_id: string
  opportunity_name: string
  account_name: string
  business_line: string
  product_type: string
  consultant: string
  arr_a: number
  arr_b: number
  delta: number
  delta_pct: number | null
  change_type: ChangeType
}

export interface PeriodDetailResponse {
  month: string
  rows: PeriodDetailRow[]
  summary: {
    new: number
    removed: number
    modified: number
    unchanged: number
    total_delta: number
  }
}
```

#### Entrada en el sidebar

En el componente de navegación lateral, añadir:
```tsx
{ href: "/snapshot-review", label: "Revisor de Snapshot", icon: GitCompare }
```

---

## 5. Consideraciones de rendimiento

- `ARRMonthlySummary` ya está pre-calculada → el endpoint `monthly-totals` es rápido.
- El endpoint `period-detail` hace un FULL OUTER JOIN entre dos snapshots para un mes. Puede ser costoso en snapshots grandes. Índices recomendados:
  ```sql
  CREATE INDEX idx_arr_line_items_snapshot_month 
    ON arr_line_items(snapshot_id, start_month, end_month_normalized);
  CREATE INDEX idx_raw_oli_sf_line_item 
    ON raw_opportunity_line_items(sf_line_item_id, snapshot_id);
  ```
- Si el dataset es muy grande (>50k filas por snapshot), considerar paginación en `period-detail`. Para V4 inicial, sin paginación (la mayoría de meses tienen <5k líneas).

---

## 6. Criterios de aceptación

- [ ] La página `/snapshot-review` aparece en el sidebar como "Revisor de Snapshot" con icono `GitCompare`
- [ ] Por defecto al entrar, Snapshot B = el snapshot más reciente; Snapshot A = el penúltimo
- [ ] El gráfico muestra dos líneas coloreadas diferenciadas con ARR mensual para el rango completo que tienen en común ambos snapshots
- [ ] Al hacer click en un punto del gráfico, se selecciona ese mes en el desplegable
- [ ] El desplegable de mes muestra todos los meses en común entre ambos snapshots
- [ ] La tabla de detalle muestra todas las columnas especificadas con el código de colores correcto
- [ ] El toggle "Solo cambios" oculta filas `unchanged`
- [ ] Los filtros del sidebar (Línea de Negocio, Cliente) aplican correctamente al gráfico y a la tabla
- [ ] Las cifras de ARR se formatean con separadores de miles y símbolo € 
- [ ] El resumen debajo de la tabla muestra el conteo correcto de cambios y el delta total
- [ ] Si los dos snapshots seleccionados son idénticos (mismo `data_hash`), mostrar aviso: "Estos dos snapshots tienen datos idénticos"
- [ ] Si no hay snapshots suficientes para comparar (solo existe 1), mostrar estado vacío con mensaje explicativo
