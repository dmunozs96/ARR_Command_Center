# V3-P2 â€” Limpieza de NaN global

**Estado:** Pendiente  
**Tipo:** Bug crÃ­tico  
**Orden de implementaciÃ³n:** 2

---

## Problema

`NaN â‚¬` aparece en mÃºltiples puntos de la interfaz:

| LocalizaciÃ³n | Contexto |
|---|---|
| **ARR por paÃ­s** | Widget de geografÃ­a â€” Spain, Mexico, Brazil muestran `NaN â‚¬` |
| **Tabla de clientes** | Columna delta (Î”) cuando algÃºn mes no tiene dato |
| **ARR AGREGADO (consultores)** | Fila de totales en la tabla de consultores |
| **Tabla de clientes â€” columna TOTAL** | Algunos clientes muestran `NaN â‚¬` en el total |

---

## Causa raÃ­z esperada

Tres orÃ­genes posibles (pueden coexistir):

1. **DivisiÃ³n por cero:** `(nuevo - viejo) / viejo * 100` cuando `viejo === 0`.
2. **`parseFloat` de string vacÃ­o o `undefined`:** el API devuelve `null` o la clave no existe y el frontend intenta operar sobre ese valor.
3. **`undefined + number`:** cuando un mes no tiene dato en el array y se opera directamente.

---

## Archivos a auditar

```
app/frontend/components/TopAccountsLinesChart.tsx   â€” ARR por paÃ­s / lÃ­neas
app/frontend/components/ClientARRTable.tsx           â€” tabla clientes
app/frontend/app/consultants/page.tsx                â€” tabla consultores + ARR AGREGADO
app/frontend/lib/utils.ts                            â€” formatEUR() y helpers de cÃ¡lculo
```

---

## Spec de correcciÃ³n

### 1. Formatter defensivo en `utils.ts`

```typescript
// Antes
export function formatEUR(value: number): string {
  return value.toLocaleString('es-ES') + ' â‚¬';
}

// DespuÃ©s
export function formatEUR(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'â€”';
  return value.toLocaleString('es-ES') + ' â‚¬';
}
```

Aplicar el mismo patrÃ³n a `formatPct()` y cualquier formatter de porcentaje.

### 2. Guard en cÃ¡lculos de delta / porcentaje

```typescript
// PatrÃ³n correcto para cualquier cÃ¡lculo de variaciÃ³n
function calcDeltaPct(prev: number | null, curr: number | null): number | null {
  if (!prev || !curr) return null;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}
```

Devolver `null` (no `0`) cuando no se puede calcular, para que el formatter muestre `â€”`.

### 3. ARR por paÃ­s

- Auditar el endpoint que devuelve datos geogrÃ¡ficos (probablemente `/api/arr/summary` con agrupaciÃ³n por paÃ­s).
- Si el problema es en backend: verificar que los campos `country` en `ConsultantCountry` no estÃ©n vacÃ­os para los consultores de Spain, Mexico y Brazil.
- Si el problema es en frontend: el componente que suma ARR por paÃ­s debe filtrar valores `null`/`undefined` antes de operar.

### 4. ARR AGREGADO en consultores

- Localizar la fila de totales en `app/frontend/app/consultants/page.tsx`.
- La suma total debe acumular solo valores numÃ©ricos vÃ¡lidos: `arr.filter(Number.isFinite).reduce(...)`.

---

## Criterio de aceptaciÃ³n

NingÃºn elemento de la UI muestra la cadena `NaN` o `undefined`. Los valores no calculables muestran `â€”`.

---

## Tests a ejecutar tras el fix

```bash
cd app/frontend && npx tsc --noEmit
```

VerificaciÃ³n visual: cargar cada secciÃ³n afectada con un snapshot que tenga datos reales.

