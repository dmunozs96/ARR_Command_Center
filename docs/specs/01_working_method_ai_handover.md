# Working Method - AI Handover

## Principio básico
Claude Code y Codex deben poder continuar el trabajo leyendo el repositorio, sin depender del historial del chat.

## Reglas
1. Toda decisión relevante debe documentarse en archivos.
2. Todo avance debe actualizar:
   - docs/handover/CURRENT_STATE.md
   - docs/handover/NEXT_STEPS.md
   - docs/handover/SESSION_LOG.md
3. Las decisiones de arquitectura relevantes deben quedar en `docs/decisions/`.
4. La lógica funcional debe vivir en `docs/specs/`.
5. No se debe implementar código crítico sin haber definido antes su especificación.

## Orden recomendado de lectura para retomar
1. README.md
2. docs/handover/CURRENT_STATE.md
3. docs/handover/NEXT_STEPS.md
4. docs/handover/SESSION_LOG.md
5. specs relevantes según fase
