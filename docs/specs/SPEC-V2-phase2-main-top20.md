# SPEC-V2 Fase 2 — Top 20 Clientes en Gráficos del Dashboard Principal

**Fase:** 2 de 4  
**Prioridad:** Alta  
**Dependencias:** P1 (endpoint `GET /api/arr/by-account` debe existir)  
**Páginas afectadas:** `/` (dashboard principal, `app/frontend/app/page.tsx`)  
**Componentes afectados:** `ARRYearBarsChart.tsx`, `ARRChart.tsx`

---

## 1. Descripción funcional

En el dashboard principal (`page.tsx`) se añade una nueva sección de gráficos que muestra la distribución de ARR entre los **top 20 clientes** de cada mes. Esta sección es adicional a los gráficos existentes de producto — no los reemplaza.

### Dos nuevos gráficos en el dashboard principal

#### Gráfico A: Barras por cliente (equivalente al `ARRYearBarsChart` existente)
- Tipo: barras verticales agrupadas por mes
- Cada barra es el ARR total del mes, dividida en capas de color:
  - Una capa por cada cliente del top 20 (mismos colores en todos los meses)
  - Una capa "Otros" en gris claro `#e5e7eb` para el resto de clientes
- El gráfico muestra los meses del rango seleccionado (igual que los gráficos de producto)

#### Gráfico B: Líneas por cliente (equivalente al `ARRChart` existente de líneas)
- Tipo: líneas, una por cliente del top 20
- Línea adicional "Otros" en gris con estilo punteado (`strokeDasharray="4 2"`)
- Tooltip muestra todos los clientes activos en ese mes

---

## 2. Posición en el layout del dashboard

Los nuevos gráficos se insertan **debajo** de los gráficos existentes de producto, en la misma columna izquierda del grid principal.

Orden de secciones en `page.tsx` tras el cambio:
1. Hero header (sin cambios)
2. Cards de KPI (sin cambios)
3. FilterBar (sin cambios)
4. ARR Total Chart (sin cambios)
5. ARR Year Bars Chart — por producto (sin cambios)
6. ARR Breakdown Chart — líneas por producto (sin cambios)
7. ARR Breakdown Table (sin cambios)
8. **[NUEVO] Separador de sección: "Distribución por Cliente"**
9. **[NUEVO] Gráfico A: Barras top 20 clientes**
10. **[NUEVO] Gráfico B: Líneas top 20 clientes**

---

## 3. Datos necesarios

Los nuevos gráficos consumen el mismo endpoint de P1: `GET /api/arr/by-account`.

En `page.tsx` se añade una nueva query de React Query:

```typescript
const { data: accountData, isLoading: accountLoading } = useQuery({
  queryKey: [
    "arr-by-account",
    snapshotId,
    monthFrom,
    monthTo,
    mode,
    // Sin filtro de product_types — muestra todos los clientes en total
  ],
  queryFn: () => api.getARRByAccount({
    snapshot_id: snapshotId,
    month_from: monthFrom,
    month_to: monthTo,
    mode,
    limit: 20,
  }),
  enabled: !!snapshotId,
});
```

Esta query es independiente de la query `arr-summary` existente. Ambas pueden ir en paralelo.

---

## 4. Nuevos componentes

```
app/frontend/components/
├── TopAccountsBarsChart.tsx    ← Gráfico A (barras apiladas por cliente)
└── TopAccountsLinesChart.tsx   ← Gráfico B (líneas por cliente)
```

### `TopAccountsBarsChart.tsx`

```typescript
// Props
interface TopAccountsBarsChartProps {
  data: ARRByAccountResponse | undefined;
  isLoading: boolean;
}

// Estructura Recharts
<ResponsiveContainer width="100%" height={350}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="month" tickFormatter={formatMonth} />
    <YAxis tickFormatter={formatEUR} />
    <Tooltip content={<CustomAccountTooltip />} />
    <Legend />
    {/* Una <Bar> por cada cliente del top 20 */}
    {accounts.map((account, i) => (
      <Bar
        key={account.account_name}
        dataKey={account.account_name}
        stackId="a"
        fill={ACCOUNT_COLORS[i]}
      />
    ))}
    {/* Barra "Otros" siempre al final */}
    <Bar dataKey="Otros" stackId="a" fill="#e5e7eb" />
  </BarChart>
</ResponsiveContainer>
```

**Transformación de datos para Recharts:**
```typescript
// Convertir ARRByAccountResponse a formato que Recharts acepta
const chartData = data.months.map(month => {
  const point: Record<string, number | string> = { month };
  data.accounts.forEach(acc => {
    point[acc.account_name] = acc.by_month[month] ?? 0;
  });
  point["Otros"] = data.others.by_month[month] ?? 0;
  return point;
});
```

### `TopAccountsLinesChart.tsx`

```typescript
// Misma lógica de transformación de datos
// Recharts LineChart en lugar de BarChart
// Una <Line> por cliente, strokeWidth={2}
// <Line> para "Otros" con strokeDasharray="4 2" y color gris
```

---

## 5. Paleta de colores para clientes

Definir en `app/frontend/lib/constants.ts`:

```typescript
export const ACCOUNT_COLORS = [
  "#6d35ff", // isEazy primary purple
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a855f7", // purple lighter
  "#eab308", // yellow
  "#22c55e", // green
  "#0ea5e9", // sky
  "#f43f5e", // rose
  "#64748b", // slate
  "#78716c", // stone
  "#6b7280", // gray (near end for less prominent)
  "#9ca3af", // gray lighter
  // "Otros" usa siempre #e5e7eb — no está en este array
];
```

Los colores se asignan por posición de ranking: el cliente con más ARR siempre tiene el color `#6d35ff` (primario de la marca), el segundo `#f59e0b`, etc. Esta asignación es estable dentro de un rango de fechas pero puede variar entre distintas consultas (es correcto — el ranking puede cambiar).

---

## 6. Sección de separación visual

Entre los gráficos de producto existentes y la nueva sección de clientes, añadir:

```tsx
<div className="mt-10 mb-4">
  <h2 className="text-xl font-semibold text-gray-800">Distribución por cliente</h2>
  <p className="text-sm text-gray-500 mt-1">
    Top 20 cuentas por ARR. El resto se agrupa en "Otros".
  </p>
</div>
```

---

## 7. Criterios de aceptación

- [ ] Al cargar el dashboard, los dos nuevos gráficos aparecen debajo de los existentes
- [ ] La suma de todas las capas de un mes en el gráfico A coincide con el ARR total de ese mes en los gráficos de producto existentes
- [ ] El cliente con más ARR siempre está en la primera capa (color primario morado)
- [ ] La capa "Otros" siempre aparece en último lugar, en gris
- [ ] El tooltip del gráfico A muestra el desglose de los 20 clientes + Otros con su ARR y % del total
- [ ] Cambiar el filtro de periodo en el FilterBar existente actualiza también los gráficos de clientes
- [ ] El modo `from_start` / `from_close` del header afecta también a estos gráficos
- [ ] Los nuevos gráficos tienen el mismo estilo visual (bordes redondeados, sombra suave) que los existentes
- [ ] Los gráficos tienen un estado de carga (`skeleton` o spinner) mientras se obtienen los datos
