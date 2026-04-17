# ADR-001: Base del cálculo ARR — Replicar lógica del Excel fielmente
**Fecha:** 2026-04-17
**Estado:** ACEPTADO
**Autor:** Claude Code (análisis Fase 1)

---

## Contexto

Se ha analizado el Excel de ARR de isEazy. Existen múltiples decisiones de diseño sobre cómo calcular el ARR. La pregunta es: ¿replico el Excel exactamente, o mejoro la lógica en la app?

---

## Opciones consideradas

### Opción A: Replicar el Excel exactamente, incluyendo sus assumptions y workarounds
- Pro: Garantiza continuidad de cifras. El CFO puede validar.
- Con: Perpetúa workarounds históricos que pueden ser incorrectos.

### Opción B: Rediseñar la lógica desde cero con mejores prácticas
- Pro: ARR más correcto conceptualmente.
- Con: Las cifras cambiarán y será difícil justificar las diferencias.

### Opción C: Replicar fielmente en el MVP, con flags para mejoras futuras
- Pro: Continuidad + trazabilidad de mejoras.
- Con: Requiere documentar claramente qué es replicación vs mejora.

---

## Decisión

**Opción C**: Replicar el Excel fielmente en el MVP, con flags explícitos para cada regla que es un workaround o podría mejorarse.

Concretamente:
- La fórmula `ARR = (precio_real / días_periodo_normalizado) * 365` se replica exactamente.
- Los fallbacks de fechas (AS-01, AS-02) se replican, pero se loguean.
- La clasificación SaaS se replica desde la tabla maestra.
- Los workarounds (WA-01 a WA-05) se replican con comentario en el código.

---

## Consecuencias

1. Las cifras del MVP deben ser idénticas al Excel para el mismo dataset.
2. Se creará una fase de validación cruzada antes de dar por bueno el MVP.
3. Cada regla documentada como "WA" o "DD" tendrá un issue/ticket para revisión futura.
4. Los cambios de lógica posteriores al MVP serán opcionales y comparables (vistas A y B).
