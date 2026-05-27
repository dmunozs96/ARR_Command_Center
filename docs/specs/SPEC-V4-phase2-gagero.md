# SPEC-V4 Fase 2 — Gagero: Análisis de Variaciones

**Fase:** 2 de 2  
**Página nueva:** `/gagero`  
**Entrada sidebar:** "Gagero" con icono `TrendingUp` (lucide-react)  
**Dependencias:** Ninguna (trabaja sobre el snapshot activo o cualquier snapshot seleccionado)

---

## 1. Descripción funcional

Gagero explica **por qué cambió el ARR** entre dos periodos, descomponiéndolo en cuatro drivers:

| Driver | Descripción |
|--------|-------------|
| **New Logo** | Cliente × Línea de Negocio que tiene ARR > 0 en el Periodo B pero no existía en el Periodo A |
| **Churn** | Cliente × Línea de Negocio que tenía ARR > 0 en el Periodo A pero ya no existe en el Periodo B |
| **Up Selling** | Cliente × Línea de Negocio presente en ambos periodos con ARR mayor en B |
| **Down Selling** | Cliente × Línea de Negocio presente en ambos periodos con ARR menor en B |

**Unidad de análisis obligatoria:** `(account_name × product_type)`. Nunca a nivel empresa sola, nunca a nivel oportunidad sola. Esto es deliberado: un cliente puede ser Churn en Skills y Up Selling en LMS simultáneamente — ambas clasificaciones coexisten y son correctas.

**Ámbito:** dentro de un único snapshot (el activo por defecto). El usuario no cruza snapshots en Gagero — eso es el Revisor de Snapshot.

### Comparativas disponibles

| Botón | Descripción | Lógica de periodos |
|-------|-------------|-------------------|
| Mes anterior | M vs M-1 | Periodo A = mes anterior al filtro HASTA; Periodo B = filtro HASTA |
| Trimestre anterior | Q vs Q-1 | Periodo A = mismo mes del trimestre anterior; Periodo B = filtro HASTA |
| Año anterior (YoY) | M vs M-12 | Periodo A = filtro HASTA - 12 meses; Periodo B = filtro HASTA |
| Vs cierre año | M vs Dic año anterior | Periodo A = diciembre del año anterior al filtro HASTA; Periodo B = filtro HASTA |
| Libre | Cualquier A y B | El usuario selecciona ambos meses manualmente |

Por defecto al entrar a la página: comparativa "Mes anterior" usando el filtro HASTA del sidebar.

---

## 2. Algoritmo de clasificación

### Paso 1: Calcular ARR por (account_name × product_type) para el mes

```python
def get_arr_by_account_bl(snapshot_id, month, product_type_filter=None, account_name_filter=None):
    """
    Devuelve un dict: {(account_name, product_type): arr_total}
    para el mes indicado dentro del snapshot.
    
    Un ARRLineItem cubre el mes M si start_month <= M <= end_month_normalized.
    La contribución mensual = daily_price * days_in_month(M)
    """
    query = (
        db.query(
            RawOpportunityLineItem.account_name,
            ARRLineItem.product_type,
            func.sum(
                ARRLineItem.daily_price * days_in_month(month)
            ).label("arr_total")
        )
        .join(ARRLineItem, ARRLineItem.raw_line_item_id == RawOpportunityLineItem.id)
        .filter(
            ARRLineItem.snapshot_id == snapshot_id,
            ARRLineItem.start_month <= month,
            ARRLineItem.end_month_normalized >= month,
            ARRLineItem.is_saas == True,
            ARRLineItem.excluded_from_arr == False,
        )
    )
    if product_type_filter:
        query = query.filter(ARRLineItem.product_type == product_type_filter)
    if account_name_filter:
        query = query.filter(RawOpportunityLineItem.account_name == account_name_filter)
    
    return {(row.account_name, row.product_type): row.arr_total for row in query.all()}
```

### Paso 2: Clasificar cada par (account × product_type)

```python
def classify_bridge(arr_a: dict, arr_b: dict) -> BridgeResult:
    all_keys = set(arr_a.keys()) | set(arr_b.keys())
    
    new_logo    = []
    churn       = []
    up_selling  = []
    down_selling = []
    unchanged   = []
    
    for key in all_keys:
        a = arr_a.get(key, Decimal(0))
        b = arr_b.get(key, Decimal(0))
        account, product_type = key
        
        item = BridgeItem(account=account, product_type=product_type, arr_a=a, arr_b=b, delta=b-a)
        
        if a == 0 and b > 0:
            new_logo.append(item)
        elif a > 0 and b == 0:
            churn.append(item)
        elif a > 0 and b > a:
            up_selling.append(item)
        elif a > 0 and b < a:
            down_selling.append(item)
        else:
            unchanged.append(item)  # a == b > 0, excluido del waterfall
    
    return BridgeResult(
        arr_a=sum(arr_a.values()),
        arr_b=sum(arr_b.values()),
        new_logo=new_logo,
        churn=churn,
        up_selling=up_selling,
        down_selling=down_selling,
        unchanged=unchanged,
    )
```

**Nota sobre la reconciliación numérica:**
`ARR_B = ARR_A + Σ(new_logo) - Σ(churn) + Σ(up_selling) - Σ(down_selling)`

Esta ecuación debe cumplirse exactamente. Los registros `unchanged` no afectan al waterfall.

---

## 3. Layout de la página

```
┌────────────────────────────────────────────────────────────────────────┐
│  Gagero — Análisis de Variaciones de ARR                               │
│  Entiende por qué cambió el ARR entre dos periodos                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  SELECTOR DE PERIODOS                                                  │
│  [ Mes anterior ] [ Trim. anterior ] [ Año anterior ] [ Vs. cierre ]  │
│                                                                        │
│  Periodo A: [Selector mes ▾] Abril 2026    →    Periodo B: [Mayo 2026]│
│  (cuando se selecciona "Libre", ambos son editables)                   │
│                                                                        │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  WATERFALL BRIDGE                                                      │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │   ARR Abr   New Logo    Churn    Up Sell  Down Sell  ARR May   │   │
│  │   ┌────┐   ┌──────┐   ┌────┐   ┌──────┐  ┌──────┐  ┌────┐    │   │
│  │   │7.2M│   │+320K │   │-80K│   │+540K │  │-120K │  │7.9M│    │   │
│  │   └────┘   └──────┘   └────┘   └──────┘  └──────┘  └────┘    │   │
│  │                                                                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  TABLA RESUMEN                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Driver      │  Nº cuentas×BL  │  ARR total  │  % sobre ARR_A   │ │
│  ├─────────────┼─────────────────┼─────────────┼───────────────────┤ │
│  │ New Logo    │       12        │  +320.000 € │     +4,4%         │ │
│  │ Churn       │        3        │   -80.000 € │     -1,1%         │ │
│  │ Up Selling  │       24        │  +540.000 € │     +7,5%         │ │
│  │ Down Selling│        8        │  -120.000 € │     -1,7%         │ │
│  │ Net change  │       —         │  +660.000 € │     +9,2%         │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  DETALLE POR DRIVER                                                    │
│  [ New Logo ▾ ]  [ Churn ]  [ Up Selling ]  [ Down Selling ]          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Cliente             │ Línea de Negocio │  ARR A  │  ARR B │  Δ  │ │
│  ├─────────────────────┼──────────────────┼─────────┼────────┼─────┤ │
│  │ Empresa Nueva S.A.  │ SaaS LMS         │    —    │ 48.000 │  +  │ │
│  │ Startup XYZ         │ SaaS Skills      │    —    │ 36.000 │  +  │ │
│  │ ...                 │ ...              │   ...   │    ... │ ... │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  [↓ Exportar Gagero  (Excel)]                                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend

### Nuevo archivo: `app/backend/api/routes/gagero.py`

#### Endpoint: `GET /api/gagero/bridge`

**Query params:**
```
snapshot_id:   UUID   (opcional, default = snapshot más reciente)
month_a:       date   (requerido, YYYY-MM-DD primer día del mes)
month_b:       date   (requerido, YYYY-MM-DD primer día del mes)
product_type:  str    (opcional, filtro sidebar)
account_name:  str    (opcional, filtro sidebar)
```

**Response body:**
```python
class BridgeItem(BaseModel):
    account_name: str
    product_type: str
    arr_a: Decimal
    arr_b: Decimal
    delta: Decimal

class BridgeCategory(BaseModel):
    total_delta: Decimal
    count: int
    items: List[BridgeItem]

class BridgeResponse(BaseModel):
    snapshot_id: UUID
    month_a: date
    month_b: date
    arr_a: Decimal
    arr_b: Decimal
    net_change: Decimal
    net_change_pct: float
    new_logo: BridgeCategory
    churn: BridgeCategory
    up_selling: BridgeCategory
    down_selling: BridgeCategory
    unchanged_count: int    # número de pares account×BL sin variación (informativo)
```

Los items dentro de cada categoría vienen ordenados por `abs(delta)` descendente (los más significativos primero).

---

### Extensión del endpoint de exportación Excel

En el archivo de exportación existente (probablemente `app/backend/api/routes/exports.py`), añadir soporte para una pestaña "Gagero".

**Cambio en la firma del endpoint:**
```python
# Añadir params opcionales al endpoint existente GET /api/exports/snapshot
gagero_month_a: Optional[date] = None
gagero_month_b: Optional[date] = None
```

**Si `gagero_month_a` y `gagero_month_b` están presentes**, añadir una hoja "Gagero" al Excel con las siguientes columnas:

| Columna | Descripción |
|---------|-------------|
| driver | New Logo / Churn / Up Selling / Down Selling |
| cliente | account_name |
| linea_negocio | product_type |
| arr_periodo_a | ARR en month_a (0 si no existía) |
| arr_periodo_b | ARR en month_b (0 si no existía) |
| delta | arr_periodo_b - arr_periodo_a |
| periodo_a | Texto legible del mes A (ej. "Abril 2026") |
| periodo_b | Texto legible del mes B (ej. "Mayo 2026") |

Las filas `unchanged` no se incluyen en el export de Gagero.

El orden de filas en el export: New Logo primero, luego Churn, Up Selling, Down Selling. Dentro de cada driver, orden por `abs(delta)` descendente.

---

### Registro en el router

Añadir en `app/backend/main.py`:
```python
from app.backend.api.routes import gagero
app.include_router(gagero.router, prefix="/api/gagero", tags=["gagero"])
```

---

## 5. Frontend

### Nuevo archivo: `app/frontend/app/gagero/page.tsx`

#### Estado del componente

```typescript
type ComparisonMode = "mom" | "qoq" | "yoy" | "vs_year_close" | "free"

const { monthTo, productType, accountName } = useAnalysisFilters()

const [mode, setMode] = useState<ComparisonMode>("mom")
const [monthA, setMonthA] = useState<string>(() => prevMonth(monthTo))
const [monthB, setMonthB] = useState<string>(monthTo)
const [activeCategory, setActiveCategory] = useState<keyof BridgeCategories>("new_logo")

const bridge = useQuery({
  queryKey: ["gagero-bridge", snapshotId, monthA, monthB, productType, accountName],
  queryFn: () => api.gagero.bridge({ month_a: monthA, month_b: monthB, product_type: productType, account_name: accountName }),
  enabled: !!(monthA && monthB),
})
```

#### Lógica de los botones de periodo

```typescript
function applyMode(mode: ComparisonMode, monthTo: string) {
  switch (mode) {
    case "mom":           return { a: subMonths(monthTo, 1), b: monthTo }
    case "qoq":           return { a: subMonths(monthTo, 3), b: monthTo }
    case "yoy":           return { a: subMonths(monthTo, 12), b: monthTo }
    case "vs_year_close": return { a: lastDecemberOf(monthTo), b: monthTo }
    case "free":          return null  // el usuario controla a y b directamente
  }
}
```

#### Componente: Waterfall Bridge (`GageroWaterfall.tsx`)

- Recharts `<BarChart>` con datos estructurados para representar el waterfall:
  - Las barras de ARR_A y ARR_B son barras absolutas (altura = valor total)
  - Las barras de New Logo (+), Churn (-), Up Selling (+), Down Selling (-) son barras flotantes (usando `<Bar dataKey="start" fill="transparent">` + `<Bar dataKey="delta">`)
- Colores:
  - New Logo: `#22c55e` (verde)
  - Churn: `#ef4444` (rojo)
  - Up Selling: `#6d35ff` (primario isEazy)
  - Down Selling: `#f97316` (naranja)
  - ARR_A y ARR_B: `#2f185f` (oscuro isEazy)
- Tooltip: al pasar por cada barra, mostrar nombre del driver, delta total, número de cuentas×BL afectadas.

#### Componente: Tabla resumen (`GageroSummaryTable.tsx`)

5 filas fijas (4 drivers + Net change). Celdas de Delta coloreadas según positivo/negativo.

#### Componente: Tabla de detalle (`GageroDetailTable.tsx`)

- Tabs o botones para cambiar de categoría: New Logo | Churn | Up Selling | Down Selling
- Columnas: Cliente · Línea de Negocio · ARR Periodo A · ARR Periodo B · Delta
- Ordenada por `abs(delta)` descendente
- Las celdas de ARR_A muestran "—" cuando el valor es 0 (para New Logo)
- Las celdas de ARR_B muestran "—" cuando el valor es 0 (para Churn)

#### Llamadas API — añadir en `app/frontend/lib/api.ts`

```typescript
gagero: {
  bridge: (params: {
    snapshot_id?: string
    month_a: string
    month_b: string
    product_type?: string
    account_name?: string
  }) =>
    client
      .get<BridgeResponse>("/gagero/bridge", { params })
      .then(r => r.data),
}
```

#### Tipos — añadir en `app/frontend/lib/types.ts`

```typescript
export interface BridgeItem {
  account_name: string
  product_type: string
  arr_a: number
  arr_b: number
  delta: number
}

export interface BridgeCategory {
  total_delta: number
  count: number
  items: BridgeItem[]
}

export interface BridgeResponse {
  snapshot_id: string
  month_a: string
  month_b: string
  arr_a: number
  arr_b: number
  net_change: number
  net_change_pct: number
  new_logo: BridgeCategory
  churn: BridgeCategory
  up_selling: BridgeCategory
  down_selling: BridgeCategory
  unchanged_count: number
}
```

#### Botón de exportación

Junto al selector de periodos, un botón "↓ Exportar Gagero (Excel)" que llama al endpoint de exportación existente pasando `gagero_month_a` y `gagero_month_b`. El export descarga el fichero Excel completo con la pestaña Gagero añadida.

#### Entrada en el sidebar

```tsx
{ href: "/gagero", label: "Gagero", icon: TrendingUp }
```

---

## 6. Reglas de negocio y casos especiales

### Stripe (Author Online)
Los datos de Stripe se almacenan en `SnapshotStripeMRR` y no tienen `(account_name, product_type)` individuales — son un total mensual. **Excluir Stripe del análisis Gagero.** El waterfall opera exclusivamente sobre los datos de Salesforce (ARRLineItem con `is_saas=True`). Añadir nota en la UI: "Excluye Author Online (Stripe)".

### Meses con datos incompletos
Si el Periodo B es el mes en curso (datos no cerrados), el waterfall puede mostrar variaciones parciales. No bloquear la funcionalidad, pero añadir aviso: "El periodo B ({mes}) puede no estar cerrado todavía".

### Threshold de "ARR cero"
Una cuenta×BL se considera "ausente" cuando `arr == 0` (no cuando `arr < umbral`). No hay umbral mínimo.

### Filtro de Línea de Negocio del sidebar
Cuando el filtro `product_type` está activo, el análisis Gagero solo muestra las combinaciones account×BL que pertenecen a ese product_type. El waterfall sigue siendo coherente dentro de ese subconjunto.

---

## 7. Consideraciones de rendimiento

La query de Gagero es una agregación sobre `ARRLineItem JOIN RawOpportunityLineItem` para dos meses. En snapshots grandes (~14k filas), dos agregaciones + clasificación son manejables en memoria Python (<1 segundo esperado). No se requiere caching adicional.

Índices necesarios (mismos que en la Fase 1):
```sql
CREATE INDEX IF NOT EXISTS idx_arr_line_items_snapshot_month 
  ON arr_line_items(snapshot_id, start_month, end_month_normalized);
```

---

## 8. Criterios de aceptación

- [ ] La página `/gagero` aparece en el sidebar como "Gagero" con icono `TrendingUp`
- [ ] Por defecto al entrar, el modo es "Mes anterior" y los periodos se derivan del filtro HASTA del sidebar
- [ ] Los cuatro botones de comparativa predefinida calculan correctamente los periodos A y B
- [ ] El modo "Libre" permite al usuario seleccionar cualquier par de meses
- [ ] El waterfall bridge suma correctamente: ARR_A + new_logo - churn + up_selling - down_selling = ARR_B
- [ ] Mapfre con LMS y Skills aparece como dos filas independientes (una por product_type)
- [ ] Si Mapfre churnea en Skills y crece en LMS, aparece en "Churn" (Skills) y en "Up Selling" (LMS) simultáneamente
- [ ] El gráfico de waterfall tiene colores diferenciados por driver
- [ ] La tabla detalle cambia de categoría al hacer clic en los tabs sin recargar datos
- [ ] Los filtros del sidebar (Línea de Negocio, Cliente) aplican al análisis
- [ ] El botón "Exportar Gagero (Excel)" descarga el fichero con la pestaña "Gagero" añadida
- [ ] La pestaña Gagero del Excel contiene las 8 columnas especificadas, ordenadas por driver y delta
- [ ] La nota "Excluye Author Online (Stripe)" es visible en la UI
- [ ] Si no hay datos para alguno de los meses seleccionados, se muestra error explicativo en lugar de pantalla rota
- [ ] El porcentaje de cambio neto (`net_change_pct`) se calcula sobre `arr_a` correctamente
