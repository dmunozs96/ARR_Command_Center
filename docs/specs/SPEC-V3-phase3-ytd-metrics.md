# V3-P3 — MoM → YTD comparativo

**Estado:** Pendiente  
**Tipo:** Mejora de métrica  
**Orden de implementación:** 3

---

## Motivación

MoM (mes contra mes anterior) tiene escasa utilidad gerencial porque amplifica la estacionalidad y no da contexto de tendencia anual. Lo relevante para el CFO es comparar el acumulado del año en curso contra el mismo periodo del año anterior: **YTD actual vs YTD anterior**.

---

## Alcance

Dos lugares en la UI muestran actualmente MoM y deben cambiarse:

| Componente | Cambio |
|---|---|
| `ARRBreakdownTable.tsx` — "Desglose por línea" | Eliminar columnas MoM € y MoM %; añadir YTD actual, YTD anterior y Δ YTD % |
| `app/frontend/app/consultants/page.tsx` — tabla de consultores | Misma sustitución |
| `KPICards.tsx` — KPI de variación | Label y valor pasan de MoM a YTD vs YTD anterior |

---

## Definición de YTD

```
YTD actual    = suma de ARR desde enero del año en curso hasta el mes seleccionado (inclusive)
YTD anterior  = suma de ARR desde enero del año anterior hasta el mismo mes del año anterior
Δ YTD %       = (YTD actual - YTD anterior) / YTD anterior × 100
```

Ejemplo: si el mes seleccionado es abril 2026:
- YTD actual = suma ene-2026 a abr-2026
- YTD anterior = suma ene-2025 a abr-2025

---

## Implementación (solo frontend)

No se requieren cambios en el backend. Los datos de meses ya llegan del endpoint `/api/arr/summary`; el cálculo YTD se hace en el componente o en un helper de `utils.ts`.

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

| LINEA | ARR ACTUAL | YTD ACTUAL | YTD ANTERIOR | Δ YTD % | PESO |
|---|---|---|---|---|---|
| SaaS Author | 2.148.827 € | 8.432.000 € | 9.100.000 € | -7.3% | 28.8% |

- **ARR ACTUAL:** valor del mes más reciente del periodo seleccionado (no cambia respecto a V2).
- **YTD ACTUAL:** suma ene→mes actual del año en curso para esa línea.
- **YTD ANTERIOR:** suma ene→mismo mes del año anterior para esa línea.
- **Δ YTD %:** variación porcentual. Si YTD anterior es 0 o no hay datos, mostrar `—`.
- **PESO:** porcentaje sobre el total (no cambia).

---

## Criterio de aceptación

- Las columnas MoM € y MoM % no aparecen en ningún lugar de la UI.
- Los valores YTD son matemáticamente correctos verificados manualmente contra los datos del gráfico.
- Si no hay datos del año anterior, Δ YTD % muestra `—` (no NaN ni error).
