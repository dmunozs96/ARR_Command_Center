# Next Steps
**Última actualización:** 2026-04-17

---

## Estado actual: Fase C completada → Empezar Fase D

38/38 tests backend pasan. Frontend Next.js completo, build exitoso. El siguiente agente debe implementar el **historial de snapshots en UI**.

---

## FASE A — Motor de cálculo + infraestructura ✅ COMPLETADA

- [x] `docker-compose.yml`, `.env.example`, estructura de carpetas
- [x] `app/backend/requirements.txt`
- [x] `app/backend/db/models.py` — todos los modelos ORM
- [x] `app/backend/db/connection.py`
- [x] Alembic init + migración `0001_initial_schema.py`
- [x] `app/backend/core/arr_calculator.py` — motor completo
- [x] `app/backend/core/alert_checker.py`
- [x] `app/backend/config/settings.py`
- [x] `scripts/import_excel_data.py`
- [x] `scripts/validate_vs_excel.py`
- [x] `tests/test_arr_calculator.py` — 17/17 tests

**Pendiente de verificación manual** (requiere Docker):
- [ ] `validate_vs_excel.py` pasa con diferencia < 0.01€ — ejecutar una vez levantado Docker

---

## FASE B — Backend API ✅ COMPLETADA

- [x] `app/backend/main.py` — FastAPI con CORS
- [x] `app/backend/api/schemas.py` — modelos Pydantic
- [x] `app/backend/api/routes/arr.py` — `/api/arr/summary|by-consultant|line-items`
- [x] `app/backend/api/routes/snapshots.py`
- [x] `app/backend/api/routes/sync.py` — mock SF
- [x] `app/backend/api/routes/config.py` — CRUD productos y consultores
- [x] `app/backend/api/routes/stripe.py`
- [x] `app/backend/api/routes/alerts.py`
- [x] `app/backend/core/snapshot_manager.py`
- [x] `tests/test_api.py` — 21/21 tests
- [x] `conftest.py` — DATABASE_URL fallback para tests
- [x] `scripts/beta_report.py` — informe terminal sin SF ni frontend

---

## FASE C — Frontend Next.js ✅ COMPLETADA

> Stack: Next.js 16.2.4 + React 19 + Tailwind 4 + TypeScript 5

### Setup inicial
- [x] Inicializar proyecto Next.js 16 con TypeScript en `app/frontend/`
- [x] Instalar dependencias: `recharts` (gráficos), `@tanstack/react-query` v5, `axios`
- [x] Configurar proxy hacia `http://localhost:8000` en `next.config.ts` (rewrites)
- [x] Crear `app/frontend/lib/api.ts` — cliente API tipado con axios
- [x] Crear `app/frontend/lib/types.ts` — tipos TypeScript espejo de schemas.py
- [x] Crear `app/frontend/lib/utils.ts` — formatEUR, formatPct, colores por producto
- [x] Crear `app/frontend/lib/providers.tsx` — React Query QueryClientProvider

### Páginas y componentes creados

#### Dashboard principal (`app/page.tsx`) ✅
- [x] `components/KPICards.tsx` — 3 tarjetas: ARR actual, MoM €, MoM %
- [x] `components/ARRChart.tsx` — gráfico de líneas (recharts), una serie por línea de negocio
- [x] `components/ARRBreakdownTable.tsx` — tabla desglose por línea de negocio
- [x] `components/FilterBar.tsx` — filtros: línea de negocio, rango de fechas
- [x] `components/SyncButton.tsx` — botón "Actualizar SF" con spinner

#### Vista consultores (`app/consultants/page.tsx`) ✅
- [x] Tabla con ARR por consultor, ordenable por columna (nombre, ARR, MoM)
- [x] Fila expandible: clic → muestra desglose por línea de negocio
- [x] Filtro por país

#### Vista Stripe MRR (`app/stripe/page.tsx`) ✅
- [x] Tabla con mes, MRR, ARR equivalente, fecha de actualización
- [x] Botón "Editar" por fila → modal con input numérico
- [x] Botón "Añadir mes" para meses nuevos

#### Vista alertas (`app/alerts/page.tsx`) ✅
- [x] Lista de alertas agrupadas por tipo con colores por severidad
- [x] Botón "Marcar como revisada" + campo de nota
- [x] Enlace "Ir a config" para alertas UNCLASSIFIED_PRODUCT
- [x] Toggle para mostrar/ocultar revisadas

#### Vista configuración (`app/config/page.tsx`) ✅
- [x] Tabla de productos con clasificación, editable inline
- [x] Tabla de consultores con país, editable inline
- [x] Botón "Añadir producto" con formulario inline

#### Layout compartido (`app/layout.tsx`) ✅
- [x] Barra lateral con navegación entre vistas (activo por pathname)
- [x] Indicador "Última sync: fecha" en el header del dashboard
- [x] Badge de alertas pendientes en el header

### Criterios de aceptación de Fase C ✅
- [x] Dashboard carga y muestra ARR total y por línea de negocio para el último mes
- [x] Gráfico de líneas muestra evolución histórica (rango configurable, default 2021-hoy)
- [x] Los filtros modifican los datos del gráfico y la tabla
- [x] El botón de sync llama a `POST /api/sync` y recarga los datos al terminar
- [x] La app arranca con `npm run dev` sin errores
- [x] `npm run build` completa sin errores ni warnings de TypeScript

### Notas de implementación (Next.js 16 / React 19)
- Next.js 16 renombró `middleware.ts` → `proxy.ts`. Para proxy de API se usan `rewrites` en `next.config.ts`.
- Tailwind 4: no hay `tailwind.config.js`; usa `@import "tailwindcss"` en globals.css + `@theme` para variables.
- React 19: `React.FC` desaconsejado; se usan funciones normales con tipos inline.
- React Query v5: `useQuery` requiere `queryKey` y `queryFn` en un objeto (no argumentos posicionales).

---

## FASE D — Historial de snapshots en UI

> Leer: `docs/specs/10_versioning_and_snapshots.md`

- [ ] Página `/snapshots` con listado (fecha, ARR total, registros, alertas)
- [ ] Selector de snapshot activo: cambiar snapshot → todos los gráficos se actualizan
- [ ] Vista comparativa: seleccionar dos snapshots → tabla de diferencias
- [ ] El dashboard muestra el snapshot activo seleccionado (no siempre el más reciente)

---

## FASE E — Integración real con Salesforce

> Leer: `docs/specs/04_salesforce_integration_plan.md` y `docs/logs/salesforce_field_mapping.md`

**Pre-requisitos antes de empezar:**
1. Pedir al admin de SF que cree una Connected App con OAuth2
2. Verificar los nombres exactos de los campos custom en la instancia de isEazy:
   - `Subscription_Start_Date__c` (o el nombre real)
   - `Subscription_End_Date__c`
   - `Licence_Period_Months__c`
   - `Tipo_de_Producto_Correcto__c`
   - `Canal__c` o equivalente para channel_type
3. Ejecutar `python scripts/import_excel_data.py` y `python scripts/validate_vs_excel.py` para tener baseline

**Lo que hay que crear:**
- [ ] `app/backend/core/sf_extractor.py` — extractor real con `simple-salesforce`
  - Consulta SOQL para oportunidades ganadas con sus line items
  - Transforma campos SF → `RawLineItem` (mismo formato que el Excel importado)
- [ ] Sustituir el mock en `app/backend/api/routes/sync.py` por la llamada real al extractor
- [ ] `scripts/test_sf_connection.py` — verifica conexión + muestra 5 registros de muestra
- [ ] Documentar en `docs/logs/salesforce_field_mapping.md` los nombres reales verificados

**Criterio de aceptación:**
- ARR calculado desde SF difiere < 1% del ARR del Excel para el mismo periodo

---

## FASE F — Panel de alertas completo

*La API de alertas ya existe (Fase B). Falta la UI y que el panel sea prominente.*

- [ ] `AlertsPanel.tsx` visible en el dashboard si hay alertas no revisadas
- [ ] Badge con número de alertas en el header
- [ ] Página `/alerts` completa (ya descrita en Fase C, pero ampliar con filtros por tipo)
- [ ] Workflow: alerta → click → modal con descripción + enlace a configuración + campo de nota

---

## FASE G — Input Stripe en UI + vista consultor completa

*La API de Stripe y by-consultant ya existe (Fase B). Falta la UI.*

- [ ] Página `/stripe` con tabla editable de MRR mensual
- [ ] Alerta visible si el mes actual no tiene dato de Stripe
- [ ] Página `/consultants` con tabla expandible ordenable y exportable

---

## FASE H — Endurecimiento y producción

- [ ] `scripts/validate_vs_excel.py` pasa al 100% con la BD real
- [ ] Tests e2e básicos con Playwright o Cypress
- [ ] Loading states y mensajes de error claros en toda la UI
- [ ] Manejo de errores en la API: SF no disponible, timeout, datos corruptos
- [ ] Variables de entorno de producción documentadas
- [ ] README de usuario: cómo usar la app día a día

---

## Checklist de validación pendiente con el CFO

Estos assumptions están implementados pero no confirmados explícitamente:

- [ ] AS-01: Sin fecha inicio → usar close_date como proxy
- [ ] AS-02: Sin fecha fin → asumir 365 días
- [ ] AS-05: ARR Author Online = MRR_Stripe × 12
- [ ] AS-07: Renovaciones tratadas igual que nuevas oportunidades
- [ ] Q-05: ¿TaaS debe incluirse en el ARR SaaS? (actualmente excluido)
- [ ] Q-06: ¿Riesgo de doble conteo en renovaciones?
- [ ] Q-08: ¿Desde qué fecha son fiables los campos de suscripción en SF?

---

## Convención de handover entre agentes

**Al empezar una sesión:**
1. Leer `docs/handover/CURRENT_STATE.md`
2. Leer este archivo (`NEXT_STEPS.md`)
3. Leer el spec de la fase a implementar (listado en cada fase)

**Al terminar una sesión:**
1. Actualizar `CURRENT_STATE.md` con lo completado
2. Actualizar este archivo marcando tareas completadas
3. Añadir entrada en `docs/handover/SESSION_LOG.md`
4. Si se tomó alguna decisión importante, crear ADR en `docs/decisions/`
5. Hacer commit con mensaje descriptivo
