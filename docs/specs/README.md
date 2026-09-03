# Índice de especificaciones — ARR Command Center

**Última actualización:** 2026-09-03
**Código de referencia:** `main` @ `6404aed`

---

## Si tienes 20 minutos, lee esto en este orden

1. **[00_project_overview.md](./00_project_overview.md)** — qué es, en qué estado está, cómo está organizado el repo
2. **[02_business_context_arr.md](./02_business_context_arr.md)** — el negocio, el vocabulario y qué entendemos por ARR
3. **[19_calculation_reference.md](./19_calculation_reference.md)** — ⭐ **todas** las lógicas de cálculo (ARR, churn, retención, bridge, renovaciones, committed vs real, forecast). Es el documento maestro.
4. **[09_dashboard_and_reporting_draft.md](./09_dashboard_and_reporting_draft.md) §A y §B** — las 14 pantallas y el catálogo de endpoints
5. **[12_open_questions_and_risks.md](./12_open_questions_and_risks.md)** — lo que sigue abierto y los riesgos vivos

---

## Documentos vigentes

| Doc | Contenido | Estado |
|---|---|---|
| [00_project_overview.md](./00_project_overview.md) | Visión general, stack, estructura real de carpetas, flujo de datos extremo a extremo | ✅ vigente |
| [02_business_context_arr.md](./02_business_context_arr.md) | Contexto de negocio, líneas de producto, definición de ARR, vocabulario de churn, qué NO hace la app | ✅ vigente |
| **[19_calculation_reference.md](./19_calculation_reference.md)** | **Referencia de cálculo completa (documento maestro)** | ✅ vigente |
| [05_functional_requirements.md](./05_functional_requirements.md) | F-01 a F-33 con estado de implementación real | ✅ vigente |
| [07_data_model_draft.md](./07_data_model_draft.md) | Modelo de datos + delta de las 6 migraciones | ✅ vigente (la verdad es `db/models.py`) |
| [09_dashboard_and_reporting_draft.md](./09_dashboard_and_reporting_draft.md) | §A pantallas reales · §B endpoints · §C diseño original (histórico) | ✅ vigente |
| [12_open_questions_and_risks.md](./12_open_questions_and_risks.md) | Q-01..Q-14, riesgos técnicos y funcionales | ✅ vigente |
| [14_runtime_and_env_reference.md](./14_runtime_and_env_reference.md) | Variables de entorno y ejecución local | ✅ vigente |
| [15_release_and_smoke_checklist.md](./15_release_and_smoke_checklist.md) | Checklist de release | ✅ vigente |
| [16_manual_excel_template.md](./16_manual_excel_template.md) | Formato del Excel de carga manual | ✅ vigente |
| [17_railway_deploy.md](./17_railway_deploy.md) | Despliegue en Railway | ✅ vigente |
| [18_daily_sync_cron.md](./18_daily_sync_cron.md) | Cron de sincronización diaria | ✅ vigente |
| [../../DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) | Sistema de diseño visual completo | ✅ vigente |

## Documentos superados o históricos

| Doc | Por qué se conserva |
|---|---|
| [08_calculation_engine_draft.md](./08_calculation_engine_draft.md) | ⚠️ **Superado por el 19.** Se conserva porque documenta cómo se derivaron las reglas del Excel original. Lleva una tabla de divergencias frente al código actual. |
| [01_working_method_ai_handover.md](./01_working_method_ai_handover.md) | Metodología de trabajo con agentes |
| [03_excel_analysis_plan.md](./03_excel_analysis_plan.md) | Plan del análisis inicial del Excel (ejecutado) |
| [04_salesforce_integration_plan.md](./04_salesforce_integration_plan.md) | Plan de integración SF — sigue siendo la referencia para cuando haya credenciales |
| [06_non_functional_requirements.md](./06_non_functional_requirements.md) | Requisitos no funcionales del MVP |
| [10_versioning_and_snapshots.md](./10_versioning_and_snapshots.md) | Diseño del versionado (implementado) |
| [11_build_from_zero_guide.md](./11_build_from_zero_guide.md) | Guía de reconstrucción desde cero |
| [13_implementation_roadmap.md](./13_implementation_roadmap.md) | Roadmap original de fases A–H |

## Especificaciones incrementales por versión

Son las specs *de trabajo* de cada iteración: describen el diseño con el que se construyó cada
módulo. Útiles para entender **por qué** algo es como es; para saber **qué hace hoy**, usar el 19.

| Versión | Documentos | Aporte |
|---|---|---|
| V2 | [overview](./SPEC-V2-overview.md) · [P1 análisis por cliente](./SPEC-V2-phase1-client-analysis.md) · [P2 top 20](./SPEC-V2-phase2-main-top20.md) · [P3 agrupación BL](./SPEC-V2-phase3-bl-grouping.md) · [P4 ARR Expert](./SPEC-V2-phase4-arr-expert.md) | Análisis por cliente, top cuentas, agrupación de líneas, IA embebida |
| V3 | [overview](./SPEC-V3-overview.md) · [P1](./SPEC-V3-phase1-bl-math-fix.md) [P2](./SPEC-V3-phase2-nan-fix.md) [P3](./SPEC-V3-phase3-ytd-metrics.md) [P4](./SPEC-V3-phase4-top20-cleanup.md) [P5](./SPEC-V3-phase5-client-table.md) [P6](./SPEC-V3-phase6-consultants-level2.md) [P7](./SPEC-V3-phase7-excel-export.md) [P8](./SPEC-V3-phase8-code-review.md) | Corrección matemática de la agrupación, limpieza de NaN, comparativas puntuales, nivel 2 de consultores, exportación Excel |
| V4 | [overview](./SPEC-V4-overview.md) · [P1 revisor de snapshot](./SPEC-V4-phase1-snapshot-reviewer.md) · [P2 gágero](./SPEC-V4-phase2-gagero.md) · [P3 churn](./SPEC-V4-phase3-churn.md) · [P4 renovaciones](./SPEC-V4-phase4-renewal-monitor.md) | Los cuatro módulos analíticos principales |
| V5 | [overview](./SPEC-V5-overview.md) · [P1 committed vs real](./SPEC-V5-phase1-committed-vs-real.md) | Delta entre firmado y en servicio |
| V6 | [consolidación por cuenta principal](./SPEC-V6-parent-account-consolidation.md) | Identidad de cliente por grupo empresarial |

---

## Otras carpetas de documentación

| Carpeta | Contenido |
|---|---|
| [../decisions/](../decisions/) | ADR-001 (replicar el Excel en el MVP) · ADR-002 (Salesforce + Stripe) · ADR-003 (stack) |
| [../logs/](../logs/) | Análisis forense del Excel original: [fórmulas](../logs/excel_formula_logic.md), [reglas de negocio](../logs/excel_business_rules_catalog.md), [assumptions](../logs/excel_assumptions_catalog.md), [casos límite](../logs/excel_edge_cases.md), [inventario de hojas](../logs/excel_sheet_inventory.md), [mapeo de campos SF](../logs/salesforce_field_mapping.md) |
| [../handover/](../handover/) | [CURRENT_STATE.md](../handover/CURRENT_STATE.md), [NEXT_STEPS.md](../handover/NEXT_STEPS.md), [SESSION_LOG.md](../handover/SESSION_LOG.md) — **desactualizados a 2026-05-27** (llegan hasta V4-P4; V4.5, V5 y V6 no están reflejados) |

---

## Convención de mantenimiento

- Un cambio en la **lógica de cálculo** obliga a actualizar
  [19_calculation_reference.md](./19_calculation_reference.md). Es la única fuente de verdad
  funcional del cálculo.
- Un módulo o pantalla nueva obliga a actualizar
  [05_functional_requirements.md](./05_functional_requirements.md) (tabla de estado) y
  [09_dashboard_and_reporting_draft.md](./09_dashboard_and_reporting_draft.md) §A/§B.
- Un cambio de schema obliga a una migración Alembic y a actualizar el delta en
  [07_data_model_draft.md](./07_data_model_draft.md).
- Las specs `SPEC-Vx-*` **no se editan** una vez implementadas: son el registro de la decisión
  tomada en su momento.
