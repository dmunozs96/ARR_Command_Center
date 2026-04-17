# Next Steps
**Última actualización:** 2026-04-17

---

## Paso inmediato: Validación con el negocio

Antes de continuar con el desarrollo, el CFO debe revisar y confirmar:

1. **Leer** `docs/logs/excel_assumptions_catalog.md` y confirmar cada assumption (AS-01 a AS-10).
2. **Responder** las preguntas de `docs/specs/12_open_questions_and_risks.md` (Q-01 a Q-08).
3. **Confirmar** que no hay excepciones adicionales más allá de las documentadas en `BBDD-->`.

---

## Fases pendientes

### Fase 2 — Crítica funcional y gap analysis
**Cuando:** Después de validación del negocio (o en paralelo con cautela).
**Qué hacer:**
- Documentar en `docs/specs/05_functional_requirements.md` los requisitos funcionales del MVP.
- Documentar en `docs/specs/06_non_functional_requirements.md` los requisitos no funcionales.
- Añadir análisis crítico (qué falta en el Excel que debería tener la app).
- Distinguir: MVP imprescindible / Fase 2 / Nice-to-have.

### Fase 3 — Diseño de integración Salesforce
**Cuando:** En paralelo con Fase 2.
**Qué hacer:**
- Documentar en `docs/specs/04_salesforce_integration_plan.md` el plan completo.
- Crear `docs/logs/salesforce_field_mapping.md` — mapeo de campos SF a la app.
- Diseño de snapshots en `docs/specs/10_versioning_and_snapshots.md`.
- Describir qué objetos SF se necesitan (Opportunity, OpportunityLineItem, Product2, etc.).

### Fase 4 — Propuesta de arquitectura
**Cuando:** Después de Fases 2 y 3.
**Qué hacer:**
- Definir stack técnico (recomendado: Python/FastAPI + PostgreSQL + React/Next.js).
- Diseñar estructura de carpetas.
- Crear modelo de datos inicial en `docs/specs/07_data_model_draft.md`.
- Proponer ADRs de stack en `docs/decisions/`.

### Fase 5 — Guía de construcción desde cero
- Actualizar `docs/specs/11_build_from_zero_guide.md`.

### Fase 6 — Plan de implementación iterativo
- Actualizar `docs/specs/13_implementation_roadmap.md`.

---

## Checklist de validación del Excel (para el CFO)

Lee `docs/logs/excel_assumptions_catalog.md` y marca si cada assumption es correcto:

- [ ] AS-01: Sin fecha inicio → usar close_date como proxy
- [ ] AS-02: Sin fecha fin → asumir 365 días
- [ ] AS-03: ARR = precio_diario × 365
- [ ] AS-04: Normalización mensual (no hay prorrateo diario)
- [ ] AS-05: ARR Author Online = MRR_Stripe × 12
- [ ] AS-06: Solo productos SaaS entran en el ARR
- [ ] AS-07: Negocio existente = renovaciones tratadas igual que nuevos
- [ ] AS-08: Tabla de productos siempre actualizada (confirmación)
- [ ] AS-09: Tabla País Consultor siempre actualizada (confirmación)
- [ ] AS-10: Sin contratos en moneda no EUR (confirmación)
