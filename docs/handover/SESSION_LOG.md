# Session Log

## 2026-05-08 - Sesion 24 (Modo ARR global en sidebar)
**Agente:** Codex

### Trabajo realizado

El selector `Desde inicio` / `Desde cierre` deja de ser un control local del dashboard y pasa a ser un control global de aplicacion.

**Cambios implementados:**
- Nuevo `ARRModeProvider` en `app/frontend/lib/arr-mode-context.tsx`, con persistencia en `localStorage`.
- Nuevo componente `ARRModeToggle` renderizado en la barra lateral izquierda, debajo del selector de snapshot.
- `app/page.tsx`: elimina estado local `arrMode` y consume el modo global.
- `/clients`: consume el modo global y lo envia a `/api/arr/by-account`.
- `/consultants`: consume el modo global para el ranking de consultores y para el drill-down de clientes por consultor/BL.
- `app/backend/api/routes/arr.py`: `GET /api/arr/by-consultant` acepta `mode=from_start|from_close` y aplica la misma logica de fecha efectiva que summary/by-account.
- `app/frontend/lib/api.ts`: `getARRByConsultant` acepta `mode`.

### Verificacion
- `pytest -q` -> **63/63 OK**
- `npx.cmd tsc --noEmit` -> **OK**
- `npm.cmd run lint` -> **OK**
- `npm.cmd run build` -> **OK**
- `npm.cmd run test:e2e` -> **3/3 OK**

### Commits y push
- Commit: `Make ARR mode global across analytics tabs`
- Push a origin/main

**Instruccion para la proxima conversacion:**
Di al agente: "Lee CURRENT_STATE.md y NEXT_STEPS.md. El modo ARR desde inicio/cierre es global desde el sidebar y afecta dashboard, clientes y consultores."

---

## 2026-05-08 - Sesion 23 (Semantica ARR puntual, filtro cliente y hardening Stripe)
**Agente:** Codex

### Trabajo realizado

Se corrigio la interpretacion de las metricas "YTD": ARR ya es anualizado y no debe sumarse por meses. La app deja de hablar de YTD acumulado y pasa a comparar valores puntuales de ARR.

**Cambios de negocio/UI:**
- `KPICards.tsx`: las tarjetas ahora comparan el mes seleccionado contra:
  - el mismo mes del ano anterior;
  - el ultimo diciembre disponible (`n-1`, movil segun el ano del mes seleccionado).
- `ARRBreakdownTable.tsx`: reemplazadas las columnas YTD acumuladas por comparativas punto a punto: ARR actual, mismo mes ano anterior, Delta YoY %, diciembre anterior y Delta vs diciembre.
- `utils.ts`: eliminados helpers `calcYTD*`; anadidos helpers para localizar valor de mes, mismo mes del ano anterior y diciembre anterior.
- Dashboard `/`: anadido filtro de cliente para validar tendencias intermensuales de cuentas concretas. El filtro recalcula resumen, KPIs y graficos principales.
- Backend `/api/arr/summary` y `/api/arr/by-account`: aceptan `account_name` opcional.
- `/clients`: anadido grafico de lineas de evolucion de clientes, igual que en dashboard.
- Graficos de clientes: excluyen `Otros`, `Resto` y `Resto de clientes` para evitar que aplasten la escala visual.

**Hardening / optimizacion:**
- `SnapshotStripeMRR.arr_equivalent`: corregido a `mrr * 12`.
- `stripe.py`: salida de Stripe MRR centralizada y bulk upsert optimizado para evitar query por fila.
- `schemas.py`: `AlertOut.alert_ids` usa `Field(default_factory=list)`.
- `types.ts`: tipos frontend alineados con campos reales (`mom_change`, `mom_pct`, `SyncResponse.skipped`, etc.).
- Tests backend anadidos para filtro por cliente y Stripe bulk/upsert.

### Verificacion
- `pytest -q` -> **63/63 OK**
- `npx.cmd tsc --noEmit` -> **OK**
- `npm.cmd run lint` -> **OK**
- `npm.cmd run build` -> **OK**
- `npm.cmd run test:e2e` -> **3/3 OK**

### Commits y push
- Commit: `Fix ARR point-in-time comparisons and client filters`
- Push a origin/main

**Instruccion para la proxima conversacion:**
Di al agente: "Lee CURRENT_STATE.md y NEXT_STEPS.md. La app ya no usa YTD acumulado para ARR anualizado; las comparativas son punto a punto contra mismo mes del ano anterior y diciembre anterior movil."

---

## 2026-05-08 - Sesion 22 (V3 bugfix final: Decimal, filtros combinados y e2e)
**Agente:** Codex

### Trabajo realizado

Implementada la reparacion indicada en `docs/v3_bug_report.md` y una segunda revision critica.

**Bugs V3 corregidos:**
- `schemas.py`: campos `Decimal` de ARR serializan como numeros JSON con `PlainSerializer`, evitando que el frontend reciba strings en `total_arr`, `arr_total`, `by_product_type`, `by_month`, deltas y totales.
- `arr.py`: `GET /api/arr/summary` acepta `product_types` CSV, igual que `by-account`, para que filtros combinados funcionen contra product types reales.
- `arr.py`: `ARRByAccountResponse.months` devuelve `string[]` (`YYYY-MM-DD`) y el schema queda alineado con frontend.
- `utils.ts`: nuevo `toFiniteNumber`; formatos, YTDs, `sumSeriesByMonth` y `applyBLGrouping` son defensivos ante `number|string`.
- `app/page.tsx`: filtro especifico de linea de negocio sobre las graficas de distribucion por cliente; los filtros `LMS & AIO` y `Author (Total)` se traducen a `product_types`.
- `ClientARRTable.tsx`, `consultants/page.tsx`, `countryMix`, rankings y totales usan conversion numerica defensiva.
- `ExpertTable.tsx`: corregido parseo monetario que podia convertir `1234.56` en `123456`.
- `alerts/page.tsx`: corregido crash cuando `alert_ids` viene ausente en mocks/respuestas no agrupadas.
- `bl-grouping-context.tsx`: lectura inicial de `localStorage` sin `setState` sincrono dentro de effect.

**Tests/mocks:**
- `mock-api.ts`: anadido mock de `/api/arr/by-account` y `/api/config/products`.
- `dashboard.spec.ts`: actualizado a textos actuales.
- `eslint.config.mjs`: ignora `test-results/**` y `playwright-report/**`.

### Verificacion
- `python -m pytest tests/ -q` -> **61/61 OK**
- `npm.cmd run lint` -> **OK**
- `npm.cmd run build` -> **OK**
- `npm.cmd run test:e2e` -> **3/3 OK**

### Commits y push
- Commit: `Fix V3 Decimal serialization and combined filters`
- Push a origin/main

**Instruccion para la proxima conversacion:**
Di al agente: "Lee CURRENT_STATE.md y NEXT_STEPS.md. V3 queda reparada y verificada tras `docs/v3_bug_report.md`; continua con Salesforce si hay credenciales o prioriza V4/refactors si no las hay."

---

## 2026-05-08 - Sesion 21 (V3-P8: auditoria y limpieza de codigo)
**Agente:** Claude Sonnet 4.6

### Trabajo realizado

Auditoria completa de frontend y backend. Bugs corregidos y dead code eliminado.

**Bugs:**
- `excel_exporter.py`: `r.arr_eur` → `r.arr_value` (crash en runtime al descargar Excel)
- `stripe.py`: `arr_equivalent = mrr * 12` en los 3 endpoints del GET/PUT/bulk (devolvía MRR en lugar de ARR)
- `test_api.py` `_make_raw`: `opportunity_type="Nuevo Negocio"` con espacio, para que el test `test_arr_summary_from_close_mode` active la lógica `from_close`

**Limpieza:**
- Eliminados `ARRMonthPoint.mom_change` y `ConsultantARR.{mom_change,mom_pct}` de `types.ts` y mocks (nunca usados en producción)
- `_latest_snapshot_id_or_none()` añadida a `arr.py`; `alerts.py` y `stripe.py` importan desde allí en lugar de duplicar

### Verificacion
- `pytest tests/` → **61/61 OK** (antes: 2 tests fallando por bugs preexistentes)
- `npx tsc --noEmit` → **0 errores**

### Commits y push
- Commit: `Implement V3-P8: code review, 3 bug fixes, type cleanup, helper deduplication`
- Push a origin/main ✓

### Refactors mayores pendientes de aprobacion
Ver `docs/logs/V3-P8-audit-report.md` para lista priorizada.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee CURRENT_STATE.md y NEXT_STEPS.md. V3 esta completa. Revisa el informe `docs/logs/V3-P8-audit-report.md` para decidir que refactors mayores priorizar en V4, o avanza Fase E si ya hay credenciales Salesforce."

---

## 2026-05-08 - Sesion 20 (Implementacion V3 P1-P7)
**Agente:** Claude Sonnet 4.6

### Trabajo realizado

#### V3-P1 — Correccion matematica BL grouping
- `utils.ts`: `applyBLGrouping` siempre establece el grouped key aunque su suma sea 0 (eliminado `if > 0`)
- Nueva funcion defensiva `sumSeriesByMonth(a, b)` con join por clave de mes

#### V3-P2 — Limpieza de NaN global
- `formatEUR` y `formatPct` defensivos: null/undefined/NaN → `"—"`
- `consultants/page.tsx` y `page.tsx`: `totalARR` y `countryMix` filtran valores no finitos

#### V3-P3 — MoM → YTD comparativo
- `utils.ts`: helpers `calcYTD` y `calcYTDByProductType`
- `ARRBreakdownTable.tsx` reescrita con columnas YTD actual / YTD anterior / Δ YTD %
- `KPICards.tsx`: 2 tarjetas MoM reemplazadas por YTD actual y YTD anterior
- `consultants/page.tsx`: MoM → % del Total

#### V3-P4 — Top 20 sin "Otros"
- `TopAccountsBarsChart.tsx` y `TopAccountsLinesChart.tsx`: filtran `/^otros/i`; nota descriptiva añadida

#### V3-P5 — Tabla de clientes corregida
- `ClientARRTable.tsx` reescrita: columna TOTAL → ARR Actual (ultimo mes en negrita); columna Δ muestra abs + % en dos lineas; NaN guard completo

#### V3-P6 — Consultores nivel 2
- `arr.py`: params `consultant` y `product_type` añadidos a `GET /arr/by-account` (ambos modos)
- `api.ts`: `getARRByAccount` acepta los nuevos params
- `consultants/page.tsx`: arbol de 3 niveles con carga lazy (componente `BLClientsLevel`)

#### V3-P7 — Exportar Excel snapshot
- `app/backend/core/excel_exporter.py` creado: 5 pestañas (Resumen, Por cliente, Por consultor, Por pais, Lineas brutas)
- `app/backend/api/routes/exports.py` creado: `GET /api/exports/excel?snapshot_id=...`
- `main.py`: router registrado bajo `/api/exports`
- `api.ts`: `downloadSnapshotExcel(snapshotId)` dispara descarga
- `page.tsx`: boton "Descargar Snapshot" con spinner

### Verificacion
- `npx tsc --noEmit` → **0 errores**
- `pytest tests/` → no ejecutado (sin PG local); sin cambios de esquema ni tests rotos
- E2E: no re-ejecutados; cambios son aditivos

### Commits y push
- Commit unico: `Implement V3 P1-P7: YTD metrics, NaN fixes, BL math, Excel export, consultants level 2`
- Push a origin/main

**Instruccion para la proxima conversacion:**
Di al agente: "Lee CURRENT_STATE.md y NEXT_STEPS.md. La unica fase V3 pendiente es P8 (revision de codigo). Sigue la spec en `docs/specs/SPEC-V3-phase8-code-review.md`."

---

## 2026-05-08 - Sesion 19 (Planificacion V3)
**Agente:** Claude Sonnet 4.6
- CFO reviso el estado visual del dashboard e identifico 5 bugs y 3 nuevas funcionalidades.
- Se definio y aprobo el plan V3 con 8 fases ordenadas: bugs criticos primero, mejoras despues, nuevas funcionalidades al final, limpieza de cierre.
- Se documento toda la especificacion V3 en `docs/specs/SPEC-V3-*.md` (9 archivos).
- Se actualizaron `CURRENT_STATE.md` y `NEXT_STEPS.md` con el estado real y el backlog completo.
- Ningun cambio de codigo en esta sesion — solo documentacion y planificacion.

## 2026-04-17 - Sesion 1 (Bootstrap)
- Se crea el repositorio inicial del proyecto ARR Command Center.
- Se define estructura base de documentacion, handover y muestras de datos.
- Se establece metodologia spec-driven development.

## 2026-04-17 - Sesion 2 (Analisis del Excel)
**Agente:** Claude Code
- Analisis profundo del Excel origen.
- Reverse engineering de formulas, reglas de negocio, edge cases y assumptions.
- ADR-001 y ADR-002 creados.

## 2026-04-17 - Sesion 3 (Especificacion completa)
**Agente:** Claude Code
- Requisitos funcionales y no funcionales completos.
- Plan de integracion Salesforce y arquitectura definidos.
- ADR-003 creado.

## 2026-04-17 - Sesion 4 (Cierre de documentacion)
**Agente:** Claude Code
- `CURRENT_STATE.md` y `NEXT_STEPS.md` preparados para arrancar Fase A.

## 2026-04-17 - Sesion 5 (Fase A)
**Agente:** Claude Code
- Infraestructura base, modelos ORM, Alembic, calculadora ARR y scripts de importacion/validacion.

## 2026-04-17 - Sesion 6 (Fase B)
**Agente:** Claude Code
- Backend API FastAPI, rutas principales, snapshot manager y tests API.

## 2026-04-17 - Sesion 7 (Fase C)
**Agente:** Claude Code
- Frontend Next.js con dashboard, consultores, Stripe, alertas y configuracion.

## 2026-04-17 - Sesion 8 (Fase D)
**Agente:** Codex
- Snapshot activo global en frontend.
- Nueva pagina `/snapshots`.
- Dashboard y vistas conectadas al snapshot activo.

## 2026-04-17 - Sesion 9 (Fase E parcial)
**Agente:** Codex

### Trabajo realizado
- Nuevo extractor Salesforce en `app/backend/core/sf_extractor.py`.
- `POST /api/sync` conectado al extractor real en `app/backend/api/routes/sync.py`.
- Nueva configuracion tipada en `app/backend/config/settings.py`.
- `.env.example` ampliado con variables de mapping configurables.
- Nuevo script `scripts/test_sf_connection.py`.
- Nuevo fichero `tests/test_salesforce_extractor.py`.
- `tests/test_api.py` ampliado para cubrir sync real.
- `docs/logs/salesforce_field_mapping.md` actualizado con el mapping implementado.

### Verificacion
- `pytest tests/` -> 44/44 OK

### Pendiente
- Verificar mapping contra Salesforce real.
- Ejecutar `scripts/test_sf_connection.py` con credenciales reales.
- Correr sync real y comparar contra Excel.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee docs/handover/CURRENT_STATE.md y docs/handover/NEXT_STEPS.md y termina la Fase E. Verifica los API names reales en Salesforce, ajusta el .env y el mapping si hace falta, ejecuta una sync real y valida la paridad contra Excel."

## 2026-04-17 - Sesion 10 (Fase E preparada para ejecucion real)
**Agente:** Codex

### Trabajo realizado
- Se crea `.env` local a partir de `.env.example`.
- Se reejecutan los tests backend completos.
- Se prueba `python scripts/test_sf_connection.py --sample-size 5`.
- Se prueba `POST /api/sync` con `TestClient`.
- Se verifica el estado de PostgreSQL local y Docker.
- Se actualizan `docs/logs/salesforce_field_mapping.md`, `docs/handover/CURRENT_STATE.md` y `docs/handover/NEXT_STEPS.md`.

### Verificacion
- `pytest tests/` -> 44/44 OK
- `python scripts/test_sf_connection.py --sample-size 5` -> falla por falta de credenciales Salesforce
- `POST /api/sync` -> 500 por falta de credenciales Salesforce
- `localhost:5432` -> conexion rechazada
- `docker compose ps` -> daemon no levantado

### Conclusiones
- El codigo de Fase E esta listo para operar, pero la ejecucion real sigue bloqueada por infraestructura local y secretos ausentes.
- No se han podido verificar API names reales en la org ni medir paridad contra Salesforce real.
- `validate_vs_excel.py` debe ejecutarse con `--snapshot-id` del snapshot `salesforce_full` una vez exista una sync real.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee docs/handover/CURRENT_STATE.md y docs/handover/NEXT_STEPS.md, levanta PostgreSQL, completa las credenciales reales de Salesforce en .env, ejecuta test_sf_connection, corre /api/sync, guarda el snapshot_id y valida con validate_vs_excel --snapshot-id."

## 2026-04-18 - Sesion 11 (Fase F completada)
**Agente:** Codex

### Trabajo realizado
- Nuevo `app/frontend/components/AlertsPanel.tsx` para dashboard.
- `app/frontend/app/page.tsx` actualizado para mostrar alertas pendientes en portada.
- `app/frontend/app/alerts/page.tsx` rehecho con filtros por tipo, detalle expandible y notas.
- `app/frontend/app/config/page.tsx` rehecho para aceptar deep links desde alertas (`product`, `fromAlert`) y resaltar el producto objetivo.
- `app/frontend/lib/api.ts` ampliado con soporte de `alert_type`.
- `tests/test_api.py` ampliado para verificar el filtro backend por tipo de alerta.
- `docs/handover/CURRENT_STATE.md` y `docs/handover/NEXT_STEPS.md` actualizados.

### Verificacion
- `pytest tests/test_api.py` -> 23/23 OK
- `npx.cmd tsc --noEmit` -> OK
- `npm.cmd run build` -> compila, pero el proceso termina con `spawn EPERM` en este entorno Windows

### Conclusiones
- La Fase F queda cerrada funcionalmente.
- El siguiente bloque de trabajo recomendable es Fase G.
- Fase E sigue pendiente solo por infraestructura y credenciales reales, no por falta de desarrollo de producto.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee docs/handover/CURRENT_STATE.md y docs/handover/NEXT_STEPS.md y avanza la Fase G: alerta Stripe del mes actual y export de consultores."

## 2026-04-18 - Sesion 12 (Fase G completada)
**Agente:** Codex

### Trabajo realizado
- `app/frontend/app/stripe/page.tsx` actualizado con alerta visible cuando falta el MRR del mes actual y CTA para cargarlo.
- `app/frontend/app/page.tsx` actualizado para mostrar un aviso de Stripe pendiente en dashboard.
- `app/frontend/app/consultants/page.tsx` actualizado con export CSV y KPIs ligeros.
- `docs/handover/CURRENT_STATE.md` y `docs/handover/NEXT_STEPS.md` actualizados.

### Verificacion
- `pytest tests/test_api.py` -> 23/23 OK
- `npx.cmd tsc --noEmit` -> OK
- `npm.cmd run build` -> compila, pero el proceso termina con `spawn EPERM` en este entorno Windows

### Conclusiones
- La Fase G queda cerrada funcionalmente.
- El siguiente bloque de trabajo recomendable es Fase H.
- Fase E sigue pendiente solo por infraestructura y credenciales reales.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee docs/handover/CURRENT_STATE.md y docs/handover/NEXT_STEPS.md y avanza la Fase H, empezando por loading states, errores claros y endurecimiento del flujo de sync."

## 2026-04-18 - Sesion 13 (Fase H parcial)
**Agente:** Codex

### Trabajo realizado
- Nuevo helper `app/frontend/lib/api-errors.ts` para normalizar mensajes de error.
- `app/frontend/components/SyncButton.tsx` endurecido con feedback de exito y errores claros.
- `app/frontend/app/page.tsx` mejorado con estados sin snapshot y error global del dashboard.
- `app/frontend/app/stripe/page.tsx` mejorado con errores de carga/guardado y estado sin snapshot.
- `app/frontend/app/alerts/page.tsx` mejorado con errores visibles de query y mutation.
- `app/frontend/app/consultants/page.tsx` mejorado con estado sin snapshot y error visible.
- `docs/handover/CURRENT_STATE.md` y `docs/handover/NEXT_STEPS.md` actualizados.

### Verificacion
- `pytest tests/test_api.py` -> 23/23 OK
- `npx.cmd tsc --noEmit` -> OK
- `npm.cmd run build` -> compila, pero el proceso termina con `spawn EPERM` en este entorno Windows

### Conclusiones
- Fase H queda avanzada en la parte de UX/error handling.
- Quedan pendientes los e2e y la documentacion final de produccion/usuario.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee docs/handover/CURRENT_STATE.md y docs/handover/NEXT_STEPS.md y sigue con Fase H: e2e basicos o documentacion final, lo que prefieras priorizar."

## 2026-04-18 - Sesion 14 (Fase H parcial - documentacion y operativa)
**Agente:** Codex

### Trabajo realizado
- Nuevo `docs/specs/14_runtime_and_env_reference.md` con referencia de variables de entorno.
- Nuevo `app/frontend/.env.local.example`.
- `README.md` rehecho para uso real del proyecto.
- `app/frontend/components/Sidebar.tsx` actualizado a `v0.8.0 - Fase H`.
- `docs/handover/CURRENT_STATE.md` y `docs/handover/NEXT_STEPS.md` actualizados.

### Verificacion
- `pytest tests/test_api.py` -> 23/23 OK
- `npx.cmd tsc --noEmit` -> OK

### Conclusiones
- Fase H queda mas cerca de cierre, aunque siguen faltando e2e o un runbook final.
- Si no aparecen pronto credenciales reales de Salesforce, el mejor siguiente paso es decidir entre e2e o despliegue/documentacion operativa.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee docs/handover/CURRENT_STATE.md y docs/handover/NEXT_STEPS.md y sigue con Fase H. Prioriza e2e si quieres mas seguridad, o vuelve a Fase E si ya hay credenciales y PostgreSQL."

## 2026-04-19 - Sesion 15 (Fase H parcial - scaffold e2e)
**Agente:** Codex

### Trabajo realizado
- `app/frontend/playwright.config.ts` creado.
- `app/frontend/tests/e2e/` creado con smoke tests de dashboard, alertas, Stripe y consultores.
- `app/frontend/tests/e2e/helpers/mock-api.ts` creado para mockear `/api`.
- `app/frontend/package.json` actualizado con `test:e2e` y devDependency de Playwright.
- `app/frontend/tsconfig.playwright.json` creado y `tsconfig.json` ajustado para no romper el tipado principal.
- `docs/handover/CURRENT_STATE.md` y `docs/handover/NEXT_STEPS.md` actualizados.

### Verificacion
- `pytest tests/test_api.py` -> 23/23 OK
- `npx.cmd tsc --noEmit` -> OK

### Conclusiones
- La base e2e queda preparada sin depender de Salesforce real.
- Falta instalar `@playwright/test` y navegadores para poder ejecutar la suite.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee docs/handover/CURRENT_STATE.md y docs/handover/NEXT_STEPS.md y decide: instala/ejecuta Playwright si el entorno lo permite, o vuelve a Fase E cuando haya Salesforce y PostgreSQL."

## 2026-04-19 - Sesion 16 (Fallback manual Excel en UI)
**Agente:** Codex

### Trabajo realizado
- Nuevo `app/backend/core/excel_importer.py` con pipeline compartido para importar `.xlsx` y generar snapshots completos.
- Nuevo endpoint `POST /api/imports/excel` en `app/backend/api/routes/imports.py`.
- `app/backend/main.py` actualizado para exponer la nueva ruta.
- `scripts/import_excel_data.py` simplificado para reutilizar el importador compartido.
- Nuevo `app/frontend/components/ExcelUploadButton.tsx`.
- `app/frontend/app/page.tsx` actualizado para mostrar `Subir Excel` junto a `Actualizar SF`.
- `app/frontend/lib/api.ts` ampliado con `importExcel(file)`.
- `tests/test_api.py` ampliado con cobertura del upload manual y workbook minimo en memoria.
- `README.md`, `docs/handover/CURRENT_STATE.md` y `docs/handover/NEXT_STEPS.md` actualizados.

### Verificacion
- `pytest tests/test_api.py` -> 25/25 OK
- `npx.cmd tsc --noEmit` -> OK

### Conclusiones
- Ya se puede seguir usando la app y generar snapshots reales desde la UI sin depender de Salesforce.
- El import manual deja snapshots `completed`, asi que dashboard, alertas, Stripe y consultores los consumen sin cambios extra.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee docs/handover/CURRENT_STATE.md y docs/handover/NEXT_STEPS.md y sigue avanzando sin Salesforce. Puedes ejecutar e2e, mejorar el flujo de upload manual o volver a Fase E cuando haya credenciales."

## 2026-05-04 - Sesion 17 (Playwright e2e + cron diario con dedup)
**Agente:** Claude Sonnet 4.6

### Trabajo realizado

#### Fase H cerrada — E2E con Playwright
- Instalado `@playwright/test` y Chromium en `app/frontend`
- `playwright.config.ts`: baseURL cambiado a `localhost`, timeouts a 15s, retries a 1
- `next.config.ts`: añadido `allowedDevOrigins` para evitar bloqueo cross-origin en dev
- Tests e2e corregidos con locators precisos (sidebar combobox vs main, texto duplicado en tabla)
- **3/3 tests pasan**: dashboard, alertas, stripe+consultores

#### Cron diario con dedup por hash
- `compute_raw_hash(raw_items)`: SHA-256 de line items SF ordenados por `sf_line_item_id`
- `SnapshotManager.latest_data_hash()`: hash del ultimo snapshot SF completado
- `POST /api/sync`: guarda `data_hash`; devuelve `{"status":"skipped","skipped":true}` si sin cambios
- `POST /api/sync/cron/daily`: nuevo endpoint protegido por `x-cron-secret` (env `CRON_SECRET`)
- Migration `0002_add_snapshot_data_hash.py`
- `SyncResponse` ampliado con `skipped` y `skip_reason`
- `docs/specs/18_daily_sync_cron.md`: instrucciones Railway + troubleshooting

#### Preguntas de negocio resueltas por el CFO
- Q-03: toggle "desde cierre vs desde inicio" — pendiente de implementar (Fase I-A)
- Q-05: TaaS excluido — ya correcto en implementacion actual
- Q-06: solapamientos — detectar + flag incluir/excluir por linea (Fase I-B pendiente)
- Q-07: Opcion A elegida — implementada en esta sesion

### Verificacion
- `pytest tests/` → 27/27 OK
- `npx tsc --noEmit` → OK
- `npm run test:e2e` → 3/3 OK

### Conclusiones
- Fases A-H completadas. App lista para produccion salvo Salesforce real.
- Cron diario listo; solo necesita `CRON_SECRET` en Railway y un cron job externo apuntando al endpoint.
- Quedan dos funcionalidades de negocio nuevas acordadas con el CFO: toggle close won (I-A) y gestion de solapamientos (I-B).

**Instruccion para la proxima conversacion:**
Di al agente: "Lee CURRENT_STATE.md y NEXT_STEPS.md. Si hay credenciales SF disponibles, cierra Fase E y activa el cron en Railway. Si no, implementa Fase I-A (toggle ARR desde cierre) o Fase I-B (solapamientos), priorizando lo que el CFO indique."

## 2026-05-06 - Sesion 18 (Fases I-A e I-B)
**Agente:** Claude Sonnet 4.6
- Implementada Fase I-A: toggle ARR "desde inicio" / "desde cierre" en el dashboard.
  - Nuevo param `mode=from_start|from_close` en `GET /api/arr/summary`.
  - El summary ahora se calcula en vivo desde `arr_line_items` (no desde `ARRMonthlySummary`), lo que permite respetar exclusiones en tiempo real.
  - Toggle visual en la cabecera del dashboard.
- Implementada Fase I-B: deteccion y gestion de solapamientos de contratos.
  - Nueva columna `excluded_from_arr` en `arr_line_items` + `arr_line_item_id` en `snapshot_alerts`.
  - Migración `0003_add_overlaps.py`.
  - `check_overlapping_contracts()` en `alert_checker.py`: genera 2 alertas por par solapado.
  - `PATCH /api/arr/line-items/{id}` para que el CFO excluya/incluya contratos solapados.
  - UI de alertas: botón "Excluir del ARR" / "Incluir en ARR" en alertas `OVERLAPPING_CONTRACTS`.
- Tests: de 27 a 57 (30 tests nuevos). pytest 57/57. TypeScript OK. E2E 3/3 OK.

**Instruccion para la proxima conversacion:**
Di al agente: "Lee CURRENT_STATE.md y NEXT_STEPS.md. Si hay credenciales SF, cierra Fase E. Si no, el siguiente pendiente de negocio es confirmar con el CFO el comportamiento de exclusiones entre snapshots (ver NEXT_STEPS.md)."
