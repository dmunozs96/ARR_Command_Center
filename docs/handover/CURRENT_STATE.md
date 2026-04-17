# Current State
**Última actualización:** 2026-04-17
**Agente:** Claude Code (sesiones 1–3)

---

## Objetivo del proyecto

Construir una aplicación web (**ARR Command Center**) para calcular, visualizar y auditar el ARR (Annual Recurring Revenue) de isEazy.

- Sustituye al proceso manual: exportación de Salesforce → Excel → cálculo manual.
- Replica fielmente la lógica del Excel en el MVP.
- Se conecta a Salesforce para extraer oportunidades ganadas.
- Guarda snapshots históricos para auditoría.
- Muestra dashboards por línea de negocio, consultor, canal.

---

## Estado actual: ESPECIFICACIÓN COMPLETA — LISTA PARA IMPLEMENTAR

No hay nada pendiente en la fase de documentación.  
El siguiente paso es **implementar la Fase A** (motor de cálculo + estructura de proyecto).

### Fases de documentación completadas

| Fase | Contenido | Estado |
|------|-----------|--------|
| Fase 0 | Bootstrap del repositorio y metodología | ✅ |
| Fase 1 | Análisis exhaustivo del Excel | ✅ |
| Fase 2 | Requisitos funcionales y no funcionales | ✅ |
| Fase 3 | Plan de integración con Salesforce | ✅ |
| Fase 4 | Arquitectura, stack, modelo de datos | ✅ |
| Fase 5 | Guía de construcción desde cero | ✅ |
| Fase 6 | Roadmap de implementación (Fases A–H) | ✅ |

---

## Decisiones confirmadas (inamovibles para el MVP)

| Decisión | Valor | Fuente |
|----------|-------|--------|
| Cálculo ARR | `(precio_real / días_periodo_normalizado) × 365` | Excel + CFO |
| Fidelidad al Excel | Replicar exactamente, con flags para mejoras | ADR-001 |
| Fuente principal | Salesforce API (OAuth2 + SOQL) | ADR-002 |
| Fuente secundaria | Stripe = input manual en UI (V1) | ADR-002 + CFO |
| Variable Invoicing | Misma lógica SaaS si `Tipo de Producto Correcto` es SaaS | CFO |
| Moneda | Todo EUR, sin conversión | CFO |
| Stack | Python/FastAPI + PostgreSQL + React/Next.js | ADR-003 |
| Clasificación SaaS | Via tabla maestra `product_classifications` | ADR-001 |

---

## Hallazgos clave del Excel (leer antes de implementar)

1. **Fórmula core:** `ARR_line = (cantidad × precio_unitario) / (fin_mes_normalizado - inicio_mes) × 365`
2. **Solapamiento mensual:** Un line item está activo en mes M si `inicio_mes ≤ fin_mes_objetivo AND fin_mes_normalizado ≥ inicio_mes_objetivo`
3. **Fallback sin fecha inicio:** usa `close_date` como proxy
4. **Fallback sin fecha fin:** asume `start + 365 días`
5. **Normalización:** `inicio_mes = primer día del mes de inicio`, `fin_mes = inicio_mes + días_brutos - 1`
6. **Dos fuentes:** Salesforce (todo menos Author Online) + Stripe (Author Online, MRR × 12)
7. **ARR desde close won NO implementado** en el Excel (columnas AC–AF preparadas pero no usadas en SUMIFS)
8. **Excepciones manuales conocidas:** Virto (5 años con importes de 1 año), contrato 9-meses/12-meses
9. **1 producto con #N/A** en clasificación (no encontrado en tabla maestra)

---

## Archivos imprescindibles para el siguiente agente

### Antes de implementar, leer en este orden:

1. **`docs/handover/NEXT_STEPS.md`** — checklist de tareas de la Fase A
2. **`docs/specs/08_calculation_engine_draft.md`** — pseudocódigo completo del motor ARR
3. **`docs/specs/07_data_model_draft.md`** — schema SQL completo de PostgreSQL
4. **`docs/specs/13_implementation_roadmap.md`** — Fases A–H con criterios de aceptación
5. **`docs/logs/excel_formula_logic.md`** — cada columna calculada del Excel explicada
6. **`docs/logs/excel_business_rules_catalog.md`** — reglas de negocio, workarounds, edge cases

### Para el dashboard (cuando llegue Fase C):
7. **`docs/specs/09_dashboard_and_reporting_draft.md`** — wireframes y endpoints API

### Para la integración Salesforce (cuando llegue Fase E):
8. **`docs/specs/04_salesforce_integration_plan.md`** — plan completo
9. **`docs/logs/salesforce_field_mapping.md`** — mapeo de campos SF (algunos pendientes de verificar con admin SF)

### Decisiones tomadas:
10. **`docs/decisions/`** — ADR-001, ADR-002, ADR-003

---

## Riesgos abiertos (no bloqueantes para Fase A)

| Riesgo | Severidad | Estado |
|--------|-----------|--------|
| Q-03: "ARR desde close won" — definición exacta | MEDIA | Pendiente (post-MVP) |
| Q-05: ¿TaaS en ARR SaaS? | BAJA | Pendiente validación CFO |
| Q-06: Doble conteo en renovaciones | MEDIA | Pendiente validación CFO |
| RT-01: Calidad datos SF (campos vacíos) | ALTA | Mitigado con fallbacks y alertas |
| RT-02: Tabla de productos desactualizada | ALTA | Mitigado con alertas automáticas |
| Excepciones Virto / 9-12 meses | MEDIA | Detectadas por flag DURATION_HIGH |
| Mapeo exacto campos SF | ALTA | Verificar con admin SF antes de Fase E |

---

## Próximo paso: FASE A de implementación

**El siguiente agente debe implementar la Fase A.** Ver `docs/handover/NEXT_STEPS.md` para el checklist detallado.

Resumen de la Fase A:
- Estructura de carpetas del proyecto
- `docker-compose.yml` con PostgreSQL
- `.env.example`
- `app/backend/core/arr_calculator.py` (motor de cálculo)
- `app/backend/db/models.py` (SQLAlchemy)
- Alembic migrations
- `scripts/import_excel_data.py` (carga el Excel como mock de SF)
- `scripts/validate_vs_excel.py` (valida paridad con el Excel)
- `tests/test_arr_calculator.py` (tests unitarios)

**Criterio de éxito de la Fase A:**  
`validate_vs_excel.py` pasa con diferencia < 0.01€ por línea para el dataset completo del Excel.
