# V3-P1 — Corrección matemática BL grouping

**Estado:** Pendiente  
**Tipo:** Bug crítico  
**Orden de implementación:** 1 (primero de V3)

---

## Problema

Las combinaciones "Author (Total)" (= SaaS Author + Author Online) y "LMS & AIO" (= SaaS LMS + SaaS AIO) producen sumas incorrectas en los gráficos y en la tabla de desglose. El error es especialmente visible en los primeros meses de la serie, donde uno de los dos componentes todavía no tiene datos y la suma devuelve un valor incorrecto o simplemente no aparece.

---

## Causa raíz esperada

La lógica de agrupación en `bl-grouping-context.tsx` y en `utils.ts` suma arrays de meses directamente por índice (o concatena sin join), en lugar de hacer un **join explícito por clave de mes** antes de sumar. Si los dos arrays no tienen exactamente los mismos meses en el mismo orden, el resultado es incorrecto.

---

## Archivos a auditar

- `app/frontend/lib/bl-grouping-context.tsx` — lógica de agrupación
- `app/frontend/lib/utils.ts` — helpers de agrupación (buscar funciones que sumen series)
- `app/frontend/components/ARRChart.tsx` — donde se consumen los datos agrupados
- `app/frontend/components/ARRBreakdownTable.tsx` — tabla de desglose

---

## Spec de corrección

1. Identificar la función que suma dos series de puntos de ARR para construir un grupo.
2. Reescribir esa función usando un **join por clave de mes** (`YYYY-MM`):
   - Construir un `Map<string, number>` para cada serie.
   - Iterar sobre la unión de todas las claves de mes presentes en cualquiera de las dos series.
   - Sumar los valores correspondientes, usando `0` cuando una serie no tenga dato para ese mes.
3. La función resultante debe devolver un array ordenado cronológicamente.
4. Aplicar la misma corrección a ambos grupos: `BL_GROUP_AUTHOR` y `BL_GROUP_LMS_AIO`.

### Criterio de aceptación

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
# la suma de las líneas individuales == la línea agrupada para todos los meses
```

---

## Notas para el agente

- No cambiar la interfaz pública de `BLGroupingContext` — solo corregir la lógica interna de suma.
- Si la función de suma es inline dentro de un componente, extraerla a `utils.ts` para que sea testeable.
