# Current State
**Última actualización:** 2026-04-17
**Agente:** Claude Code

---

## Objetivo del proyecto
Construir una aplicación web para calcular, visualizar y versionar el ARR de isEazy, replicando la lógica actual del Excel y conectándose con Salesforce (y Stripe para Author Online).

---

## Estado actual
**Especificación completa. Listo para comenzar la implementación (Fase A del roadmap).**

- ✅ Fase 1: Análisis del Excel completado y documentado.
- ✅ Fase 2: Requisitos funcionales y no funcionales documentados.
- ✅ Fase 3: Plan de integración Salesforce documentado.
- ✅ Fase 4: Arquitectura y modelo de datos definidos. Stack: Python/FastAPI + PostgreSQL + React/Next.js.
- ✅ Fase 5: Guía de construcción desde cero documentada.
- ✅ Fase 6: Roadmap de implementación por fases (A–H) documentado.
- ✅ Preguntas Q-01 (Variable Invoicing), Q-02 (Stripe), Q-04 (moneda) resueltas por el CFO.

---

## Última fase completada
**Fases 1–6 — Análisis Excel + Especificación completa** (2026-04-17)

Hallazgos clave:
1. El ARR se calcula como `(precio_real / días_periodo_normalizado) × 365` por cada line item SaaS.
2. Hay DOS fuentes de datos: Salesforce (mayoría) + Stripe (isEazy Author Online).
3. La clasificación SaaS vs no-SaaS depende de un VLOOKUP a una tabla maestra `Productos SF SAAS`.
4. Existen fallbacks para fechas vacías: sin inicio → usar close_date; sin fin → asumir 365 días.
5. El "ARR desde close won" NO está implementado en los resúmenes del Excel (solo preparado en columnas auxiliares).
6. Hay excepciones documentadas informalmente en la hoja `BBDD-->` (Virto, 9-meses/12-meses).

---

## Decisiones tomadas
- **ADR-001:** Replicar la lógica del Excel fielmente en el MVP (con flags para mejoras futuras).
- **ADR-002:** MVP usa Salesforce automático + Stripe como input manual. Post-MVP: evaluar Stripe API.
- Enfoque spec-driven development: documentar antes de construir.
- Todo el estado del proyecto persiste en archivos del repo.

---

## Archivos clave a leer antes de continuar

### Para entender la lógica de negocio:
1. `docs/logs/excel_formula_logic.md` — Todas las fórmulas con explicación
2. `docs/logs/excel_business_rules_catalog.md` — RN / WA / PM / DD clasificados
3. `docs/logs/excel_assumptions_catalog.md` — Supuestos implícitos
4. `docs/logs/excel_edge_cases.md` — Casos especiales

### Para entender la arquitectura del cálculo:
5. `docs/specs/08_calculation_engine_draft.md` — Motor de cálculo especificado en pseudocódigo

### Para entender qué falta/preguntas abiertas:
6. `docs/specs/12_open_questions_and_risks.md` — Preguntas para el negocio + riesgos
7. `docs/specs/03_excel_analysis_plan.md` — Resumen del análisis con hallazgos

### Para decisiones tomadas:
8. `docs/decisions/ADR-001_arr_calculation_base.md`
9. `docs/decisions/ADR-002_dual_data_source.md`

---

## Riesgos abiertos más importantes
1. **Q-01:** ¿Cómo tratar "SAAS - Variable Invoicing"? (1.103 line items sin lógica clara)
2. **Q-02:** ¿Stripe se automatiza o se gestiona manualmente?
3. **Q-03:** ¿Cuándo y cómo implementar "ARR desde close won"?
4. **RT-02:** Tabla de clasificación de productos puede quedarse desactualizada.
5. **Excepciones manuales** no automatizadas (Virto, etc.).

---

## Próximo paso recomendado
**Fase A del roadmap de implementación — Motor de cálculo + estructura del proyecto**

El siguiente agente (Claude Code o Codex) debe:
1. Leer este archivo y `docs/handover/NEXT_STEPS.md`.
2. Leer `docs/specs/13_implementation_roadmap.md` (Fase A).
3. Leer `docs/specs/08_calculation_engine_draft.md` (motor de cálculo).
4. Leer `docs/specs/07_data_model_draft.md` (schema SQL).
5. Comenzar la implementación: estructura de carpetas, `arr_calculator.py`, modelos SQLAlchemy, `docker-compose.yml`, tests unitarios.

Ver `docs/handover/NEXT_STEPS.md` para el checklist detallado.
