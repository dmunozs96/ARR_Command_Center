# ARR Command Center — Visión General del Proyecto
**Versión:** 1.1
**Fecha original:** 2026-04-17
**Última actualización:** 2026-09-03

---

## Qué es este proyecto

El **ARR Command Center** es una aplicación web para calcular, visualizar y gestionar el ARR (Annual Recurring Revenue) de isEazy.

Antes, el ARR se calculaba manualmente en un Excel complejo alimentado por exportaciones de Salesforce. Este proyecto construye una aplicación que:
1. Ingesta los datos de oportunidades (hoy por carga de Excel; el conector de Salesforce está implementado y a la espera de credenciales).
2. Replica la lógica de cálculo del Excel de forma reproducible y auditable.
3. Muestra dashboards con el ARR por línea de negocio, cliente, consultor, país y periodo.
4. Guarda historial de snapshots inmutables para auditoría y comparativa.
5. Analiza churn y retención, variaciones (Gágero), renovaciones, gap entre firmado y en servicio, y forecast de base instalada.

---

## Estado actual (2026-09-03)

Aplicación **en producción en Railway**, con 14 pantallas y 6 módulos analíticos.
Versión de la app: `v0.9.0`. Código de referencia de esta documentación: `main` @ `6404aed`.

| Área | Estado |
|---|---|
| Motor de cálculo ARR | ✅ Completo, replicando el Excel |
| Ingesta por carga de Excel | ✅ Vía operativa actual |
| Ingesta por API de Salesforce | 🟡 Implementada y testeada, **sin credenciales** |
| Dashboard, clientes, consultores | ✅ |
| Snapshots + Revisor A/B | ✅ |
| Alertas de calidad de dato | ✅ |
| Author Online vía Stripe | 🟡 Input manual (integración API pendiente) |
| Gágero (puente de ARR) | ✅ |
| Churn y retención | ✅ |
| Renovaciones | ✅ |
| Base Instalada Predictiva | ✅ |
| Committed vs Real | ✅ |
| Consolidación por grupo empresarial | ✅ (V6) |
| ARR Expert (IA) | ✅ |
| Autenticación | ⛔ Control a nivel de despliegue |

**Verificación:** 70+ tests backend (`pytest`), TypeScript y ESLint limpios, 6 smoke tests e2e (Playwright).

### Dónde está documentado qué

| Necesito… | Documento |
|---|---|
| Entender el negocio y el vocabulario | [02_business_context_arr.md](./02_business_context_arr.md) |
| **Todas las lógicas de cálculo (ARR, churn, …)** | **[19_calculation_reference.md](./19_calculation_reference.md)** |
| Inventario funcional y estado | [05_functional_requirements.md](./05_functional_requirements.md) |
| Pantallas, navegación y endpoints | [09_dashboard_and_reporting_draft.md](./09_dashboard_and_reporting_draft.md) |
| Sistema visual | [../../DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) |
| Modelo de datos | [07_data_model_draft.md](./07_data_model_draft.md) |
| Riesgos y decisiones pendientes | [12_open_questions_and_risks.md](./12_open_questions_and_risks.md) |
| Despliegue y entorno | [17_railway_deploy.md](./17_railway_deploy.md), [14_runtime_and_env_reference.md](./14_runtime_and_env_reference.md) |
| Índice completo | [README.md](./README.md) |

---

## Arquitectura recomendada

### Stack tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Backend / API | Python + FastAPI | Python tiene excelente soporte para cálculos numéricos; FastAPI es moderno, rápido de desarrollar y muy bien documentado |
| Motor de cálculo | Python puro | La lógica de ARR es cálculo sobre datos, sin dependencias especiales |
| Base de datos | PostgreSQL | Relacional (los datos son relacionales), JSONB para datos flexibles, gratis y ampliamente soportado |
| ORM | SQLAlchemy | Estándar de facto en Python |
| Migrations BD | Alembic | Herramienta estándar para gestionar versiones del schema |
| Frontend | React + Next.js | Moderno, gran ecosistema, buen soporte para dashboards |
| Gráficos | Recharts (o Chart.js) | Ligero, React-native, fácil de usar |
| Conexión SF | simple-salesforce (Python) | Librería madura para SF API |
| Autenticación (V2) | NextAuth.js | Simple de integrar con Next.js |
| Despliegue local | Docker Compose | Levanta backend + BD + frontend con un comando |

### Alternativas descartadas
- **Django:** Más pesado que FastAPI para una API, curva de aprendizaje mayor.
- **Node.js/Express:** Python tiene mejor ecosistema para cálculos numéricos/pandas.
- **SQLite:** No apto para producción; PostgreSQL es más robusto.
- **Vue/Angular:** React tiene mayor comunidad y más soporte en herramientas IA.
- **Streamlit:** Rápido de hacer pero limitado para dashboards productivos complejos.

---

## Estructura de carpetas del proyecto (real, 2026-09-03)

```
ARR_Command_Center/
├── app/
│   ├── backend/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── arr.py              # /api/arr — ARR mensual, por cuenta, por consultor, line items
│   │   │   │   ├── churn.py            # /api/churn — retención (2 familias de métricas)
│   │   │   │   ├── gagero.py           # /api/gagero — puente de variaciones + NÚCLEO de movimientos
│   │   │   │   ├── renewals.py         # /api/renewals — monitor de vencimientos
│   │   │   │   ├── delta.py            # /api/delta — Committed vs Real
│   │   │   │   ├── snapshot_review.py  # /api/snapshot-review — comparativa A/B
│   │   │   │   ├── snapshots.py        # /api/snapshots
│   │   │   │   ├── imports.py          # /api/imports — carga de Excel y de maestros
│   │   │   │   ├── sync.py             # /api/sync — Salesforce + cron diario
│   │   │   │   ├── stripe.py           # /api/stripe-mrr — Author Online
│   │   │   │   ├── alerts.py           # /api/alerts — calidad de dato
│   │   │   │   ├── config.py           # /api/config — maestros
│   │   │   │   ├── exports.py          # /api/exports — Excel de snapshot
│   │   │   │   └── expert.py           # /api/expert — ARR Expert (IA)
│   │   │   └── schemas.py              # TODOS los schemas Pydantic (~590 líneas)
│   │   ├── core/
│   │   │   ├── arr_calculator.py       # ★ Motor de cálculo ARR por línea de producto
│   │   │   ├── client_identity.py      # ★ Consolidación por grupo empresarial (V6)
│   │   │   ├── excel_importer.py       # Pipeline de carga de Excel (vía operativa)
│   │   │   ├── sf_extractor.py         # Extracción desde Salesforce
│   │   │   ├── snapshot_manager.py     # Persistencia de un run + hash de dedup
│   │   │   ├── alert_checker.py        # Solapamientos y resumen de calidad
│   │   │   └── excel_exporter.py       # Exportación auditable a .xlsx
│   │   ├── db/
│   │   │   ├── models.py               # Modelos SQLAlchemy (fuente de verdad del schema)
│   │   │   ├── connection.py
│   │   │   └── migrations/versions/    # 0001 … 0006
│   │   ├── config/settings.py
│   │   └── main.py                     # Entry point FastAPI + CORS + registro de routers
│   │
│   └── frontend/                       # Next.js App Router
│       ├── app/
│       │   ├── page.tsx                # / Dashboard
│       │   ├── clients/                # /clients
│       │   ├── snapshots/              # /snapshots
│       │   ├── snapshot-review/        # /snapshot-review
│       │   ├── gagero/                 # /gagero
│       │   ├── churn/                  # /churn
│       │   ├── cohort-retention/       # /cohort-retention (Base Instalada Predictiva)
│       │   ├── committed-vs-real/      # /committed-vs-real
│       │   ├── renewals/               # /renewals
│       │   ├── consultants/            # /consultants
│       │   ├── stripe/                 # /stripe
│       │   ├── alerts/                 # /alerts
│       │   ├── config/                 # /config
│       │   ├── expert/                 # /expert
│       │   └── layout.tsx
│       ├── components/                 # ~35 componentes (Sidebar, KPICards, gráficos, tablas…)
│       ├── lib/
│       │   ├── api.ts                  # Cliente HTTP único
│       │   ├── types.ts                # Tipos TypeScript espejo de los schemas
│       │   ├── utils.ts                # Formateo EUR/fechas, agrupación de líneas de negocio
│       │   ├── constants.ts            # Líneas de negocio y paletas
│       │   ├── snapshot-context.tsx    # Snapshot activo
│       │   ├── arr-mode-context.tsx    # Modo desde inicio / desde cierre
│       │   ├── analysis-filters-context.tsx  # Filtros globales del sidebar
│       │   └── bl-grouping-context.tsx # Agrupación LMS+AIO / Author
│       └── tests/e2e/                  # Playwright
│
├── data_samples/
│   ├── raw_excel/                      # Excel original de referencia
│   ├── exports_salesforce_mock/        # Mock de datos SF para desarrollo
│   └── expected_outputs/               # Outputs esperados para validación cruzada
│
├── docs/
│   ├── specs/                          # Especificaciones (ver README.md de esa carpeta)
│   ├── decisions/                      # ADR-001..003
│   ├── logs/                           # Análisis del Excel original y auditorías
│   └── handover/                       # Estado, siguientes pasos, log de sesiones
│
├── tests/                              # pytest — 70+ tests
│   ├── test_arr_calculator.py
│   ├── test_client_identity.py
│   ├── test_salesforce_extractor.py
│   └── test_api.py
│
├── scripts/
│   ├── import_excel_data.py            # Carga del Excel por CLI
│   ├── validate_vs_excel.py            # Comparar output de la app vs Excel
│   ├── compare_monthly_arr.py          # Diff de ARR mensual entre fuentes
│   ├── analyze_desde_cierre.py         # Análisis del modo "desde cierre"
│   ├── beta_report.py
│   ├── test_sf_connection.py           # Diagnóstico de credenciales SF
│   └── deploy_railway.ps1
│
├── DESIGN_SYSTEM.md                    # Sistema de diseño visual
├── Dockerfile.backend / Dockerfile.frontend
├── railway.json
├── docker-compose.yml
├── .env.example
└── README.md
```

★ = ficheros donde vive la lógica de cálculo crítica.

**Diferencias frente al borrador de abril:** el frontend usa el **App Router** de Next.js
(`app/`), no `pages/`; hay 14 routers de API en vez de 4; se añadieron `client_identity.py`,
`excel_importer.py` y `excel_exporter.py`; y no existe `config/product_types.py` (los tipos de
producto viven en la tabla maestra `product_classifications`, editable en la UI).

---

## Flujo de datos extremo a extremo

**Vía A — carga manual de Excel (operativa hoy):**

```
Excel exportado de Salesforce (.xlsx)
  → [Excel Importer]  hoja "Opos con Productos" → filas crudas
                      hojas "Productos SF SAAS" / "País Consultor" → upsert de maestros
                      hoja de métricas de Stripe → snapshot_stripe_mrr
                                                    (si no viene, se hereda del snapshot anterior)
  → [Client Identity] resuelve client_name = raíz del grupo empresarial
                      → alerta PARENT_ACCOUNT_CONFLICT si una cuenta tiene dos padres
  → raw_opportunity_line_items
  → [ARR Calculator]  clasifica producto, resuelve fechas, anualiza → arr_line_items
                      + flags de calidad → snapshot_alerts
  → arr_monthly_summary (agregado; solo se usa para resolver "último mes disponible")
  → snapshot.status = "completed"
```

**Vía B — sincronización con Salesforce (implementada, sin credenciales):**

```
Salesforce
  → [SF Extractor] consulta SOQL → líneas crudas
  → hash SHA-256 de los datos; si coincide con el último snapshot → SKIP (no crea snapshot)
  → [Snapshot Manager] → raw_opportunity_line_items
  → [ARR Calculator] → arr_line_items + snapshot_alerts
  → [Alert Checker] detecta solapamientos → alertas OVERLAPPING_CONTRACTS
  → arr_monthly_summary → snapshot.status = "completed"
```

**Consulta y gobierno:**

```
Usuario
  → [Frontend] fija snapshot + modo ARR (desde inicio / desde cierre) + filtros en el sidebar
  → [FastAPI] RECALCULA EN VIVO desde arr_line_items (no lee agregados precocinados,
              así respeta las exclusiones manuales)
  → [Frontend] dashboard, clientes, consultores, churn, gágero, renovaciones,
               committed vs real, forecast

Usuario
  → [Frontend] introduce el ARR de Author Online (Stripe) por mes
  → [FastAPI] snapshot_stripe_mrr → se suma como línea "Author Online" del ARR total

Usuario
  → [Frontend] marca una línea como excluida del ARR (típicamente por solapamiento)
  → [FastAPI] arr_line_items.excluded_from_arr = true
  → TODOS los módulos analíticos dejan de contarla, sin tocar Salesforce

Usuario
  → [Frontend] edita la clasificación de productos o el país de un consultor
  → [FastAPI] product_classifications / consultant_countries
  → Aplica al PRÓXIMO snapshot (no recalcula los existentes: son inmutables)
```

Detalle exhaustivo de cada paso en
[19_calculation_reference.md](./19_calculation_reference.md).

---

## Modelo de datos simplificado (entidades principales)

```
snapshots (1) → (N) raw_opportunity_line_items
snapshots (1) → (N) arr_line_items
snapshots (1) → (N) arr_monthly_summary
snapshots (1) → (N) snapshot_alerts
snapshots (1) → (N) snapshot_stripe_mrr

arr_line_items (N) → (1) raw_opportunity_line_items

# Tablas maestras (independientes de snapshots)
product_classifications  (producto → tipo → is_saas)
consultant_countries     (consultor → país)
```

Ver `docs/specs/07_data_model_draft.md` para el esquema SQL completo.

---

## Cómo testear

1. **Tests unitarios del motor de cálculo:**  
   Entrada: line item con datos conocidos → verificar que `annualized_value` coincide con el Excel.

2. **Tests de integración:**  
   Mock de Salesforce → sincronización completa → verificar snapshot generado.

3. **Validación cruzada con Excel:**  
   Script `scripts/validate_vs_excel.py` compara el output de la app con el Excel para el mismo dataset.  
   Criterio de paso: diferencia < 0.01€ por línea.

4. **Tests de regresión:**  
   Cada nueva versión debe pasar los mismos tests de validación cruzada.

---

## ADR relacionados

- [ADR-001](../decisions/ADR-001_arr_calculation_base.md) — Replicar Excel fielmente en MVP
- [ADR-002](../decisions/ADR-002_dual_data_source.md) — Salesforce + Stripe manual en V1
- [ADR-003](../decisions/ADR-003_tech_stack.md) — Stack: Python/FastAPI + PostgreSQL + React/Next.js
