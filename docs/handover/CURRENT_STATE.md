# Current State
**Última actualización:** 2026-04-17
**Agente:** Claude Code

---

## Objetivo del proyecto
Construir una aplicación web para calcular, visualizar y versionar el ARR de isEazy, replicando la lógica actual del Excel y conectándose con Salesforce (y Stripe para Author Online).

---

## Estado actual
**Fase 1 completada: Análisis exhaustivo del Excel.**

El Excel `ARR Oportunidad.xlsx` ha sido analizado en profundidad. Se ha documentado la lógica de cálculo, las reglas de negocio, los assumptions, los edge cases y las fórmulas. Toda la documentación está en el repo.

---

## Última fase completada
**Fase 1 — Análisis profundo del Excel** (2026-04-17)

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
**Fase 2 — Crítica funcional y gap analysis + Fase 3 — Diseño de integración con Salesforce**

Antes de diseñar la arquitectura técnica, es necesario:
1. Que el CFO valide las reglas documentadas (especialmente los 12 assumptions).
2. Responder las preguntas abiertas Q-01 a Q-08.
3. Luego proceder con Fase 2 (gap analysis funcional) y Fase 3 (Salesforce integration design).

Ver `docs/handover/NEXT_STEPS.md` para el plan detallado.
