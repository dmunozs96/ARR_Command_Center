# Current State
**Ultima actualizacion:** 2026-05-08
**Agente:** Codex (sesion 24)

---

## Objetivo del proyecto

Construir una aplicacion web (**ARR Command Center**) que sustituya el proceso manual:
> Salesforce -> Excel -> calculo manual del CFO

La app calcula, visualiza y audita el ARR de isEazy.

**Usuarios finales:** CFO + equipo de finanzas  
**Stack:** Python/FastAPI + PostgreSQL + React/Next.js

---

## Estado actual

| Fase | Nombre | Estado | Verificacion |
|------|--------|--------|--------------|
| A | Motor de calculo + infraestructura | completa | 57/57 |
| B | Backend API FastAPI | completa | 57/57 |
| C | Frontend Next.js | completa | TypeScript OK |
| D | Historial de snapshots en UI | completa | TypeScript OK |
| E | Integracion real con Salesforce | bloqueada | pendiente credenciales SF |
| F | Panel de alertas completo | completa | 57/57 |
| G | Stripe UI completa + consultores exportables | completa | 57/57 |
| H | Endurecimiento, e2e y UX final | completa | 57/57 backend, 3/3 e2e |
| — | Cron diario con dedup por hash | completa | 57/57 |
| I-A | Toggle ARR "desde cierre" vs "desde inicio" | completa | 57/57 |
| I-B | Deteccion y gestion de solapamientos | completa | 57/57 |
| V2-P1 | Analisis por Cliente y Linea de Negocio | completa | TypeScript OK |
| V2-P2 | Top 20 Clientes en Dashboard | completa | TypeScript OK |
| V2-P3 | Agrupacion de Lineas de Negocio | completa | TypeScript OK |
| V2-P4 | ARR Expert (IA embebida) | completa | TypeScript OK |
| **V3-P1** | **Correccion matematica BL grouping** | **completa** | TypeScript OK |
| **V3-P2** | **Limpieza de NaN global** | **completa** | TypeScript OK |
| **V3-P3** | **MoM → comparativas ARR puntuales** | **completa** | TypeScript OK |
| **V3-P4** | **Top 20 sin "Otros"** | **completa** | TypeScript OK |
| **V3-P5** | **Tabla de clientes corregida** | **completa** | TypeScript OK |
| **V3-P6** | **Consultores — nivel 2 (clientes por BL)** | **completa** | TypeScript OK |
| **V3-P7** | **Exportar Excel snapshot** | **completa** | TypeScript OK |
| **V3-P8** | **Revision y optimizacion de codigo** | **completa** | 63/63 |

**Tests backend:** `pytest -q` -> **63/63 OK**
**Frontend lint:** `npm.cmd run lint` -> **OK**
**Frontend build/TypeScript:** `npm.cmd run build` -> **OK**
**E2E:** `npm.cmd run test:e2e` -> **3/3 OK**

---

## Lo implementado en la sesion 24 (modo ARR global)

El selector `Desde inicio` / `Desde cierre` ahora esta en la barra lateral izquierda y aplica globalmente.

**Cambios principales:**
- Nuevo contexto `ARRModeProvider` con persistencia en `localStorage`.
- Nuevo componente `ARRModeToggle` en el sidebar, bajo el selector de snapshot.
- Dashboard, Clientes y Consultores consumen el mismo modo global.
- `/api/arr/by-consultant` acepta `mode=from_start|from_close`, alineado con `/api/arr/summary` y `/api/arr/by-account`.
- El drill-down de clientes dentro de Consultores tambien respeta el modo ARR global.

**Resultado:** el usuario cambia una vez el criterio de ARR y todas las vistas analiticas disponibles quedan sincronizadas.

---

## Lo implementado en la sesion 23 (semantica ARR puntual)

Se corrigio la interpretacion de "YTD" en ARR. ARR es un dato anualizado y comparable por mes, asi que no se debe sumar enero-mes.

**Cambios principales:**
- Se eliminaron referencias YTD de la app frontend.
- KPIs y desglose por linea comparan:
  - mes seleccionado vs mismo mes del ano anterior;
  - mes seleccionado vs diciembre anterior movil (`n-1` segun el ano del mes seleccionado).
- Dashboard anade filtro de cliente. El backend soporta `account_name` en `/api/arr/summary` y `/api/arr/by-account`.
- Vista `/clients` anade grafico de lineas de evolucion de top clientes.
- Graficos de clientes omiten `Otros`, `Resto` y `Resto de clientes` para mayor claridad visual.
- Stripe MRR queda endurecido: `arr_equivalent = mrr * 12`, helper de salida comun y bulk upsert sin N+1.
- `AlertOut.alert_ids` usa `Field(default_factory=list)` y tipos frontend quedan alineados con schemas reales.

**Resultado:** dashboard y vistas de cliente reflejan comparativas correctas para ARR anualizado, sin acumulados incorrectos.

---

## Lo implementado en la sesion 22 (V3 bugfix final)

Se implemento `docs/v3_bug_report.md` y se hizo una segunda revision critica.

**Correcciones principales:**
- Backend serializa los `Decimal` de ARR como numeros JSON mediante `JsonDecimal`/`PlainSerializer` en `schemas.py`.
- `GET /api/arr/summary` acepta `product_types` CSV para soportar filtros combinados.
- `ARRByAccountResponse.months` queda como `List[str]` y `/arr/by-account` devuelve strings `YYYY-MM-DD`.
- Frontend incorpora `toFiniteNumber` y usa conversion defensiva en formatos, YTD, BL grouping, tabla de clientes, consultores y ARR por pais.
- Dashboard anade filtro de linea de negocio encima de las graficas de distribucion por cliente.
- Filtros combinados `LMS & AIO` y `Author (Total)` se traducen a product types reales antes de llamar a la API.
- `ExpertTable.tsx` corrige parseo de importes con decimales.
- `alerts/page.tsx` evita crash si `alert_ids` no viene en alertas no agrupadas.
- E2E mocks actualizados para cubrir `/arr/by-account` y `/config/products`.

**Resultado:** V3 queda reparada tras el informe `docs/v3_bug_report.md` y verificada con backend, lint, build y Playwright.

---

## Lo implementado en la sesion 21 (V3-P8)

### V3-P8 — Revision y optimizacion de codigo

**Bugs corregidos:**
- `excel_exporter.py`: `r.arr_eur` → `r.arr_value` (AttributeError en runtime al exportar Excel)
- `stripe.py`: `arr_equivalent = mrr * 12` en los 3 endpoints (devolvía el MRR sin anualizar)
- `tests/test_api.py` `_make_raw`: `opportunity_type` corregido a `"Nuevo Negocio"` (espacio, no guion bajo); solucionó el test `test_arr_summary_from_close_mode`

**Limpieza implementada:**
- Eliminados `ARRMonthPoint.mom_change` y `ConsultantARR.{mom_change,mom_pct}` de `types.ts` (dead code — nunca usados en producción)
- Mock `mock-api.ts` actualizado para eliminar campos correspondientes
- Deduplicada `_latest_snapshot_id`: añadida `_latest_snapshot_id_or_none()` a `arr.py`; `alerts.py` y `stripe.py` la importan en lugar de tener su propia copia

**Informe de auditoria:** `docs/logs/V3-P8-audit-report.md`
Incluye 6 refactors mayores propuestos pendientes de aprobacion (separar logica de negocio de routes, consolidar agregacion mensual, N+1 Stripe, Recharts constants, etc.)

---

## Lo implementado en la sesion 20 (V3 P1–P7)

### V3-P1 — Correccion matematica BL grouping
- `app/frontend/lib/utils.ts`:
  - `applyBLGrouping`: eliminada condicion `if (lms + aio > 0)` — grouped key se establece siempre cuando la opcion esta activa, evitando inconsistencias al comparar meses
  - Nueva funcion `sumSeriesByMonth(a, b)`: join defensivo de dos series `{mes → valor}` para uso futuro

### V3-P2 — Limpieza de NaN global
- `formatEUR` y `formatPct` son defensivos: `null | undefined | NaN → "—"`
- `consultants/page.tsx`: `totalARR` filtra valores no finitos con `Number.isFinite`
- `app/page.tsx`: `countryMix` filtra `arr_total` no finito antes de acumular

### V3-P3 — MoM → YTD comparativo
- `utils.ts`: nuevos helpers `calcYTD(months, referenceMonth)` y `calcYTDByProductType(...)`
- `ARRBreakdownTable.tsx` reescrita: nuevas columnas YTD actual / YTD anterior / Δ YTD % (MoM eliminado); recibe `months: ARRMonthPoint[]` en lugar de `prev`
- `KPICards.tsx`: tarjetas "Variacion MoM" y "Crecimiento MoM" → "YTD año actual", "YTD año anterior", "Δ YTD %"
- `consultants/page.tsx`: columnas MoM eliminadas → "% del Total"

### V3-P4 — Top 20 sin "Otros"
- `TopAccountsBarsChart.tsx` y `TopAccountsLinesChart.tsx`: filtro `/^otros/i` antes de construir datos para Recharts; nota descriptiva añadida bajo cada titulo

### V3-P5 — Tabla de clientes corregida
- `ClientARRTable.tsx` reescrita:
  - Columna "Total" → "ARR Actual" (valor del ultimo mes en negrita)
  - Columna Δ: valor absoluto + porcentaje en dos lineas
  - Guard: primer mes 0 o null → porcentaje muestra `—`
  - CSV exportado actualizado con nuevas cabeceras

### V3-P6 — Consultores — nivel 2 (clientes por BL)
- `app/backend/api/routes/arr.py`: parametros opcionales `consultant` y `product_type` añadidos al endpoint `GET /arr/by-account` (ambos modos: from_start y from_close)
- `app/frontend/lib/api.ts`: `getARRByAccount` acepta `consultant` y `product_type`
- `consultants/page.tsx`: arbol de 3 niveles con carga lazy (React Query); el tercer nivel es el componente `BLClientsLevel` que se monta solo cuando el usuario expande una fila BL

### V3-P7 — Exportar Excel snapshot
- `app/backend/core/excel_exporter.py`: funcion `build_snapshot_excel(snapshot_id, db)` → bytes; genera 5 pestañas: Resumen mensual, Por cliente, Por consultor, Por pais, Lineas brutas
- `app/backend/api/routes/exports.py`: `GET /api/exports/excel?snapshot_id={uuid}` con StreamingResponse
- `app/backend/main.py`: router registrado bajo `/api/exports`
- `app/frontend/lib/api.ts`: funcion `downloadSnapshotExcel(snapshotId)` dispara descarga del navegador
- `app/frontend/app/page.tsx`: boton "Descargar Snapshot" con icono Download y spinner

---

## Riesgos abiertos

| ID | Riesgo | Severidad | Estado |
|----|--------|-----------|--------|
| RT-01 | Nombres reales de campos Salesforce sin verificar | ALTA | abierto |
| RT-02 | Tabla de productos puede no coincidir con SF | ALTA | abierto |
| RT-03 | `validate_vs_excel.py` no ejecutado contra SF real | MEDIA | abierto |
| RT-06 | PostgreSQL local no levantado | MEDIA | abierto |
| RT-07 | `npm run build` con `spawn EPERM` en Windows | BAJA | abierto |
| RT-08 | `excel_exporter.py` usa `ARRMonthlySummary` — verificar que se puebla en el snapshot | MEDIA | nuevo |

---

## Archivos clave para el siguiente agente

### Archivos principales modificados en sesion 21
- `app/backend/api/routes/arr.py` — nueva `_latest_snapshot_id_or_none()`
- `app/backend/api/routes/alerts.py` — importa helper desde `arr.py`
- `app/backend/api/routes/stripe.py` — importa helper, `arr_equivalent * 12`
- `app/backend/core/excel_exporter.py` — `arr_eur` → `arr_value`
- `app/frontend/lib/types.ts` — dead code eliminado
- `app/frontend/tests/e2e/helpers/mock-api.ts` — mocks actualizados
- `tests/test_api.py` — `opportunity_type` corregido en `_make_raw`
- `docs/logs/V3-P8-audit-report.md` — nuevo, informe completo de auditoria

### Archivos principales modificados en sesion 20
- `app/frontend/lib/utils.ts`
- `app/frontend/components/ARRBreakdownTable.tsx`
- `app/frontend/components/KPICards.tsx`
- `app/frontend/components/ClientARRTable.tsx`
- `app/frontend/components/TopAccountsBarsChart.tsx`
- `app/frontend/components/TopAccountsLinesChart.tsx`
- `app/frontend/app/consultants/page.tsx`
- `app/frontend/app/page.tsx`
- `app/frontend/lib/api.ts`
- `app/backend/api/routes/arr.py`
- `app/backend/api/routes/exports.py` (nuevo)
- `app/backend/core/excel_exporter.py` (nuevo)
- `app/backend/main.py`
