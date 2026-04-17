# Next Steps
**Última actualización:** 2026-04-17

---

## ✅ Especificación completa — Listo para implementar

La especificación está completa. Las decisiones de negocio bloqueantes han sido respondidas:
- Q-01 ✅ Variable Invoicing: misma lógica SaaS si col U es SaaS
- Q-02 ✅ Stripe: input manual en V1, API en V2
- Q-04 ✅ Moneda: todo EUR

**Aún pendiente de validación (no bloqueante para empezar):**
- Assumptions AS-01 a AS-10 (checklist al final de este archivo)
- Q-05: ¿TaaS incluye en ARR SaaS? (actualmente excluido)
- Q-06: ¿Riesgo de doble conteo en renovaciones?

---

## PRÓXIMO PASO: Fase A de implementación

### Fase A — Motor de cálculo + fundamentos ← EMPEZAR AQUÍ
**Documentos a leer primero:**
- `docs/specs/08_calculation_engine_draft.md` — lógica de cálculo
- `docs/specs/07_data_model_draft.md` — schema SQL
- `docs/specs/13_implementation_roadmap.md` — criterios de aceptación de Fase A

**Tareas concretas:**
1. Crear `docker-compose.yml` con PostgreSQL.
2. Crear `.env.example` con todas las variables.
3. Crear `app/backend/` con estructura de carpetas completa.
4. Implementar `app/backend/core/arr_calculator.py`.
5. Implementar `app/backend/db/models.py` con SQLAlchemy.
6. Crear migrations con Alembic.
7. Implementar `scripts/import_excel_data.py`.
8. Implementar `scripts/validate_vs_excel.py`.
9. Escribir `tests/test_arr_calculator.py`.

**Criterio de aceptación:**
- `validate_vs_excel.py` pasa con diferencia < 0.01€ por línea.
- Todos los tests unitarios pasan.

### Fase B — Backend API
Después de Fase A. Ver `docs/specs/13_implementation_roadmap.md`.

### Fase C — Frontend
Después de Fase B. Ver `docs/specs/09_dashboard_and_reporting_draft.md`.

### Fases D–H
Ver `docs/specs/13_implementation_roadmap.md` para el plan completo.

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
