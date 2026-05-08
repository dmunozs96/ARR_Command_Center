# V3-P3 â€” MoM â†’ YTD comparativo

**Estado:** Pendiente  
**Tipo:** Mejora de mÃ©trica  
**Orden de implementaciÃ³n:** 3

---

## MotivaciÃ³n

MoM (mes contra mes anterior) tiene escasa utilidad gerencial porque amplifica la estacionalidad y no da contexto de tendencia anual. Lo relevante para el CFO es comparar el acumulado del aÃ±o en curso contra el mismo periodo del aÃ±o anterior: **YTD actual vs YTD anterior**.

---

## Alcance

Dos lugares en la UI muestran actualmente MoM y deben cambiarse:

| Componente | Cambio |
|---|---|
| `ARRBreakdownTable.tsx` â€” "Desglose por lÃ­nea" | Eliminar columnas MoM â‚¬ y MoM %; aÃ±adir YTD actual, YTD anterior y Î” YTD % |
| `app/frontend/app/consultants/page.tsx` â€” tabla de consultores | Misma sustituciÃ³n |
| `KPICards.tsx` â€” KPI de variaciÃ³n | Label y valor pasan de MoM a YTD vs YTD anterior |

---

## DefiniciÃ³n de YTD

```
YTD actual    = suma de ARR desde enero del aÃ±o en curso hasta el mes seleccionado (inclusive)
YTD anterior  = suma de ARR desde enero del aÃ±o anterior hasta el mismo mes del aÃ±o anterior
Î” YTD %       = (YTD actual - YTD anterior) / YTD anterior Ã— 100
```

Ejemplo: si el mes seleccionado es abril 2026:
- YTD actual = suma ene-2026 a abr-2026
- YTD anterior = suma ene-2025 a abr-2025

---

## ImplementaciÃ³n (solo frontend)

No se requieren cambios en el backend. Los datos de meses ya llegan del endpoint `/api/arr/summary`; el cÃ¡lculo YTD se hace en el componente o en un helper de `utils.ts`.

### Helper sugerido en `utils.ts`

```typescript
export function calcYTD(
  monthlyPoints: { month: string; value: number }[],
  referenceMonth: string   // formato 'YYYY-MM'
): number {
  const [year] = referenceMonth.split('-').map(Number);
  return monthlyPoints
    .filter(p => {
      const [y, m] = p.month.split('-').map(Number);
      return y === year && m <= parseInt(referenceMonth.split('-')[1]);
    })
    .reduce((sum, p) => sum + (p.value ?? 0), 0);
}
```

### Columnas resultantes en `ARRBreakdownTable`

| LINEA | ARR ACTUAL | YTD ACTUAL | YTD ANTERIOR | Î” YTD % | PESO |
|---|---|---|---|---|---|
| SaaS Author | 2.148.827 â‚¬ | 8.432.000 â‚¬ | 9.100.000 â‚¬ | -7.3% | 28.8% |

- **ARR ACTUAL:** valor del mes mÃ¡s reciente del periodo seleccionado (no cambia respecto a V2).
- **YTD ACTUAL:** suma eneâ†’mes actual del aÃ±o en curso para esa lÃ­nea.
- **YTD ANTERIOR:** suma eneâ†’mismo mes del aÃ±o anterior para esa lÃ­nea.
- **Î” YTD %:** variaciÃ³n porcentual. Si YTD anterior es 0 o no hay datos, mostrar `â€”`.
- **PESO:** porcentaje sobre el total (no cambia).

---

## Criterio de aceptaciÃ³n

- Las columnas MoM â‚¬ y MoM % no aparecen en ningÃºn lugar de la UI.
- Los valores YTD son matemÃ¡ticamente correctos verificados manualmente contra los datos del grÃ¡fico.
- Si no hay datos del aÃ±o anterior, Î” YTD % muestra `â€”` (no NaN ni error).

