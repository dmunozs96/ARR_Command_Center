# V3-P5 — Tabla de clientes corregida

**Estado:** Pendiente  
**Tipo:** Mejora funcional  
**Orden de implementación:** 5

---

## Problemas

### Problema 1 — Columna TOTAL suma los meses (incorrecto)

El ARR es una métrica puntual, no acumulable. Sumar los valores de todos los meses no tiene sentido: si un cliente tiene 100 K€/mes durante 6 meses, su ARR no es 600 K€.

**Corrección:** La columna TOTAL se renombra a **ARR ACTUAL** y muestra el valor del **último mes del periodo seleccionado** en negrita.

### Problema 2 — Columna Δ solo muestra valor absoluto

La variación entre el primer y el último mes del periodo debería mostrarse tanto en valor absoluto como en porcentaje.

**Corrección:** La columna Δ muestra dos líneas:
- Línea 1: valor absoluto (ej. `+9.882 €`)
- Línea 2: porcentaje de cambio (ej. `+7,7%`)

### Problema 3 — NaN en la columna Δ

Cuando el primer mes del periodo tiene valor 0 o no existe, el cálculo del porcentaje produce NaN.

**Corrección:** Si el valor del primer mes es 0 o null, mostrar `—` en el porcentaje (no intentar dividir por cero).

---

## Archivo afectado

`app/frontend/components/ClientARRTable.tsx`

---

## Spec de implementación

### Columna ARR ACTUAL (antes TOTAL)

```typescript
// Obtener el valor del último mes del periodo
const lastMonthValue = monthColumns[monthColumns.length - 1];
const arrActual = row[lastMonthValue] ?? 0;

// Renderizar en negrita
<td><strong>{formatEUR(arrActual)}</strong></td>
```

### Columna Δ (mejorada)

```typescript
const firstValue = row[monthColumns[0]] ?? null;
const lastValue  = row[monthColumns[monthColumns.length - 1]] ?? null;

const absChange = (firstValue !== null && lastValue !== null)
  ? lastValue - firstValue
  : null;

const pctChange = (firstValue && firstValue !== 0 && absChange !== null)
  ? (absChange / firstValue) * 100
  : null;

// Renderizar
<td>
  <span className={absChange > 0 ? 'text-green-600' : 'text-red-600'}>
    {formatEUR(absChange)}
  </span>
  <br />
  <span className="text-xs text-gray-500">
    {pctChange !== null ? formatPct(pctChange) : '—'}
  </span>
</td>
```

---

## Criterio de aceptación

- La columna "TOTAL" desaparece; aparece "ARR ACTUAL" con el valor del último mes en negrita.
- La columna Δ muestra valor absoluto en la primera línea y porcentaje en la segunda.
- No aparece `NaN` en ninguna celda de la tabla, ni siquiera con datos incompletos.
- La función de exportación CSV sigue funcionando (adaptar la cabecera de la columna).
