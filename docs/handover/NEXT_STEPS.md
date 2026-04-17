# Next Steps
**Última actualización:** 2026-04-17

---

## Estado: Fase B completada — Empezar por Fase C

La especificación está completa. No hay más documentación pendiente.  
El siguiente agente (Claude Code o Codex) debe implementar la **Fase A**.

---

## FASE A — Checklist de implementación

> Leer antes de empezar: `docs/specs/08_calculation_engine_draft.md` y `docs/specs/07_data_model_draft.md`

### Infraestructura base
- [x] Crear `docker-compose.yml` con servicio PostgreSQL (puerto 5432, usuario: arruser, contraseña: arrpass, BD: arrdb)
- [x] Crear `.env.example` con todas las variables (DATABASE_URL, SF_CLIENT_ID, SF_CLIENT_SECRET, SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN, SF_INSTANCE_URL)
- [x] Crear estructura de carpetas completa (ver `docs/specs/00_project_overview.md` sección "Estructura de carpetas")

### Backend Python
- [x] `app/backend/requirements.txt` con: fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, python-dotenv, simple-salesforce, pytest, httpx, openpyxl
- [x] `app/backend/db/models.py` — modelos SQLAlchemy (snapshots, raw_opportunity_line_items, arr_line_items, arr_monthly_summary, snapshot_alerts, snapshot_stripe_mrr, product_classifications, consultant_countries)
- [x] `app/backend/db/connection.py` — conexión a PostgreSQL con pool
- [x] Alembic init + primera migración con el schema completo
- [x] `app/backend/core/arr_calculator.py` — motor de cálculo ARR completo
- [x] `app/backend/core/alert_checker.py` — validaciones básicas (producto no clasificado, duración anómala)
- [x] `app/backend/config/settings.py` — carga de variables de entorno

### Scripts de validación
- [x] `scripts/import_excel_data.py` — lee `data_samples/raw_excel/ARR Oportunidad.xlsx` y carga los datos como si fueran una sync de SF (crea un snapshot de tipo "excel_import")
- [x] `scripts/validate_vs_excel.py` — compara el ARR calculado por la app con el del Excel para cada mes y tipo de producto; reporta diferencias

### Tests unitarios
- [x] `tests/test_arr_calculator.py` con 17 tests (todos pasan):
  - Line item con fechas completas: verifica annualized_value correcto
  - Line item sin fecha inicio: verifica que usa close_date
  - Line item sin fecha fin: verifica que usa start+365
  - Line item con producto no SaaS: verifica que is_saas=False y se excluye del ARR
  - Line item con producto no clasificado: verifica que genera alerta UNCLASSIFIED
  - ARR mensual: verifica solapamiento correcto (activo/inactivo por mes)
  - Paridad con Excel: 3 oportunidades conocidas del Excel

### Criterio de aceptación de Fase A
- [x] Todos los tests unitarios pasan (`pytest tests/` → 17/17)
- [ ] `scripts/validate_vs_excel.py` pasa con diferencia < 0.01€ por línea ← **requiere docker-compose up + alembic upgrade head + import_excel_data.py**
- [ ] La BD se levanta con `docker-compose up -d` sin errores ← ejecutar manualmente
- [ ] `alembic upgrade head` crea todas las tablas sin errores ← ejecutar manualmente

---

## FASE B — Backend API (después de Fase A) ✅ COMPLETADA

> Leer antes de empezar: `docs/specs/09_dashboard_and_reporting_draft.md` (sección de endpoints)

- [x] `app/backend/main.py` — servidor FastAPI con CORS configurado
- [x] `app/backend/api/schemas.py` — todos los modelos Pydantic
- [x] `app/backend/api/routes/arr.py` — endpoints GET /api/arr/summary, GET /api/arr/by-consultant, GET /api/arr/line-items
- [x] `app/backend/api/routes/snapshots.py` — GET /api/snapshots, GET /api/snapshots/{id}
- [x] `app/backend/api/routes/sync.py` — POST /api/sync (mock: copia snapshot existente)
- [x] `app/backend/api/routes/config.py` — CRUD tablas maestras (products, consultants)
- [x] `app/backend/api/routes/stripe.py` — GET/PUT /api/stripe-mrr
- [x] `app/backend/api/routes/alerts.py` — GET /api/alerts, PATCH /api/alerts/{id}
- [x] `app/backend/core/snapshot_manager.py` — creación completa de snapshot
- [x] `tests/test_api.py` — 21 tests de endpoints (SQLite in-memory, sin Docker)
- [x] `conftest.py` — root conftest para tests sin BD real

Criterio: 21/21 tests de API pasan + 17/17 tests de calculadora = 38/38 total.

---

## FASE C — Frontend (después de Fase B)

> Leer antes de empezar: `docs/specs/09_dashboard_and_reporting_draft.md` (wireframes)

- [ ] `app/frontend/` — proyecto Next.js inicializado con TypeScript
- [ ] Dashboard principal con gráfico de líneas ARR y tabla de desglose
- [ ] Filtros básicos (línea de negocio, rango de fechas)
- [ ] Botón de sincronización con indicador de estado
- [ ] Conexión a la API funcionando

---

## FASES D–H

Ver `docs/specs/13_implementation_roadmap.md` para el detalle completo.

---

## Convención de handover entre agentes

Al **empezar** una sesión:
1. Leer `docs/handover/CURRENT_STATE.md`
2. Leer este archivo (`NEXT_STEPS.md`)
3. Leer el documento de spec de la fase a implementar

Al **terminar** una sesión:
1. Actualizar `docs/handover/CURRENT_STATE.md` con lo completado
2. Actualizar este archivo tachando las tareas completadas
3. Añadir entrada en `docs/handover/SESSION_LOG.md`
4. Si se tomó alguna decisión importante, crear ADR en `docs/decisions/`
5. Hacer commit con mensaje descriptivo

---

## Checklist de validación pendiente con el CFO

Estos assumptions están implementados en el motor pero el CFO aún no los ha confirmado explícitamente:

- [ ] AS-01: Sin fecha inicio → usar close_date como proxy *(implementado en Excel, pendiente confirmación)*
- [ ] AS-02: Sin fecha fin → asumir 365 días *(implementado en Excel, pendiente confirmación)*
- [ ] AS-03: ARR = precio_diario × 365 *(implementado en Excel, confirmado implícitamente)*
- [ ] AS-04: Normalización mensual sin prorrateo diario *(implementado en Excel)*
- [ ] AS-05: ARR Author Online = MRR_Stripe × 12 *(implementado en Excel)*
- [ ] AS-07: Renovaciones tratadas igual que nuevas oportunidades
- [ ] Q-05: ¿TaaS debe incluirse en el ARR SaaS? *(actualmente excluido)*
- [ ] Q-06: ¿Riesgo de doble conteo en renovaciones?
- [ ] Q-08: ¿Cuál es la fecha de adopción de campos de suscripción en SF? (para saber desde cuándo los datos son fiables)
