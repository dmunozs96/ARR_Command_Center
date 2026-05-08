# V3-P2 — Limpieza de NaN global

**Estado:** Pendiente  
**Tipo:** Bug crítico  
**Orden de implementación:** 2

---

## Problema

`NaN €` aparece en múltiples puntos de la interfaz:

| Localización | Contexto |
|---|---|
| **ARR por país** | Widget de geografía — Spain, Mexico, Brazil muestran `NaN €` |
| **Tabla de clientes** | Columna delta (Δ) cuando algún mes no tiene dato |
| **ARR AGREGADO (consultores)** | Fila de totales en la tabla de consultores |
| **Tabla de clientes — columna TOTAL** | Algunos clientes muestran `NaN €` en el total |

---

## Causa raíz esperada

Tres orígenes posibles (pueden coexistir):

1. **División por cero:** `(nuevo - viejo) / viejo * 100` cuando `viejo === 0`.
2. **`parseFloat` de string vacío o `undefined`:** el API devuelve `null` o la clave no existe y el frontend intenta operar sobre ese valor.
3. **`undefined + number`:** cuando un mes no tiene dato en el array y se opera directamente.

---

## Archivos a auditar

```
app/frontend/components/TopAccountsLinesChart.tsx   — ARR por país / líneas
app/frontend/components/ClientARRTable.tsx           — tabla clientes
app/frontend/app/consultants/page.tsx                — tabla consultores + ARR AGREGADO
app/frontend/lib/utils.ts                            — formatEUR() y helpers de cálculo
```

---

## Spec de corrección

### 1. Formatter defensivo en `utils.ts`

```typescript
// Antes
export function formatEUR(value: number): string {
  return value.toLocaleString('es-ES') + ' €';
}

// Después
export function formatEUR(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return value.toLocaleString('es-ES') + ' €';
}
```

Aplicar el mismo patrón a `formatPct()` y cualquier formatter de porcentaje.

### 2. Guard en cálculos de delta / porcentaje

```typescript
// Patrón correcto para cualquier cálculo de variación
function calcDeltaPct(prev: number | null, curr: number | null): number | null {
  if (!prev || !curr) return null;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}
```

Devolver `null` (no `0`) cuando no se puede calcular, para que el formatter muestre `—`.

### 3. ARR por país

- Auditar el endpoint que devuelve datos geográficos (probablemente `/api/arr/summary` con agrupación por país).
- Si el problema es en backend: verificar que los campos `country` en `ConsultantCountry` no estén vacíos para los consultores de Spain, Mexico y Brazil.
- Si el problema es en frontend: el componente que suma ARR por país debe filtrar valores `null`/`undefined` antes de operar.

### 4. ARR AGREGADO en consultores

- Localizar la fila de totales en `app/frontend/app/consultants/page.tsx`.
- La suma total debe acumular solo valores numéricos válidos: `arr.filter(Number.isFinite).reduce(...)`.

---

## Criterio de aceptación

Ningún elemento de la UI muestra la cadena `NaN` o `undefined`. Los valores no calculables muestran `—`.

---

## Tests a ejecutar tras el fix

```bash
cd app/frontend && npx tsc --noEmit
```

Verificación visual: cargar cada sección afectada con un snapshot que tenga datos reales.
