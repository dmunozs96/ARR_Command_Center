# SPEC-V5 Fase 1 — Committed vs Real

**Fase:** 1 de 1  
**Página nueva:** `/committed-vs-real`  
**Entrada sidebar:** "Committed vs Real" con icono `GitCompare` (lucide-react)  
**Dependencias:** `useAnalysisFilters`, `useSnapshotContext`, `ARRModeContext` (lectura únicamente)

---

## 1. Contexto y motivación

El sistema ya soporta dos modos de cálculo de ARR:

| Modo | Campo fuente | Semántica |
|------|-------------|-----------|
| `from_start` | `subscription_start_date` | **Real ARR** — ARR del servicio ya en marcha |
| `from_close` | `close_date` | **Committed ARR** — ARR firmado, independientemente de si el servicio ha empezado |

El gap entre ambos representa el **ARR en tránsito**: contratos firmados y en cartera, pero cuyo servicio aún no ha comenzado. Este gap tiene dos lecturas posibles:

- **Señal positiva:** el gap crece porque ventas está cerrando bien y hay un backlog sano de implementaciones por arrancar.
- **Señal de riesgo:** el gap crece porque los contratos no se están implementando a tiempo, lo que genera riesgo de churn temprano.

Este módulo no solo muestra el gap: permite diagnosticar cuál de las dos dinámicas está ocurriendo y alerta sobre los contratos concretos que llevan más tiempo esperando.

---

## 2. Definición formal del delta

### Delta de un mes M

```
delta_M = Σ annualized_value  para todos los ARRLineItem donde:
  - close_month <= M          (el contrato está firmado antes de o en el mes M)
  - start_month  >  M         (el servicio no ha arrancado todavía en el mes M)
  - excluded_from_arr = false (sin flags de calidad que lo excluyan)
  - is_saas = true            (solo líneas SaaS, coherente con el resto de módulos)
```

Donde:
- `close_month` = primer día del mes de `close_date` del `RawOpportunityLineItem` asociado
- `start_month` = primer día del mes de `effective_start_date` del `ARRLineItem`

### Interpretación

- Un `delta_M > 0` siempre implica contratos firmados pendientes de iniciar.
- La suma de `delta_M` a lo largo del tiempo no debe confundirse con ARR incremental: el mismo contrato puede aparecer en varios meses consecutivos si sigue sin arrancar.
- Cuando `start_month` llega, ese contrato "sale" del delta y "entra" en el Real ARR.

---

## 3. Estructura del módulo

El módulo tiene **tres bloques verticales** en una sola página, más un header de KPIs:

```
┌─────────────────────────────────────────────────────┐
│  KPI HEADER  (3 tarjetas)                           │
├─────────────────────────────────────────────────────┤
│  BLOQUE 1 — Tendencia del Delta (gráfico mensual)   │
├─────────────────────────────────────────────────────┤
│  BLOQUE 2 — Radiografía del Mes (drill-down tabla)  │
├─────────────────────────────────────────────────────┤
│  BLOQUE 3 — Alertas de Implantación (ranking)       │
└─────────────────────────────────────────────────────┘
```

---

## 4. KPI Header

Tres tarjetas. Los valores se calculan para el **mes más reciente** del rango seleccionado.

| Tarjeta | Valor | Detalle |
|---------|-------|---------|
| **Delta actual** | `delta_M` en € (formato compacto) | "ARR firmado pendiente de activar" |
| **Contratos en tránsito** | Número de line items en el delta del mes actual | "contratos firmados sin iniciar" |
| **Tiempo medio de espera** | Media ponderada por ARR de `days_since_close` para todos los ítems en tránsito actualmente | "días entre firma e inicio (media pond.)" |

La media ponderada del tiempo de espera se calcula así:
```
tiempo_medio = Σ(days_since_close_i × arr_i) / Σ(arr_i)
               para todos los ítems donde start_month > hoy
```

---

## 5. Bloque 1 — Tendencia del Delta

### Descripción visual

Gráfico de barras apiladas. Cada barra representa un mes. Cada segmento de color es una línea de negocio.

- **Eje X:** meses del rango `monthFrom` → `monthTo`
- **Eje Y:** delta en € (formato compacto)
- **Colores:** usar `PRODUCT_TYPE_COLORS` de `constants.ts` (mismo esquema de colores que el resto de la app)
- **Tooltip:** al pasar el cursor sobre una barra, mostrar:
  - Mes (ej. "mar. 2026")
  - Total delta en €
  - Desglose por línea de negocio (BL → €)
  - Número de contratos en tránsito ese mes

### Línea de referencia

Superponer una línea discontinua gris que muestre el **Real ARR total** del mismo mes (escala secundaria, eje Y derecho). Esto contextualiza el tamaño del delta respecto al negocio total: si el delta es el 5% del Real ARR es una cosa; si es el 30% es otra.

### Lectura de tendencias

Añadir debajo del gráfico, en texto pequeño gris, una nota automática:
- Si la tendencia de los últimos 3 meses es ascendente: "El gap lleva 3 meses creciendo."
- Si es descendente: "El gap lleva 3 meses reduciéndose."
- Si es estable (variación < 10%): "El gap se mantiene estable."

Esta lógica es simple: comparar `delta[M]` vs `delta[M-1]` vs `delta[M-2]`.

### Respeto al filtro de BL

Si `product_type` está activo en el sidebar, mostrar solo la barra de esa BL (no apilada). Si no hay filtro, mostrar todas las BLs apiladas.

---

## 6. Bloque 2 — Radiografía del Mes

### Descripción funcional

El usuario selecciona un mes concreto y ve la tabla detallada de todos los contratos que componen el delta de ese mes.

### Selector de mes

- Dropdown de selección de mes, inicializado al mes más reciente del rango.
- Lista los meses disponibles en el rango `monthFrom` → `monthTo`.
- Formato: "mar. 2026".

### Tabla de contratos en tránsito

Columnas (ordenables):

| Columna | Fuente | Formato |
|---------|--------|---------|
| Cliente | `account_name` | Texto |
| Línea de negocio | `product_type` | Badge con color de BL |
| ARR | `annualized_value` | `formatEUR` |
| Fecha de cierre | `close_date` | "15 nov. 2025" |
| Fecha de inicio prevista | `subscription_start_date` | "01 ene. 2026" o "—" si no consta |
| Días esperando | `(today - close_date).days` | Número entero + " días" |
| Oportunidad | `opportunity_name` | Texto pequeño, color gris |

Ordenación por defecto: días esperando, descendente.

Filtrado:
- Si el filtro global de `product_type` está activo, la tabla ya viene pre-filtrada.
- Si el filtro global de `account_name` está activo, la tabla también lo aplica.

### Nota de pie

Texto gris bajo la tabla:
> "Muestra contratos con `close_date` anterior o igual a {mes seleccionado} cuyo servicio aún no ha comenzado en {mes seleccionado}."

---

## 7. Bloque 3 — Alertas de Implantación

### Descripción funcional

Listado de los contratos actualmente en tránsito (pendientes de iniciar hoy) que más tiempo llevan esperando **en relación al comportamiento histórico de su propia línea de negocio**.

La comparación es siempre intra-BL: un contrato de SaaS LMS se compara contra otros SaaS LMS. Un contrato de SaaS Skills se compara contra otros SaaS Skills. Un LMS que lleva 200 días puede ser perfectamente normal; un Skills que lleva 30 días puede ser una alerta.

### Metodología estadística

#### 1. Distribución de referencia por BL

Para cada `product_type`, construir la distribución histórica de `days_to_start`:

```
distribucion_BL = [
  (subscription_start_date - close_date).days
  para todos los ARRLineItem del snapshot donde:
    - close_date IS NOT NULL
    - subscription_start_date IS NOT NULL
    - subscription_start_date > close_date   (hubo un gap real)
    - subscription_start_date <= hoy          (el servicio ya arrancó — dato completo)
    - used_start_fallback = false             (fecha de inicio real, no inferida)
    - excluded_from_arr = false
    - is_saas = true
]
```

Calcular:
- `mediana_BL`: percentil 50
- `p75_BL`: percentil 75
- `p90_BL`: percentil 90
- `muestra_BL`: número de registros en la distribución

#### 2. Contratos pendientes (el conjunto a alertar)

```
pendientes = todos los ARRLineItem del snapshot donde:
  - close_date IS NOT NULL
  - start_month > hoy                         (servicio no iniciado)
  - excluded_from_arr = false
  - is_saas = true
```

Para cada contrato pendiente calcular:
```
days_since_close = (hoy - close_date).days
```

#### 3. Cálculo del percentil

Para cada contrato pendiente de BL `B`:

```
percentil_rango = count(distribucion_B donde days_to_start <= days_since_close)
                 / len(distribucion_B) × 100
```

El percentil indica: "el X% de los contratos históricos de esta BL se implementaron más rápido que este contrato ya lleva esperando."

Un contrato en el percentil 95 es más urgente que uno en el percentil 60, aunque en días absolutos el segundo lleve más tiempo.

#### 4. Fiabilidad estadística

Si `muestra_BL < 10`, la distribución no es fiable. En ese caso:
- `is_statistically_reliable = false`
- Mostrar el contrato igualmente, pero indicar que el ranking es por días absolutos (sin percentil)
- Añadir label "Muestra insuficiente (N={muestra_BL})" en la celda de percentil

#### 5. Ranking final

Ordenar todos los contratos pendientes por `percentil_rango` descendente (los más anómalos primero). Los de BL con muestra insuficiente se ordenan al final, por `days_since_close` descendente.

Mostrar los primeros 15. Si hay menos de 15 en total, mostrar todos.

### Tabla de alertas

Columnas:

| Columna | Fuente | Formato |
|---------|--------|---------|
| Cliente | `account_name` | Texto |
| Oportunidad | `opportunity_name` | Texto pequeño gris |
| Línea de negocio | `product_type` | Badge con color de BL |
| ARR | `annualized_value` | `formatEUR` |
| Fecha de cierre | `close_date` | "15 nov. 2025" |
| Días esperando | `days_since_close` | Número + " días" |
| Mediana BL | `mediana_BL` | "X días (mediana)" |
| Percentil | `percentil_rango` | Barra de progreso + número |

### Codificación de color del percentil

| Rango | Color | Semántica |
|-------|-------|-----------|
| 0 – 50 | Verde (`#22c55e`) | Normal para su BL |
| 51 – 75 | Amarillo (`#f59e0b`) | Ligeramente por encima de lo habitual |
| 76 – 90 | Naranja (`#f97316`) | Anómalo, merece atención |
| 91 – 100 | Rojo (`#ef4444`) | Crítico — muy por encima de la norma histórica de su BL |

Si `is_statistically_reliable = false`, usar gris (`#9ca3af`) para toda la fila de percentil y mostrar "— días abs." en lugar de barra de progreso.

### Nota contextual

Encima de la tabla, texto informativo:
> "Los contratos se comparan contra el comportamiento histórico de su propia línea de negocio. Un contrato al percentil 90 lleva más tiempo sin implementarse que el 90% de los contratos históricos de su BL."

---

## 8. Backend — Endpoints nuevos

### Archivo de rutas: `app/backend/api/routes/delta.py`

Router prefix: `/api/delta`

---

### 8.1 GET `/api/delta/monthly-trend`

Devuelve el delta mensual (committed - real) desglosado por BL para el rango seleccionado.

**Query params:**

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `snapshot_id` | UUID | Sí | ID del snapshot activo |
| `month_from` | date | Sí | Primer mes del rango (YYYY-MM-01) |
| `month_to` | date | Sí | Último mes del rango (YYYY-MM-01) |
| `product_type` | string | No | Filtrar a una sola BL |

**Lógica de cálculo:**

Para cada mes M en el rango:
1. Obtener todos los `ARRLineItem` del snapshot donde `is_saas = true` y `excluded_from_arr = false`.
2. Para `committed_arr_M`: sumar `annualized_value` de ítems donde `close_month <= M <= end_month_normalized`.
3. Para `real_arr_M`: sumar `annualized_value` de ítems donde `start_month <= M <= end_month_normalized`.
4. Para `delta_items_M`: ítems donde `close_month <= M` AND `start_month > M`.
5. `delta_M = Σ annualized_value` de `delta_items_M`.
6. Agrupar `delta_M` por `product_type`.

**Response schema (Pydantic):**

```python
class DeltaMonthPoint(BaseModel):
    month: date
    committed_arr: Decimal
    real_arr: Decimal
    delta_total: Decimal
    contracts_in_transit: int
    delta_by_product_type: dict[str, Decimal]  # product_type -> delta €

class DeltaMonthlyTrendResponse(BaseModel):
    months: list[DeltaMonthPoint]
    trend_note: str  # "ascendente" | "descendente" | "estable"
```

**Cálculo de `trend_note`:**
```
Comparar delta_total de los últimos 3 meses disponibles.
Si todos crecen (M > M-1 > M-2): "ascendente"
Si todos decrecen: "descendente"
Si la variación máxima entre cualquier par es < 10%: "estable"
Resto: "mixta"
```

---

### 8.2 GET `/api/delta/month-breakdown`

Devuelve el listado de contratos individuales que componen el delta de un mes concreto.

**Query params:**

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `snapshot_id` | UUID | Sí | ID del snapshot activo |
| `month` | date | Sí | Mes a desglosar (YYYY-MM-01) |
| `product_type` | string | No | Filtrar a una sola BL |
| `account_name` | string | No | Filtrar a una sola cuenta |

**Lógica:**

Retornar todos los `ARRLineItem` del snapshot donde:
- `close_month <= month`
- `start_month > month`
- `excluded_from_arr = false`
- `is_saas = true`
- Si `product_type` → filtrar
- Si `account_name` → filtrar por `RawOpportunityLineItem.account_name`

**Response schema:**

```python
class DeltaContractItem(BaseModel):
    opportunity_name: str
    account_name: str
    product_type: str
    arr_value: Decimal
    close_date: date
    subscription_start_date: date | None
    days_since_close: int           # (hoy - close_date).days

class DeltaMonthBreakdownResponse(BaseModel):
    month: date
    total_delta: Decimal
    contracts: list[DeltaContractItem]
```

---

### 8.3 GET `/api/delta/implementation-alerts`

Devuelve los contratos actualmente en tránsito ordenados por anomalía estadística dentro de su BL.

**Query params:**

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `snapshot_id` | UUID | Sí | ID del snapshot activo |
| `product_type` | string | No | Filtrar a una sola BL |
| `limit` | int | No | Top N a devolver. Default: 15 |

**Lógica:**

1. **Construir distribuciones históricas por BL** (ver sección 7, metodología estadística).
2. **Identificar contratos pendientes**: `start_month > hoy`, `excluded_from_arr = false`, `is_saas = true`.
3. **Calcular percentil** para cada contrato pendiente respecto a su BL.
4. **Ordenar**: fiables por percentil desc, no-fiables al final por días desc.
5. **Devolver los primeros `limit`**.

**Response schema:**

```python
class BLDistributionStats(BaseModel):
    product_type: str
    median_days: float
    p75_days: float
    p90_days: float
    sample_size: int
    is_reliable: bool               # sample_size >= 10

class ImplementationAlertItem(BaseModel):
    opportunity_name: str
    account_name: str
    product_type: str
    arr_value: Decimal
    close_date: date
    subscription_start_date: date | None
    days_since_close: int
    percentile_rank: float | None   # None si la BL no es fiable
    bl_median_days: float
    bl_p90_days: float
    is_statistically_reliable: bool

class ImplementationAlertsResponse(BaseModel):
    alerts: list[ImplementationAlertItem]
    bl_distributions: dict[str, BLDistributionStats]
    total_contracts_in_transit: int
    as_of_date: date                # hoy
```

---

## 9. Frontend — Arquitectura de componentes

### Archivos a crear

```
app/frontend/
├── app/
│   └── committed-vs-real/
│       └── page.tsx                          # Página principal
├── components/
│   ├── CommittedVsRealKPIs.tsx               # Header de 3 tarjetas
│   ├── DeltaTrendChart.tsx                   # Bloque 1: gráfico barras apiladas
│   ├── DeltaMonthBreakdown.tsx               # Bloque 2: selector de mes + tabla
│   └── ImplementationAlertsTable.tsx         # Bloque 3: tabla de alertas
```

### Archivo de rutas API: `app/frontend/lib/api.ts`

Añadir tres funciones:

```typescript
export async function fetchDeltaMonthlyTrend(params: {
  snapshotId: string;
  monthFrom: string;
  monthTo: string;
  productType?: string;
}): Promise<DeltaMonthlyTrendResponse>

export async function fetchDeltaMonthBreakdown(params: {
  snapshotId: string;
  month: string;
  productType?: string;
  accountName?: string;
}): Promise<DeltaMonthBreakdownResponse>

export async function fetchImplementationAlerts(params: {
  snapshotId: string;
  productType?: string;
  limit?: number;
}): Promise<ImplementationAlertsResponse>
```

### Tipos TypeScript: `app/frontend/lib/types.ts`

Añadir interfaces correspondientes a los response schemas del backend (espejo de los Pydantic models).

---

## 10. Frontend — Layout detallado

### `app/committed-vs-real/page.tsx`

```
"use client"

Estructura:
- Título de página: "Committed vs Real"
- Subtítulo: "ARR firmado pendiente de activar"
- <CommittedVsRealKPIs />
- <DeltaTrendChart />
- <DeltaMonthBreakdown />
- <ImplementationAlertsTable />
```

Usar `useAnalysisFilters()` y `useSnapshotContext()` para pasar `snapshotId`, `monthFrom`, `monthTo`, `productType` a todos los componentes.

### `CommittedVsRealKPIs.tsx`

Tres tarjetas en fila (grid 3 columnas):

1. **Delta actual**
   - Valor principal: `formatCompactEUR(delta_mes_actual)`
   - Subtítulo: "ARR firmado pendiente de activar"
   - Flecha vs mes anterior (si crece → naranja ↑, si baja → verde ↓)

2. **Contratos en tránsito**
   - Valor principal: `contracts_in_transit` (número entero)
   - Subtítulo: "contratos firmados sin iniciar"

3. **Tiempo medio de espera**
   - Valor principal: `Math.round(tiempo_medio)` + " días"
   - Subtítulo: "media ponderada por ARR"

Estilo: mismo diseño que las KPI cards de Churn (fondo blanco, borde gris claro, padding 24px, título en gris, valor en negro bold).

### `DeltaTrendChart.tsx`

Props:
- `months: DeltaMonthPoint[]`
- `trendNote: string`
- `productType?: string`

Usar `BarChart` de Recharts con `stackId="delta"` en cada `<Bar>` por BL.

Añadir una segunda `<YAxis>` (yAxisId="real") y un `<Line>` con `yAxisId="real"` para el Real ARR. La línea debe ser discontinua (`strokeDasharray="4 4"`), color gris (`#9ca3af`), sin puntos.

Título de sección: "Tendencia del Gap Committed vs Real"

Bajo el gráfico, `<p className="text-xs text-gray-400 mt-2">` con el texto de `trendNote`:
- `"ascendente"` → "El gap lleva creciendo en los últimos 3 meses. Puede indicar aceleración comercial o retraso en implementaciones."
- `"descendente"` → "El gap se está reduciendo. Las implementaciones avanzan más rápido que los nuevos cierres."
- `"estable"` → "El gap se mantiene estable. El ritmo de cierres y el de implementaciones están equilibrados."
- `"mixta"` → "El gap muestra variaciones sin tendencia clara."

### `DeltaMonthBreakdown.tsx`

Props:
- `availableMonths: string[]` (del rango monthFrom→monthTo)
- `snapshotId: string`
- `productType?: string`
- `accountName?: string`

Estado interno: `selectedMonth: string` (inicializado al último mes disponible).

Selector de mes: `<select>` estilizado con Tailwind.

Debajo del selector: tabla con las columnas definidas en la sección 6.

La tabla debe ser ordenable por clic en cabecera (mismo patrón que las tablas existentes en la app).

Título de sección: "Radiografía del Mes"

Nota de pie bajo la tabla (texto `text-xs text-gray-400`):
> "Contratos con fecha de cierre anterior o igual a {mes} cuyo servicio no había comenzado en ese mes."

### `ImplementationAlertsTable.tsx`

Props:
- `alerts: ImplementationAlertItem[]`
- `blDistributions: Record<string, BLDistributionStats>`

Componente auxiliar `PercentileBar`:
```
Barra horizontal de progreso (width: 100%, height: 6px, rounded).
Fondo: gris claro (#e5e7eb).
Relleno: color según rango de percentil (ver tabla de colores en sección 7).
Encima de la barra: texto "{percentile_rank.toFixed(0)}th"
Si !is_statistically_reliable: solo texto "— (N={sample_size})" en gris, sin barra.
```

Título de sección: "Alertas de Implantación"

Nota introductoria sobre la tabla:
> "Contratos comparados contra el comportamiento histórico de su propia línea de negocio."

---

## 11. Sidebar

En `app/frontend/components/Sidebar.tsx` (o equivalente), añadir entrada:

```tsx
{ href: "/committed-vs-real", label: "Committed vs Real", icon: GitCompare }
```

Posición: después de la entrada "Base Instalada Predictiva" (cohort-retention).

---

## 12. Edge cases y consideraciones

### Contratos sin fecha de inicio

Algunos contratos tienen `used_start_fallback = true` (la fecha de inicio se infirió desde `close_date + 365`). Estos contratos **no deben aparecer en el delta** porque la fecha de inicio inferida es idéntica a la lógica del modo `from_start`. En la práctica, si `close_date = subscription_start_date` (fallback = fecha de cierre exacta), `start_month = close_month` y no cumplirán la condición `start_month > M` para el mes del cierre.

Sin embargo: si el fallback fue `close_date + algo`, puede que sí aparezcan. Revisar en la query que `used_start_fallback = false` para las distribuciones históricas (ya contemplado en sección 7). Para el delta en sí, incluirlos es correcto: si el start date fue inferido y es futuro, el servicio todavía no ha empezado.

### BLs con muestra histórica insuficiente (< 10 registros)

- Mostrar el contrato en la tabla de alertas.
- En la columna de percentil, mostrar "— (N={muestra})" en gris.
- Ordenarlos al final de la tabla, tras todos los contratos con estadística fiable.
- En el tooltip de esa celda (si el cursor pasa encima): "La muestra histórica de esta BL es insuficiente para calcular un percentil fiable."

### Delta negativo

Matemáticamente imposible según la definición (committed siempre >= real si los contratos siempre tienen close_date <= start_date). Sin embargo, si existen registros con `close_date > subscription_start_date` (error de datos de Salesforce), el delta puede ser ligeramente negativo para alguna BL. En ese caso:

- Mostrar el valor negativo tal cual (no truncar a cero).
- Añadir un flag de alerta de datos (`data_quality_flags`) para ese ítem: `CLOSE_AFTER_START`.
- No bloquear la renderización del gráfico.

### Snapshot sin datos de cierre

Si el snapshot no tiene `close_date` para ningún ítem (por ejemplo, importación manual incompleta), el delta será cero para todos los meses. Mostrar empty state en el gráfico:
> "No hay datos de fecha de cierre en este snapshot. El cálculo del delta requiere el campo `close_date` de Salesforce."

### Filtro de product_type activo

Cuando el sidebar tiene un `product_type` seleccionado:
- El gráfico de tendencia muestra solo esa BL (no apilado).
- La radiografía del mes pre-filtra por esa BL.
- Las alertas pre-filtran por esa BL.
- Los KPIs reflejan solo esa BL.

---

## 13. Tests recomendados

### Backend (pytest)

1. **Test delta calculation:** snapshot con 3 ítems: uno cerrado y empezado (no entra), uno cerrado y no empezado (entra), uno no cerrado (no entra). Verificar que `delta_M` == ARR del segundo ítem únicamente.

2. **Test percentile calculation:** distribución histórica conocida `[10, 20, 30, 40, 50]` días. Contrato pendiente con 35 días. Esperado: percentil = 60 (3 de 5 históricos <= 35).

3. **Test BL with insufficient sample:** BL con 5 históricos. Verificar `is_statistically_reliable = false` en response.

4. **Test trend note:** construir 3 meses ascendentes y verificar `trend_note = "ascendente"`.

### Frontend (Playwright / Jest)

1. Verificar que los 3 KPI cards renderizan valores no-nulos con snapshot real.
2. Verificar que cambiar el selector de mes en Bloque 2 recarga la tabla con datos del mes correcto.
3. Verificar que los contratos con `is_statistically_reliable = false` aparecen al final de la tabla de alertas.
4. Verificar que el filtro de BL del sidebar afecta los tres bloques simultáneamente.

---

## 14. Checklist de implementación

- [ ] Crear `app/backend/api/routes/delta.py` con los 3 endpoints
- [ ] Registrar el router en `app/backend/main.py` con prefix `/api/delta`
- [ ] Añadir schemas Pydantic en `app/backend/api/schemas.py`
- [ ] Añadir tipos TypeScript en `app/frontend/lib/types.ts`
- [ ] Añadir funciones de API en `app/frontend/lib/api.ts`
- [ ] Crear `app/frontend/app/committed-vs-real/page.tsx`
- [ ] Crear `CommittedVsRealKPIs.tsx`
- [ ] Crear `DeltaTrendChart.tsx`
- [ ] Crear `DeltaMonthBreakdown.tsx`
- [ ] Crear `ImplementationAlertsTable.tsx`
- [ ] Añadir entrada en Sidebar
- [ ] Smoke test manual: verificar que el delta es coherente con los valores que muestra el toggle from_close vs from_start en el dashboard principal
