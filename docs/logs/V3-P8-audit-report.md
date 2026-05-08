# V3-P8 — Informe de auditoría de código

**Fecha:** 2026-05-08
**Estado:** Completado
**Tests:** 61/61 ✓ | TypeScript: 0 errores ✓

---

## Bugs corregidos (implementados)

### 1. `excel_exporter.py` — Campo `arr_eur` no existente (HIGH)
- **Archivo:** `app/backend/core/excel_exporter.py:81`
- **Problema:** `r.arr_eur` lanzaba `AttributeError` en runtime al exportar Excel. El modelo define `arr_value`, no `arr_eur`.
- **Corrección:** `r.arr_eur` → `r.arr_value`

### 2. `stripe.py` — `arr_equivalent` no multiplicaba por 12 (HIGH)
- **Archivos:** `app/backend/api/routes/stripe.py` (líneas 42, 82, 117)
- **Problema:** Los tres puntos donde se devuelve `arr_equivalent` retornaban el MRR directamente en lugar de `mrr × 12`.
- **Corrección:** Multiplicar por 12 en los tres puntos.

### 3. `test_api.py` — `opportunity_type` con formato incorrecto (MEDIUM)
- **Archivo:** `tests/test_api.py:144`
- **Problema:** El helper `_make_raw` usaba `"nuevo_negocio"` (guion bajo) pero el route chequea `"nuevo negocio"` (espacio, tras `.lower().strip()`). El test `test_arr_summary_from_close_mode` fallaba porque la condición de from_close nunca se activaba.
- **Corrección:** `"nuevo_negocio"` → `"Nuevo Negocio"` en `_make_raw`.

---

## Limpieza implementada

### 4. Frontend — Tipos no usados eliminados (MEDIUM)
- **Archivo:** `app/frontend/lib/types.ts`
- **Eliminado:** `ARRMonthPoint.mom_change` (nunca usada en producción) y `ConsultantARR.mom_change` / `ConsultantARR.mom_pct` (nunca usadas en UI).
- **Conservado:** `ARRMonthPoint.mom_pct` (usada en `ARRTotalChart.tsx:31`).
- **Mock:** Eliminados los campos correspondientes en `mock-api.ts`.

### 5. Backend — Deduplicación de `_latest_snapshot_id` (MEDIUM)
- **Problema:** Función idéntica duplicada en `arr.py`, `alerts.py` y `stripe.py`.
- **Corrección:** Añadida `_latest_snapshot_id_or_none()` a `arr.py`. `alerts.py` y `stripe.py` ahora importan desde `arr.py` en lugar de tener su propia copia.
- **Limpieza adicional:** Eliminada la importación de `Snapshot` en `alerts.py` y `stripe.py` (ya no la necesitan).

---

## Refactors mayores propuestos (NO implementados — requieren aprobación CFO)

### A. Separar lógica de negocio de la capa HTTP en `arr.py` (HIGH)
- **Archivo:** `app/backend/api/routes/arr.py`
- **Problema:** La lógica de "modo from_close" y los cálculos de agregación mensual están embebidos en los handlers HTTP. Dificulta testear la lógica de negocio de forma aislada.
- **Propuesta:** Mover la lógica de cálculo a funciones en `core/arr_calculator.py` o crear `core/arr_service.py`. Los handlers solo orchestran parámetros y responden HTTP.
- **Impacto estimado:** ~3-4 horas. Sin cambios en API surface.

### B. Consolidar lógica de agregación mensual en `arr.py` y `expert.py` (HIGH)
- **Archivos:** `arr.py:167-178` y `expert.py:231-240`
- **Problema:** El mismo bucle de "iterar meses y acumular ARR por tipo de producto" aparece en ambos archivos.
- **Propuesta:** Extraer a función shared en `core/`.
- **Impacto estimado:** ~1-2 horas.

### C. N+1 en `stripe.py` bulk upsert (MEDIUM)
- **Archivo:** `app/backend/api/routes/stripe.py:55-63`
- **Problema:** Un query por fila en el bucle de upsert. Con volúmenes normales de Stripe (12 filas/año) es negligible, pero escala mal.
- **Propuesta:** Pre-cargar todos los registros existentes antes del bucle y hacer lookup en memoria.
- **Impacto estimado:** 30 minutos. Bajo riesgo.

### D. Extracción de constantes de Recharts (LOW)
- **Archivos:** `ARRChart.tsx`, `ARRTotalChart.tsx`, `ARRYearBarsChart.tsx`, `ClientARRChart.tsx`, `TopAccountsBarsChart.tsx`, `TopAccountsLinesChart.tsx`
- **Problema:** Estilos de tooltip, ejes y grid repetidos en 6 componentes.
- **Propuesta:** Crear `lib/chart-config.ts` con las constantes compartidas.
- **Impacto estimado:** 1-2 horas. Puramente cosmético, sin cambio de comportamiento.

### E. Consolidar regex `TOP_EXCLUDE` duplicado (LOW)
- **Archivos:** `TopAccountsBarsChart.tsx` y `TopAccountsLinesChart.tsx`
- **Problema:** Misma regex declarada en ambos componentes.
- **Propuesta:** Mover a `lib/chart-config.ts` o similar.
- **Impacto estimado:** 15 minutos.

### F. Refactorizar tests hacia contratos de comportamiento (MEDIUM)
- **Archivo:** `tests/test_api.py`
- **Problema:** Los helpers `_make_raw`, `_make_arr` construyen objetos con acoplamiento a campos internos. Refactorizar el core cambiaría los tests aunque el comportamiento externo no cambie.
- **Propuesta:** Helpers de alto nivel como `create_saas_contract(account="ACME", arr=10000)` que expresen intención, no implementación.
- **Impacto estimado:** 3-4 horas. Bajo riesgo pero labor intensiva.

---

## Sin hallazgos

- `console.log` de depuración: 0 encontrados
- Código muerto / comentado: 0 encontrados
- Schemas Pydantic huérfanos: 0 encontrados
- Imports no usados en `api.ts`: 0 encontrados
- Código de compatibilidad V1 en `snapshot_manager.py`: 0 encontrados
