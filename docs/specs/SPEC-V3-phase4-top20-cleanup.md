# V3-P4 — Top 20 sin "Otros"

**Estado:** Pendiente  
**Tipo:** Mejora visual  
**Orden de implementación:** 4

---

## Problema

El segmento "Otros" (resto de clientes fuera del Top 20) aparece en el gráfico de barras apiladas y en el de líneas, añadiendo tanto ruido visual que el gráfico resulta ilegible. El usuario prefiere perder precisión a cambio de claridad.

---

## Alcance

| Componente | Cambio |
|---|---|
| `TopAccountsBarsChart.tsx` | No renderizar el segmento "Otros" |
| `TopAccountsLinesChart.tsx` | No renderizar la línea "Otros" |

---

## Spec

### Filtrado

Antes de construir los datos para Recharts, filtrar cualquier entrada cuyo `account_name` sea `"Otros"`, `"Otros clientes"` o variantes similares (usar comparación case-insensitive y trim).

```typescript
const TOP_ACCOUNTS_EXCLUDE = /^otros/i;

const filteredData = accounts.filter(
  a => !TOP_ACCOUNTS_EXCLUDE.test(a.account_name.trim())
);
```

### Total mostrado

El eje Y y cualquier referencia a "total" en estos gráficos reflejan **solo la suma de los Top 20**, no el ARR total de la empresa. Añadir una nota bajo el título de cada gráfico:

> *Top 20 cuentas por ARR. El resto se omite para mayor claridad.*

Esta nota ya existe en `TopAccountsBarsChart` según el código actual; verificar que sea precisa y aplicar lo mismo a `TopAccountsLinesChart`.

### Sin cambios en backend

El endpoint `/api/arr/by-account` puede seguir devolviendo "Otros" — el filtro es exclusivamente en frontend. No modificar la lógica de backend.

---

## Criterio de aceptación

- Ningún segmento ni línea etiquetada "Otros" aparece en los dos gráficos.
- La leyenda de los gráficos no incluye "Otros".
- La nota descriptiva bajo cada gráfico es precisa.
- El comportamiento del gráfico de líneas (hover, tooltip, zoom) no se ve afectado.
