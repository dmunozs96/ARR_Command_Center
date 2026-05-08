# V3-P4 â€” Top 20 sin "Otros"

**Estado:** Pendiente  
**Tipo:** Mejora visual  
**Orden de implementaciÃ³n:** 4

---

## Problema

El segmento "Otros" (resto de clientes fuera del Top 20) aparece en el grÃ¡fico de barras apiladas y en el de lÃ­neas, aÃ±adiendo tanto ruido visual que el grÃ¡fico resulta ilegible. El usuario prefiere perder precisiÃ³n a cambio de claridad.

---

## Alcance

| Componente | Cambio |
|---|---|
| `TopAccountsBarsChart.tsx` | No renderizar el segmento "Otros" |
| `TopAccountsLinesChart.tsx` | No renderizar la lÃ­nea "Otros" |

---

## Spec

### Filtrado

Antes de construir los datos para Recharts, filtrar cualquier entrada cuyo `account_name` sea `"Otros"`, `"Otros clientes"` o variantes similares (usar comparaciÃ³n case-insensitive y trim).

```typescript
const TOP_ACCOUNTS_EXCLUDE = /^otros/i;

const filteredData = accounts.filter(
  a => !TOP_ACCOUNTS_EXCLUDE.test(a.account_name.trim())
);
```

### Total mostrado

El eje Y y cualquier referencia a "total" en estos grÃ¡ficos reflejan **solo la suma de los Top 20**, no el ARR total de la empresa. AÃ±adir una nota bajo el tÃ­tulo de cada grÃ¡fico:

> *Top 20 cuentas por ARR. El resto se omite para mayor claridad.*

Esta nota ya existe en `TopAccountsBarsChart` segÃºn el cÃ³digo actual; verificar que sea precisa y aplicar lo mismo a `TopAccountsLinesChart`.

### Sin cambios en backend

El endpoint `/api/arr/by-account` puede seguir devolviendo "Otros" â€” el filtro es exclusivamente en frontend. No modificar la lÃ³gica de backend.

---

## Criterio de aceptaciÃ³n

- NingÃºn segmento ni lÃ­nea etiquetada "Otros" aparece en los dos grÃ¡ficos.
- La leyenda de los grÃ¡ficos no incluye "Otros".
- La nota descriptiva bajo cada grÃ¡fico es precisa.
- El comportamiento del grÃ¡fico de lÃ­neas (hover, tooltip, zoom) no se ve afectado.

