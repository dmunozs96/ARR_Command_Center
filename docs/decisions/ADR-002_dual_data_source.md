# ADR-002: Dos fuentes de datos — Salesforce + Stripe
**Fecha:** 2026-04-17
**Estado:** ACEPTADO (pendiente de decisión sobre automatización de Stripe)
**Autor:** Claude Code (análisis Fase 1)

---

## Contexto

El ARR total de isEazy tiene dos fuentes:
1. **Salesforce** (oportunidades ganadas): ~99% del ARR SaaS.
2. **Stripe** (MRR self-service de isEazy Author Online): ~1% del ARR.

El Excel gestiona ambas manualmente (Stripe se importa en la hoja `Mtricas_de_suscripciones_mensua`).

---

## Opciones consideradas

### Opción A: Solo Salesforce — ignorar Stripe
- Pro: Simplicidad técnica.
- Con: El ARR de Author Online quedaría incompleto.

### Opción B: Salesforce + Stripe API automatizada
- Pro: ARR completo y actualizado.
- Con: Requiere integración con Stripe (más complejidad técnica).

### Opción C: Salesforce + Stripe como input manual en la app
- Pro: ARR completo sin complejidad de Stripe API.
- Con: Proceso manual; puede quedarse desactualizado.

---

## Decisión

**MVP: Opción C** — Salesforce automático + Stripe como input manual.

La app tendrá una sección para importar los datos de Stripe (CSV o input manual de MRR por mes). Esto replica el comportamiento actual del Excel sin añadir dependencia técnica de Stripe en el MVP.

**Post-MVP:** Evaluar integración de Stripe API si el volumen de Author Online crece.

---

## Consecuencias

1. La app debe tener una interfaz para actualizar los datos de MRR de Stripe por mes.
2. El cálculo del ARR total = Salesforce ARR + Stripe_MRR × 12 (para el mes correspondiente).
3. Si los datos de Stripe no se actualizan, el ARR de Author Online quedará con la última cifra conocida.
4. Los snapshots deben incluir qué versión del dato de Stripe se usó.
