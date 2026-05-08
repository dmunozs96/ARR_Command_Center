# V3-P1 â€” CorrecciÃ³n matemÃ¡tica BL grouping

**Estado:** Pendiente  
**Tipo:** Bug crÃ­tico  
**Orden de implementaciÃ³n:** 1 (primero de V3)

---

## Problema

Las combinaciones "Author (Total)" (= SaaS Author + Author Online) y "LMS & AIO" (= SaaS LMS + SaaS AIO) producen sumas incorrectas en los grÃ¡ficos y en la tabla de desglose. El error es especialmente visible en los primeros meses de la serie, donde uno de los dos componentes todavÃ­a no tiene datos y la suma devuelve un valor incorrecto o simplemente no aparece.

---

## Causa raÃ­z esperada

La lÃ³gica de agrupaciÃ³n en `bl-grouping-context.tsx` y en `utils.ts` suma arrays de meses directamente por Ã­ndice (o concatena sin join), en lugar de hacer un **join explÃ­cito por clave de mes** antes de sumar. Si los dos arrays no tienen exactamente los mismos meses en el mismo orden, el resultado es incorrecto.

---

## Archivos a auditar

- `app/frontend/lib/bl-grouping-context.tsx` â€” lÃ³gica de agrupaciÃ³n
- `app/frontend/lib/utils.ts` â€” helpers de agrupaciÃ³n (buscar funciones que sumen series)
- `app/frontend/components/ARRChart.tsx` â€” donde se consumen los datos agrupados
- `app/frontend/components/ARRBreakdownTable.tsx` â€” tabla de desglose

---

## Spec de correcciÃ³n

1. Identificar la funciÃ³n que suma dos series de puntos de ARR para construir un grupo.
2. Reescribir esa funciÃ³n usando un **join por clave de mes** (`YYYY-MM`):
   - Construir un `Map<string, number>` para cada serie.
   - Iterar sobre la uniÃ³n de todas las claves de mes presentes en cualquiera de las dos series.
   - Sumar los valores correspondientes, usando `0` cuando una serie no tenga dato para ese mes.
3. La funciÃ³n resultante debe devolver un array ordenado cronolÃ³gicamente.
4. Aplicar la misma correcciÃ³n a ambos grupos: `BL_GROUP_AUTHOR` y `BL_GROUP_LMS_AIO`.

### Criterio de aceptaciÃ³n

Para cada mes del periodo completo:
- `Author (Total)[mes] === SaaS Author[mes] + Author Online[mes]`
- `LMS & AIO[mes] === SaaS LMS[mes] + SaaS AIO[mes]`

Donde el valor de un componente es `0` si no existe dato para ese mes (no `undefined` ni `NaN`).

---

## Tests a ejecutar tras el fix

```bash
# TypeScript
cd app/frontend && npx tsc --noEmit

# Visual: cargar el dashboard con un snapshot real y verificar que
# la suma de las lÃ­neas individuales == la lÃ­nea agrupada para todos los meses
```

---

## Notas para el agente

- No cambiar la interfaz pÃºblica de `BLGroupingContext` â€” solo corregir la lÃ³gica interna de suma.
- Si la funciÃ³n de suma es inline dentro de un componente, extraerla a `utils.ts` para que sea testeable.

