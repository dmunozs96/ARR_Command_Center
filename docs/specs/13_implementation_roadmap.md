# Plan de Implementación Iterativo
**Versión:** 1.0
**Fecha:** 2026-04-17

Este roadmap divide el proyecto en fases incrementales, cada una con entregable funcional propio.  
Cada fase puede ser ejecutada por Claude Code, Codex o ambos en sesiones sucesivas.

---

## Resumen de fases

| Fase | Nombre | Objetivo principal | Duración estimada |
|------|--------|-------------------|-------------------|
| A | Fundamentos y validación | Setup completo + motor de cálculo validado | 1-2 sesiones |
| B | Backend base | API funcional con datos mock | 2-3 sesiones |
| C | Frontend base | Dashboard mínimo funcional | 2-3 sesiones |
| D | Snapshots y persistencia | Sistema de versionado completo | 1-2 sesiones |
| E | Integración Salesforce real | Sync real con SF en un click | 1-2 sesiones |
| F | Alertas y calidad de datos | Sistema de alertas automatizado | 1 sesión |
| G | Stripe manual y consultor | Input Stripe + vista por consultor | 1 sesión |
| H | Endurecimiento y tests | Tests, validación cruzada, UX | 1-2 sesiones |

---

## FASE A — Fundamentos y validación del motor

### Objetivo
Tener el motor de cálculo ARR funcionando y validado contra el Excel antes de construir nada más.

### Entregables
1. Estructura de carpetas del proyecto creada (`app/backend/`, `app/frontend/`, etc.).
2. `docker-compose.yml` con PostgreSQL configurado.
3. `app/backend/core/arr_calculator.py` — motor de cálculo completo.
4. `app/backend/db/models.py` — modelos SQLAlchemy completos.
5. `scripts/import_excel_data.py` — importador del Excel como mock de SF.
6. `scripts/validate_vs_excel.py` — validador de paridad con el Excel.
7. Schema SQL inicializado con Alembic.
8. Tests unitarios del motor: `tests/test_arr_calculator.py`.
9. `.env.example` con todas las variables necesarias.

### Criterios de aceptación
- `scripts/validate_vs_excel.py` pasa con diferencia < 0.01€ por línea.
- Todos los tests unitarios pasan.
- La BD se puede levantar con `docker-compose up -d`.

### Dependencias
- Ninguna (es la fase inicial).

### Riesgos
- Diferencias de redondeo entre Python y Excel (usar `round()` con precisión adecuada).
- El import del Excel puede requerir ajustes si el formato cambia.

### Qué puede hacer Claude Code
Todo. Es código Python puro sin integraciones externas.

### Qué puede continuar Codex
Revisión de los tests y del motor de cálculo una vez Claude Code lo genera.

---

## FASE B — Backend base con mock data

### Objetivo
API FastAPI funcional que expone los datos ARR calculados a partir del Excel importado.

### Entregables
1. `app/backend/main.py` — servidor FastAPI.
2. `app/backend/api/routes/arr.py` — endpoints de consulta ARR.
3. `app/backend/api/routes/snapshots.py` — endpoints de snapshots.
4. `app/backend/api/routes/config.py` — endpoints de tablas maestras.
5. `app/backend/core/snapshot_manager.py` — creación de snapshots.
6. `tests/test_api.py` — tests de endpoints.
7. `data_samples/exports_salesforce_mock/` — datos mock de SF para tests.

### Criterios de aceptación
- `GET /api/arr/summary?month=2026-01-01` devuelve el ARR correcto.
- `GET /api/snapshots` lista los snapshots.
- Los tests de API pasan.
- El endpoint `POST /api/sync` con datos mock crea un snapshot completo.

### Dependencias
- Fase A completada.

### Qué puede hacer Claude Code
Generación del código del backend. Configuración de FastAPI y SQLAlchemy.

---

## FASE C — Frontend base

### Objetivo
Dashboard mínimo en el navegador que muestra el ARR de la compañía con el gráfico y la tabla de desglose.

### Entregables
1. `app/frontend/` con proyecto Next.js inicializado.
2. `app/frontend/pages/index.tsx` — dashboard principal.
3. `app/frontend/components/ARRChart.tsx` — gráfico de líneas temporal.
4. `app/frontend/components/ARRTable.tsx` — tabla de desglose por línea de negocio.
5. `app/frontend/components/FilterBar.tsx` — filtros básicos.
6. Conexión al backend funcionando.

### Criterios de aceptación
- El dashboard carga y muestra el ARR total y por línea de negocio.
- El gráfico muestra la evolución mensual.
- Los filtros funcionan (al menos por línea de negocio y rango de fechas).

### Dependencias
- Fase B completada.

### Qué puede hacer Claude Code / Codex
Generación de componentes React. Integración con la API.

---

## FASE D — Snapshots y persistencia completa

### Objetivo
El sistema de versionado funciona: cada sync crea un snapshot, se puede ver el historial, se puede comparar.

### Entregables
1. Vista de historial de snapshots en el frontend.
2. Comparativa entre dos snapshots.
3. Snapshot activo seleccionable para el dashboard.
4. Log de sincronización visible.

### Criterios de aceptación
- Se puede seleccionar cualquier snapshot histórico y ver el ARR de ese momento.
- La comparativa entre dos snapshots muestra diferencias de ARR y de line items.

### Dependencias
- Fases A, B, C completadas.

---

## FASE E — Integración real con Salesforce

### Objetivo
El botón "Actualizar desde Salesforce" hace una sync real contra SF y crea un snapshot.

### Entregables
1. `app/backend/core/sf_extractor.py` — extractor real de SF.
2. Configuración de OAuth2 para SF.
3. `POST /api/sync` invoca extracción real de SF.
4. Documentación del setup de Connected App en SF.
5. Test de conexión: `scripts/test_sf_connection.py`.

### Pre-requisitos
- Credenciales de Salesforce disponibles (Connected App creada por admin).
- Verificación del mapeo de campos (ver `docs/logs/salesforce_field_mapping.md`).

### Criterios de aceptación
- El botón de sync lanza una extracción real de SF.
- Los datos extraídos producen el mismo ARR que el Excel para el mismo periodo.
- Diferencia máxima con el Excel: < 1% del ARR total.

### Dependencias
- Todas las fases anteriores + credenciales SF.

### Riesgos
- Campos SF con nombres distintos a los esperados.
- Límites de API de SF.
- Datos de SF distintos al Excel por actualizaciones recientes.

---

## FASE F — Alertas y calidad de datos

### Objetivo
El sistema detecta automáticamente problemas en los datos y los muestra al usuario.

### Entregables
1. `app/backend/core/alert_checker.py` — módulo de alertas.
2. `app/frontend/components/AlertsPanel.tsx` — panel de alertas en la UI.
3. Endpoint `GET /api/alerts` + `PATCH /api/alerts/{id}`.
4. Las alertas se crean automáticamente en cada sync.

### Criterios de aceptación
- Se detectan todos los tipos de alerta de la lista (productos no clasificados, duraciones anómalas, etc.).
- El usuario puede marcar alertas como revisadas con una nota.

---

## FASE G — Input Stripe + Vista consultor

### Objetivo
ARR completo con Author Online + vista de ARR por consultor.

### Entregables
1. UI para introducir MRR Stripe por mes.
2. Vista de ARR por consultor (tabla expandible).
3. `app/backend/api/routes/stripe.py`.
4. `app/frontend/pages/consultants.tsx`.

### Criterios de aceptación
- El usuario puede introducir/editar el MRR de Stripe para cada mes.
- La vista de consultor coincide con la hoja "Consultor Activos + Línea" del Excel.

---

## FASE H — Endurecimiento, tests y UX

### Objetivo
La app está lista para uso productivo diario.

### Entregables
1. Suite de tests completa (unit + integration + e2e básico).
2. Script de validación cruzada con el Excel pasa al 100%.
3. Manejo de errores completo (Salesforce no disponible, datos corruptos, etc.).
4. Loading states y mensajes de error claros en la UI.
5. Documentación de usuario básica (cómo usar la app día a día).
6. Vista de configuración completa (tablas maestras editables).
7. Log de auditoría visible.

### Criterios de aceptación
- `scripts/validate_vs_excel.py` pasa con diferencia < 0.01€ para el dataset completo.
- El CFO puede usar la app sin asistencia técnica para las operaciones habituales.
- No hay errores no manejados visibles al usuario.

---

## Plan de sesiones de trabajo con IA

Cada sesión de Claude Code o Codex debe:
1. Leer `docs/handover/CURRENT_STATE.md` al inicio.
2. Trabajar en la fase indicada como "siguiente".
3. Actualizar `CURRENT_STATE.md`, `NEXT_STEPS.md` y `SESSION_LOG.md` al terminar.

**Convenio de handover Claude Code ↔ Codex:**
- Claude Code: preferido para análisis, especificaciones, arquitectura inicial, y código Python.
- Codex: preferido para generación masiva de código, refactoring, y completar componentes.
- Ambos pueden trabajar en cualquier fase; lo importante es leer el estado antes de empezar.

---

## Criterios de "listo para producción"

El proyecto está listo para uso productivo cuando:
- [ ] Fase A-H completadas.
- [ ] `validate_vs_excel.py` pasa al 100%.
- [ ] El CFO ha validado los números contra el Excel en un periodo de 3 meses.
- [ ] Las alertas de calidad de datos no tienen ítems críticos sin revisar.
- [ ] El proceso de sync y uso del dashboard está documentado para el usuario.
