# V3-P5 â€” Tabla de clientes corregida

**Estado:** Pendiente  
**Tipo:** Mejora funcional  
**Orden de implementaciÃ³n:** 5

---

## Problemas

### Problema 1 â€” Columna TOTAL suma los meses (incorrecto)

El ARR es una mÃ©trica puntual, no acumulable. Sumar los valores de todos los meses no tiene sentido: si un cliente tiene 100 Kâ‚¬/mes durante 6 meses, su ARR no es 600 Kâ‚¬.

**CorrecciÃ³n:** La columna TOTAL se renombra a **ARR ACTUAL** y muestra el valor del **Ãºltimo mes del periodo seleccionado** en negrita.

### Problema 2 â€” Columna Î” solo muestra valor absoluto

La variaciÃ³n entre el primer y el Ãºltimo mes del periodo deberÃ­a mostrarse tanto en valor absoluto como en porcentaje.

**CorrecciÃ³n:** La columna Î” muestra dos lÃ­neas:
- LÃ­nea 1: valor absoluto (ej. `+9.882 â‚¬`)
- LÃ­nea 2: porcentaje de cambio (ej. `+7,7%`)

### Problema 3 â€” NaN en la columna Î”

Cuando el primer mes del periodo tiene valor 0 o no existe, el cÃ¡lculo del porcentaje produce NaN.

**CorrecciÃ³n:** Si el valor del primer mes es 0 o null, mostrar `â€”` en el porcentaje (no intentar dividir por cero).

---

## Archivo afectado

`app/frontend/components/ClientARRTable.tsx`

---

## Spec de implementaciÃ³n

### Columna ARR ACTUAL (antes TOTAL)

```typescript
// Obtener el valor del Ãºltimo mes del periodo
const lastMonthValue = monthColumns[monthColumns.length - 1];
const arrActual = row[lastMonthValue] ?? 0;

// Renderizar en negrita
<td><strong>{formatEUR(arrActual)}</strong></td>
```

### Columna Î” (mejorada)

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
    {pctChange !== null ? formatPct(pctChange) : 'â€”'}
  </span>
</td>
```

---

## Criterio de aceptaciÃ³n

- La columna "TOTAL" desaparece; aparece "ARR ACTUAL" con el valor del Ãºltimo mes en negrita.
- La columna Î” muestra valor absoluto en la primera lÃ­nea y porcentaje en la segunda.
- No aparece `NaN` en ninguna celda de la tabla, ni siquiera con datos incompletos.
- La funciÃ³n de exportaciÃ³n CSV sigue funcionando (adaptar la cabecera de la columna).

