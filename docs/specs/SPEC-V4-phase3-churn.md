# SPEC-V4 Fase 3 — Churn: Análisis Histórico y Ratios SaaS

**Fase:** 3 de 4  
**Página nueva:** `/churn`  
**Entrada sidebar:** "Churn" con icono `TrendingDown` (lucide-react)  
**Dependencias:** Reutiliza la lógica de clasificación de Gagero (V4-P2)

---

## 1. Descripción funcional

El módulo Churn convierte el cálculo de bajas que ya existe en Gagero en una **métrica de seguimiento continua** de la salud del negocio SaaS. El foco es LTM (últimos 12 meses) como ventana principal, con toggle a YTD (año en curso). La granularidad de análisis es siempre `(account_name × product_type)`, igual que en Gagero.

**No se usa facturación ni Planhardt.** El churn se deriva exclusivamente de los contratos de Salesforce: si una cuenta×BL tenía ARR > 0 al inicio del periodo y tiene ARR = 0 al final, es churn.

---

## 2. Definiciones de las métricas

### Ventanas temporales

| Botón | Periodo A (inicio cohort) | Periodo B (medición) |
|-------|--------------------------|---------------------|
| **LTM** | Mes M-12 (12 meses antes del filtro HASTA) | Mes M (filtro HASTA) |
| **YTD** | 1 de enero del año del filtro HASTA | Mes M (filtro HASTA) |

La lógica interna es idéntica para ambas ventanas; solo cambia el mes de inicio del cohort.

---

### Cohort de retención

Para una ventana que va de mes `A` a mes `B`:

```
cohort = todas las (account, product_type) con ARR > 0 en el mes A
```

Los new logos que aparecen entre A y B (no estaban en mes A) se **excluyen** de GRR y NRR. Son irrelevantes para medir retención de la base existente.

---

### GRR — Gross Revenue Retention

```
GRR = (ARR_cohort_inicio - Churn_€ - Down Selling_€) / ARR_cohort_inicio × 100
```

- `ARR_cohort_inicio`: suma del ARR del cohort en el mes A
- `Churn_€`: ARR de pares account×BL del cohort que tienen ARR = 0 en el mes B
- `Down Selling_€`: reducción de ARR de pares que siguen activos pero con menor ARR en B

GRR no puede superar 100% (el up selling de clientes existentes no lo mejora).

**Benchmark SaaS B2B:** GRR > 85% es saludable. GRR > 90% es excelente.

---

### NRR — Net Revenue Retention

```
NRR = (ARR_cohort_inicio - Churn_€ - Down Selling_€ + Up Selling_€) / ARR_cohort_inicio × 100
```

NRR puede superar 100% si la expansión del cohort supera las bajas (net expansion).

**Benchmark SaaS B2B:** NRR > 100% significa que la base crece sola. NRR > 110% es clase mundial.

---

### Logo Churn Rate

```
Logo Churn Rate = pares account×BL churneados / pares account×BL activos en mes A × 100
```

Complementa la visión monetaria: un cliente pequeño que churnea pesa poco en ARR pero puede ser síntoma de un problema de producto.

---

### Cálculo rolling

El gráfico de tendencia muestra, para cada mes M del histórico disponible, cuáles habrían sido GRR y NRR LTM calculados con M como punto de corte. Esto genera una curva continua que permite ver la evolución de la salud del negocio sin el ruido del intermensual.

---

## 3. Layout de la página

```
┌─────────────────────────────────────────────────────────────────────┐
│  Churn — Retención de Ingresos                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [ LTM ]  [ YTD ]                                                   │
│  Periodo: Junio 2025 → Mayo 2026                                    │
│                                                                     │
│  KPI CARDS                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │  NRR         │ │  GRR         │ │  Logo Churn  │ │  ARR      │  │
│  │  108,2 %     │ │  91,4 %      │ │  Rate 6,3 %  │ │  Churned  │  │
│  │  ▲ vs año ant│ │  ▲ vs año ant│ │  ▼ vs año ant│ │  -480K €  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘  │
│                                                                     │
│  EVOLUCIÓN ROLLING NRR / GRR                                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  115% ┤                                                       │  │
│  │  110% ┤  ─────────── NRR LTM ────────────────────────────    │  │
│  │  105% ┤                                                       │  │
│  │  100% ┤ · · · · · · · · · · · · · · · · · · · · · · · · ·    │  │
│  │   95% ┤  ─ ─ ─ ─ ─ ─ GRR LTM ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─      │  │
│  │   90% ┤                                                       │  │
│  │       └───────────────────────────────────────────────────── │  │
│  │        Jun 24  Sep 24  Dic 24  Mar 25  May 25  May 26        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  CHURN POR LÍNEA DE NEGOCIO (ARR €)                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Barras apiladas: ARR churneado por mes, coloreado por BL    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  DETALLE DE CLIENTES CHURNEADOS                                     │
│  Periodo: Jun 2025 – May 2026                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Cliente       │ Línea de Negocio │ Mes de baja │ ARR perdido │   │
│  ├───────────────┼──────────────────┼─────────────┼─────────────┤   │
│  │ Empresa XYZ   │ SaaS Skills      │ Nov 2025    │  -36.000 €  │   │
│  │ ...           │ ...              │ ...         │  ...        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend

### Nuevo archivo: `app/backend/api/routes/churn.py`

#### Endpoint 1: `GET /api/churn/ratios`

Devuelve NRR, GRR y Logo Churn Rate para una ventana temporal.

**Query params:**
```
snapshot_id:   UUID   (opcional, default = último snapshot)
month_b:       date   (requerido, punto de corte — filtro HASTA del sidebar)
window:        str    (enum: "ltm" | "ytd", default = "ltm")
product_type:  str    (opcional)
account_name:  str    (opcional)
```

**Lógica interna:**

```python
def compute_month_a(month_b, window):
    if window == "ltm":
        return month_b - relativedelta(months=12)
    if window == "ytd":
        return date(month_b.year, 1, 1)

def compute_retention_ratios(snapshot_id, month_a, month_b, filters):
    arr_a = get_arr_by_account_bl(snapshot_id, month_a, **filters)
    arr_b = get_arr_by_account_bl(snapshot_id, month_b, **filters)

    cohort = {k: v for k, v in arr_a.items() if v > 0}
    arr_cohort_start = sum(cohort.values())

    churn_eur = sum(cohort[k] for k in cohort if arr_b.get(k, 0) == 0)
    down_eur  = sum(cohort[k] - arr_b[k] for k in cohort
                   if 0 < arr_b.get(k, 0) < cohort[k])
    up_eur    = sum(arr_b[k] - cohort[k] for k in cohort
                   if arr_b.get(k, 0) > cohort[k])

    grr = (arr_cohort_start - churn_eur - down_eur) / arr_cohort_start * 100
    nrr = (arr_cohort_start - churn_eur - down_eur + up_eur) / arr_cohort_start * 100
    churned_logos = sum(1 for k in cohort if arr_b.get(k, 0) == 0)
    logo_churn_rate = churned_logos / len(cohort) * 100

    return RatiosResponse(
        grr=grr, nrr=nrr,
        logo_churn_rate=logo_churn_rate,
        churned_arr=churn_eur,
        arr_cohort_start=arr_cohort_start,
        churned_logos=churned_logos,
        total_logos=len(cohort),
        ...
    )
```

**Response body:**
```python
class ChurnRatiosResponse(BaseModel):
    window: Literal["ltm", "ytd"]
    month_a: date
    month_b: date
    nrr: float                    # porcentaje, puede superar 100
    grr: float                    # porcentaje, máximo 100
    logo_churn_rate: float        # porcentaje
    churned_arr: Decimal          # € perdido (positivo)
    arr_cohort_start: Decimal     # ARR del cohort en mes A
    churned_logos: int
    total_logos: int
    # Componentes del bridge (para tooltip/detalle)
    churn_eur: Decimal
    down_selling_eur: Decimal
    up_selling_eur: Decimal
```

---

#### Endpoint 2: `GET /api/churn/rolling`

Devuelve la curva rolling de NRR y GRR para el gráfico de evolución.

**Query params:**
```
snapshot_id:   UUID   (opcional)
month_to:      date   (último punto de la curva, filtro HASTA)
window:        str    (enum: "ltm" | "ytd", default = "ltm")
product_type:  str    (opcional)
account_name:  str    (opcional)
```

**Lógica:** para cada mes M desde el más antiguo con datos suficientes hasta `month_to`, calcular `compute_retention_ratios(month_a(M, window), M)`. Devolver la serie de puntos.

**Response body:**
```python
class RollingPoint(BaseModel):
    month: date
    nrr: float
    grr: float
    churned_arr: Decimal
    churned_logos: int

class ChurnRollingResponse(BaseModel):
    data: List[RollingPoint]
    window: Literal["ltm", "ytd"]
```

**Nota de rendimiento:** este endpoint puede ser costoso (N meses × 2 queries). Usar `ARRMonthlySummary` para precalcular totales y solo ir a `ARRLineItem JOIN RawOpportunityLineItem` cuando haya filtros de `account_name`. Considerar cache en memoria (TTL 5 min) si los tiempos superan 3 segundos.

---

#### Endpoint 3: `GET /api/churn/churned-accounts`

Lista de cuentas×BL que churnearon en el periodo.

**Query params:** mismos que `/ratios`.

**Response body:**
```python
class ChurnedAccount(BaseModel):
    account_name: str
    product_type: str
    churn_month: date       # primer mes con ARR = 0 tras periodo de actividad
    arr_lost: Decimal       # ARR del mes A (lo que valía antes de irse)

class ChurnedAccountsResponse(BaseModel):
    items: List[ChurnedAccount]
    total_arr_lost: Decimal
    count: int
```

---

#### Endpoint 4: `GET /api/churn/by-product-type`

ARR churneado por mes y product_type, para el gráfico de barras apiladas.

**Query params:** `snapshot_id`, `month_from`, `month_to`, `product_type` (opcional).

Devuelve una serie mensual con el ARR churneado desglosado por product_type en cada mes.

---

### Registro en el router

```python
from app.backend.api.routes import churn
app.include_router(churn.router, prefix="/api/churn", tags=["churn"])
```

---

## 5. Frontend

### Nuevo archivo: `app/frontend/app/churn/page.tsx`

#### Estado del componente

```typescript
const { monthTo, productType, accountName } = useAnalysisFilters()
const [window, setWindow] = useState<"ltm" | "ytd">("ltm")

const ratios  = useQuery(["churn-ratios",  snapshotId, monthTo, window, productType, accountName], ...)
const rolling = useQuery(["churn-rolling", snapshotId, monthTo, window, productType, accountName], ...)
const churned = useQuery(["churn-accounts",snapshotId, monthTo, window, productType, accountName], ...)
const byBl    = useQuery(["churn-by-bl",   snapshotId, monthTo, productType, accountName], ...)
```

#### Toggle LTM / YTD

Dos botones estilo tab. Al cambiar, todas las queries se refrescan automáticamente (el `window` está en el queryKey).

Muestra el periodo activo: `"Jun 2025 → May 2026"` (LTM) o `"Ene 2026 → May 2026"` (YTD).

#### KPI Cards

Cuatro cards en fila:
- **NRR**: valor % con color (verde si > 100%, amarillo si 90-100%, rojo si < 90%). Delta vs mismo periodo año anterior (si hay datos).
- **GRR**: valor % con color (verde si > 90%, amarillo si 80-90%, rojo si < 80%). Delta vs año anterior.
- **Logo Churn Rate**: valor %. Delta vs año anterior. Flecha inversamente: flecha arriba = malo.
- **ARR Churneado**: valor en € (negativo, en rojo). Comparativa vs año anterior.

#### Gráfico rolling NRR/GRR (`ChurnRollingChart.tsx`)

- Recharts `<LineChart>` con dos `<Line>`: NRR (color `#6d35ff` sólido) y GRR (color `#9ca3af` discontinuo)
- `<ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4">` — línea de 100%
- Tooltip: mes, NRR, GRR, ARR churneado ese mes, logos churneados
- Eje Y: 75% → 120% (con margen visual)

#### Gráfico barras apiladas por BL (`ChurnByBLChart.tsx`)

- Recharts `<BarChart>` apilado, un `<Bar>` por product_type activo
- Colores consistentes con el resto de la app (`PRODUCT_TYPE_COLORS`)
- Muestra los últimos 12 o 24 meses (los que tienen datos)
- Tooltip: mes, desglose por BL, total churneado

#### Tabla de cuentas churneadas

Columnas: Cliente · Línea de Negocio · Mes de baja · ARR perdido.
Ordenada por ARR perdido descendente.
Fila de totales al final.

#### Entrada en el sidebar

```tsx
{ href: "/churn", label: "Churn", icon: TrendingDown }
```

---

## 6. Criterios de aceptación

- [ ] La página `/churn` aparece en el sidebar como "Churn" con icono `TrendingDown`
- [ ] Los botones LTM / YTD cambian todos los datos simultáneamente y muestran el periodo activo
- [ ] NRR se muestra en verde si > 100%, amarillo si 90–100%, rojo si < 90%
- [ ] GRR se muestra en verde si > 90%, amarillo si 80–90%, rojo si < 80%
- [ ] La ecuación `NRR - GRR = Up Selling / ARR_cohort_start` se cumple numéricamente
- [ ] El gráfico rolling muestra una línea suavizada sin el ruido del intermensual
- [ ] La línea de referencia al 100% es visible en el gráfico rolling
- [ ] Los filtros del sidebar (Línea de Negocio, Cliente) aplican a todos los cálculos
- [ ] La tabla de churned accounts está ordenada por ARR perdido descendente
- [ ] La nota "Excluye Author Online (Stripe)" es visible
- [ ] Si no hay datos suficientes para calcular LTM (snapshot con menos de 13 meses), mostrar aviso claro
