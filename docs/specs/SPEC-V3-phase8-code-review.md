# V3-P8 — Revisión y optimización de código

**Estado:** Pendiente  
**Tipo:** Deuda técnica  
**Orden de implementación:** 8 (ÚLTIMA fase de V3)

**IMPORTANTE:** Esta fase solo comienza cuando P1 a P7 están completas y verificadas. Su propósito es auditar todo el código acumulado y dejarlo listo para el siguiente ciclo de desarrollo.

---

## Motivación

Después de V1, V2 y V3, el código habrá crecido de forma incremental. Es el momento de hacer una pasada crítica antes de que la deuda técnica se acumule demasiado: eliminar duplicaciones, simplificar lógica, mejorar tipos, y detectar problemas de rendimiento latentes.

---

## Áreas de auditoría

### Frontend

| Área | Qué buscar |
|---|---|
| **Componentes** | Props no usadas, estados duplicados, efectos que podrían ser memos, re-renders innecesarios |
| **`utils.ts`** | Funciones duplicadas o muy similares que puedan unificarse |
| **`types.ts`** | Interfaces obsoletas de versiones anteriores que ya no se usan |
| **`api.ts`** | Llamadas duplicadas al mismo endpoint desde distintos lugares |
| **Imports** | Imports no utilizados en cualquier archivo `.tsx` / `.ts` |
| **Recharts** | Configuraciones de gráficos duplicadas que podrían extraerse a un componente base |

### Backend

| Área | Qué buscar |
|---|---|
| **`arr_calculator.py`** | Queries N+1 o lógica que se podría pre-computar |
| **`arr.py` (routes)** | Endpoints que hacen demasiado: separar lógica de negocio de la capa HTTP |
| **`schemas.py`** | Schemas Pydantic que ya no corresponden a ninguna ruta activa |
| **`snapshot_manager.py`** | Código de V1 que quedó para compatibilidad pero ya no se ejecuta |
| **Tests** | Tests que prueban implementación en lugar de comportamiento (frágiles ante refactor) |

---

## Proceso de esta fase

1. **Auditoría primero, cambios después.** El agente primero produce un informe de los hallazgos y los presenta al CFO para priorizar.
2. **No romper funcionalidad.** Cada cambio debe dejar `pytest tests/` en verde y `npx tsc --noEmit` sin errores.
3. **Un commit por área** para facilitar reversión si algo falla.
4. **Proponer, no implementar** cualquier refactor estructural que cambie la arquitectura — esperar aprobación explícita del CFO antes de ejecutarlo.

---

## Entregables de esta fase

1. **Informe de hallazgos** (comentario en el PR o documento en `docs/logs/`) con lista priorizada de:
   - Bugs latentes encontrados
   - Duplicaciones eliminadas
   - Simplificaciones aplicadas
   - Refactors mayores propuestos (pero no implementados)

2. **Código limpio** con:
   - Tests pasando al 100%
   - TypeScript sin errores
   - Sin `console.log` de depuración en producción
   - Sin código comentado ("dead code")

---

## Criterio de aceptación

- `pytest tests/` → todos en verde
- `npx tsc --noEmit` → sin errores
- `eslint` → sin warnings nuevos respecto a antes de la fase
- El informe de hallazgos está documentado
- El CFO ha revisado y aprobado (o descartado) los refactors mayores propuestos
