# SPEC-V2 Fase 1 — Análisis por Cliente y Línea de Negocio

**Fase:** 1 de 4  
**Prioridad:** Alta  
**Dependencias:** Ninguna (nueva funcionalidad independiente)  
**Página nueva:** `/clients`  
**Entrada sidebar:** "Clientes" con icono `Building2` (lucide-react)

---

## 1. Descripción funcional

El usuario accede a una nueva pestaña "Clientes" que le permite:

1. Filtrar por línea de negocio (una o todas)
2. Seleccionar un rango de periodos mensuales
3. Ver una tabla con los **top 20 clientes por ARR** de esa línea en esos periodos
4. Ver un gráfico que refleja exactamente los mismos datos que la tabla, en paralelo

### Comportamiento esperado de la tabla

- **Filas:** top 20 cuentas (`account_name`) ordenadas por ARR total del periodo seleccionado, descendente
- **Columnas:** una columna fija `Cliente`, luego una columna por cada mes seleccionado en el rango, luego una columna `Total` y una columna `Δ` (delta entre primer y último mes del rango)
- **Celda de valor:** ARR de ese cliente en ese mes, formateado en €
- **Celda vacía / cero:** mostrar `—` si el cliente no tenía ARR ese mes
- **Fila "Otros":** al final de la tabla, suma de todos los clientes fuera del top 20

### Comportamiento esperado del gráfico

- Tipo: barras apiladas horizontales o verticales (ver sección de UX)
- Eje X: meses del rango seleccionado
- Cada barra muestra el ARR total del mes, con capas de color por cliente (top 20)
- La capa "Otros" ocupa el resto en un color neutro (gris claro `#e5e7eb`)
- Tooltip al hover: muestra nombre del cliente y ARR de ese mes
- El gráfico y la tabla deben reflejar los mismos datos — si el usuario cambia un filtro, ambos se actualizan simultáneamente

---

## 2. Filtros disponibles

### Filtro 1: Línea de negocio
- Tipo: `<Select>` desplegable único
- Opciones:
  - "Todas las líneas" (valor: `all` — por defecto)
  - "SaaS LMS"
  - "SaaS AIO"
  - "SaaS Author"
  - "SaaS Engage"
  - "SaaS Skills"
  - "Author Online"
- Si la P3 (agrupación) está activada, las opciones se adaptan (ver SPEC-V2-phase3)

### Filtro 2: Rango de periodos
- Tipo: dos `<Select>` (mes inicio y mes fin) o un date range picker
- Opciones: meses disponibles en el snapshot activo
- Por defecto: últimos 6 meses disponibles
- Mínimo: 1 mes. Máximo: 24 meses (para no colapsar la tabla)

---

## 3. Contrato de API — Backend

### Nuevo endpoint: `GET /api/arr/by-account`

**Archivo:** `app/backend/api/routes/arr.py` (añadir al módulo existente)

**Parámetros de query:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `snapshot_id` | UUID | No | Defaults al snapshot más reciente |
| `month_from` | `YYYY-MM-DD` | No | Primer día del mes inicio |
| `month_to` | `YYYY-MM-DD` | No | Primer día del mes fin |
| `product_types` | `string` (CSV) | No | Ej: `"SaaS LMS,SaaS AIO"` — filtra por tipos de producto |
| `limit` | int | No | Default: 20, max: 100 |
| `mode` | `"from_start" \| "from_close"` | No | Default: `"from_start"` |

**Response schema (Pydantic):**

```python
# Añadir en app/backend/api/schemas.py

class AccountMonthPoint(BaseModel):
    month: date
    arr: Decimal

class AccountARR(BaseModel):
    rank: int
    account_name: str
    total_arr: Decimal           # suma de todos los meses del rango
    by_month: Dict[str, Decimal] # clave: "YYYY-MM-DD", valor: ARR
    first_month_arr: Decimal     # ARR del primer mes del rango
    last_month_arr: Decimal      # ARR del último mes del rango
    delta: Decimal               # last_month_arr - first_month_arr

class ARRByAccountResponse(BaseModel):
    snapshot_id: UUID
    months: List[date]           # lista ordenada de meses en el rango
    accounts: List[AccountARR]   # top N, ordenados por total_arr desc
    others: AccountARR           # suma del resto (rank=0, account_name="Otros")
    total_arr: Decimal           # suma de todos (top N + otros) para todos los meses
```

**Lógica de implementación:**

```python
# Pseudocódigo — app/backend/api/routes/arr.py

@router.get("/by-account", response_model=ARRByAccountResponse)
async def get_arr_by_account(
    snapshot_id: Optional[UUID] = None,
    month_from: Optional[date] = None,
    month_to: Optional[date] = None,
    product_types: Optional[str] = None,  # CSV
    limit: int = Query(default=20, ge=1, le=100),
    mode: str = Query(default="from_start"),
    db: AsyncSession = Depends(get_db),
):
    # 1. Resolver snapshot_id (usar el más reciente si no se pasa)
    # 2. Parsear product_types de CSV a lista
    # 3. Query a arr_line_items filtrando por snapshot, product_type, excluded_from_arr=False
    # 4. Para cada line_item activo en cada mes del rango:
    #    - Calcular contribución mensual (ya existe en ARRCalculator)
    #    - Agrupar por account_name + month
    # 5. Sumar por account_name → total_arr para ranking
    # 6. Ordenar por total_arr desc, tomar top `limit`
    # 7. Calcular "Otros" como suma del resto
    # 8. Construir response
```

**Nota importante sobre el cálculo:** Reutilizar la lógica ya existente en `arr_calculator.py` que distribuye ARR por mes. No duplicar lógica de cálculo.

---

## 4. Tipos TypeScript — Frontend

Añadir en `app/frontend/lib/types.ts`:

```typescript
export interface AccountARR {
  rank: number;
  account_name: string;
  total_arr: number;
  by_month: Record<string, number>;  // "YYYY-MM-DD" → ARR
  first_month_arr: number;
  last_month_arr: number;
  delta: number;
}

export interface ARRByAccountResponse {
  snapshot_id: string;
  months: string[];               // ["YYYY-MM-DD", ...]
  accounts: AccountARR[];
  others: AccountARR;
  total_arr: number;
}
```

Añadir en `app/frontend/lib/api.ts`:

```typescript
getARRByAccount: (params: {
  snapshot_id?: string;
  month_from?: string;
  month_to?: string;
  product_types?: string;
  limit?: number;
  mode?: "from_start" | "from_close";
}) =>
  client
    .get<ARRByAccountResponse>("/arr/by-account", { params })
    .then((r) => r.data),
```

---

## 5. Estructura de componentes — Frontend

```
app/frontend/app/clients/
└── page.tsx                      ← página principal

app/frontend/components/
├── ClientAnalysisFilters.tsx     ← filtros (BL + rango de fechas)
├── ClientARRTable.tsx            ← tabla top 20 clientes
└── ClientARRChart.tsx            ← gráfico de barras apiladas
```

### `page.tsx` — Clientes

```typescript
// Estructura lógica de la página

export default function ClientsPage() {
  // Estado local de filtros
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [monthFrom, setMonthFrom] = useState<string>();
  const [monthTo, setMonthTo] = useState<string>();

  // Query de datos
  const { data, isLoading, error } = useQuery({
    queryKey: ["arr-by-account", snapshotId, selectedProductTypes, monthFrom, monthTo],
    queryFn: () => api.getARRByAccount({
      snapshot_id: snapshotId,
      product_types: selectedProductTypes.join(","),
      month_from: monthFrom,
      month_to: monthTo,
    }),
  });

  return (
    <main>
      <PageHeader title="Análisis por Cliente" />
      <ClientAnalysisFilters
        selectedProductTypes={selectedProductTypes}
        onProductTypesChange={setSelectedProductTypes}
        monthFrom={monthFrom}
        monthTo={monthTo}
        onMonthRangeChange={...}
        availableMonths={availableMonths}
      />
      {/* Tabla y gráfico en grid de 2 columnas en pantallas grandes,
          apilados en móvil */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <ClientARRTable data={data} isLoading={isLoading} />
        <ClientARRChart data={data} isLoading={isLoading} />
      </div>
    </main>
  );
}
```

### `ClientARRTable.tsx`

- Usa la librería de tablas existente o `<table>` HTML nativa con Tailwind
- Encabezado sticky (fila de meses) si hay más de 6 columnas
- Columna `Cliente` fija a la izquierda (sticky) si hay más de 6 meses
- Celda de delta: verde si positivo, rojo si negativo, con flecha ↑↓
- Fila "Otros" con fondo ligeramente diferente (gris claro)
- Exportación a CSV (botón "Exportar" arriba a la derecha)

### `ClientARRChart.tsx`

- Recharts `<BarChart>` con `<Bar>` apiladas
- Una `<Bar>` por cliente del top 20, colores del array `CHART_COLORS` existente en la app
- Última `<Bar>` para "Otros" con color `#e5e7eb`
- `<Legend>` debajo del gráfico (lista de clientes)
- `<Tooltip>` personalizado mostrando: nombre cliente, ARR del mes, % del total ese mes
- Botón toggle para cambiar entre barras verticales y líneas (para los 20 clientes)

---

## 6. UX y diseño

- Seguir el mismo estilo visual que el dashboard: fondo blanco, sombras `shadow-sm`, bordes `rounded-2xl`
- Paleta de colores para los 20 clientes: usar los colores de `PRODUCT_TYPE_COLORS` ampliados con una paleta de 20 colores distintos
- El título de la página: "Análisis por Cliente" con subtítulo "Top 20 cuentas por ARR según línea de negocio y periodo"
- En mobile: solo mostrar la tabla (el gráfico se oculta con `hidden xl:block`)

---

## 7. Criterios de aceptación

- [ ] El endpoint `GET /api/arr/by-account` responde en < 2s con el snapshot de producción
- [ ] La tabla muestra exactamente 20 filas de clientes + 1 fila "Otros"
- [ ] Cambiando la línea de negocio, la tabla y el gráfico se actualizan simultáneamente
- [ ] El delta (Δ) es correcto: ARR último mes - ARR primer mes del rango
- [ ] La suma de todas las celdas de un mes coincide con el ARR total de ese producto en ese mes (igual que en el dashboard principal)
- [ ] Exportar CSV genera un fichero descargable con la misma estructura de la tabla
- [ ] La página es accesible desde el sidebar con el icono `Building2`
- [ ] El modo `from_start` / `from_close` es respetado (hereda el seleccionado en el dashboard)
