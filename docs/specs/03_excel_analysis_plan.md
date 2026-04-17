# Análisis del Excel ARR — Plan y Resultados
**Fecha de inicio:** 2026-04-17
**Estado:** COMPLETADO (Fase 1)

---

## Objetivo

Analizar el Excel actual de ARR (`data_samples/raw_excel/ARR Oportunidad.xlsx`) como fuente funcional de verdad, documentando exhaustivamente su lógica, reglas y limitaciones.

---

## Estado del análisis

**✅ COMPLETADO** — Análisis realizado el 2026-04-17 por Claude Code.

---

## Hallazgos principales

### Estructura del Excel
- **16 hojas**, de las cuales 3 son críticas para el cálculo: `Opos con Productos`, `Productos SF SAAS`, `Mtricas_de_suscripciones_mensua`.
- **14.095 líneas de datos** (line items de oportunidades ganadas de Salesforce).
- **Dos fuentes de datos:** Salesforce (mayoría del ARR) + Stripe (ARR de isEazy Author Online).

### Lógica de cálculo ARR
El ARR de cada line item se calcula como:
```
ARR = (cantidad × precio_unitario) / días_periodo_normalizado × 365
```
Donde `días_periodo_normalizado = fin_mes - inicio_mes` (normalizado al primer día de cada mes).

La hoja `Resumen` usa `SUMIFS` para agregas los `servicio_anualizado` de todos los line items activos en cada mes.

### Clasificación SaaS
Mediante VLOOKUP sobre la tabla `Productos SF SAAS`. Solo los productos clasificados como SaaS LMS / SaaS Author / SaaS Skills / SaaS Engage / SaaS AIO entran en el ARR.

### Assumptions críticos
1. Sin fecha inicio → usar close_date como proxy.
2. Sin fecha fin → asumir 365 días.
3. Todos los importes están en EUR (no explícito).
4. ARR = precio diario × 365, independientemente de si el contrato es recurrente.

### Limitaciones detectadas
- "ARR desde close won" NO está implementado en ningún resumen (solo preparado en columnas auxiliares).
- La tabla de clasificación de productos se mantiene manualmente.
- Excepciones documentadas informalmente en la hoja `BBDD-->`.
- isEazy Author Online requiere datos de Stripe, no Salesforce.

---

## Documentos entregables generados

| Documento | Ruta | Descripción |
|-----------|------|-------------|
| Inventario de hojas | `docs/logs/excel_sheet_inventory.md` | Todas las hojas, su rol y criticidad |
| Lógica de fórmulas | `docs/logs/excel_formula_logic.md` | Cada columna calculada con su fórmula y descripción |
| Reglas de negocio | `docs/logs/excel_business_rules_catalog.md` | RN / WA / PM / DD clasificados |
| Assumptions | `docs/logs/excel_assumptions_catalog.md` | Supuestos implícitos con impacto |
| Edge cases | `docs/logs/excel_edge_cases.md` | Casos especiales que la app debe manejar |
| Motor de cálculo | `docs/specs/08_calculation_engine_draft.md` | Algoritmo traducido a código |

---

## Riesgos identificados

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Tabla de productos desactualizada | ALTA | Alertas automáticas en la app |
| Excepciones manuales no documentadas formalmente | ALTA | Auditoría de hoja BBDD--> con el CFO |
| Doble fuente (SF + Stripe) sin reconciliación | MEDIA | Documentar separación explícita |
| ARR de contratos SAAS-Variable Invoicing sin lógica diferenciada | MEDIA | Clarificar con negocio |
| Datos históricos pre-2020 basados en assumptions | MEDIA | Documentar vintage y advertir |
| Posible doble conteo en renovaciones | MEDIA | Implementar lógica de deduplicación |

---

## Próximos pasos recomendados

1. Validar con el CFO las reglas de negocio documentadas (especialmente assumptions AS-01 a AS-10).
2. Clarificar qué hacer con "SAAS - Variable Invoicing".
3. Decidir si Stripe se automatiza o se acepta como input manual en la app.
4. Confirmar si hay contratos en monedas distintas al EUR.
5. Definir cuándo se implementa el modo "ARR desde close won".
