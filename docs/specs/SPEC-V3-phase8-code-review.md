# V3-P8 â€” RevisiÃ³n y optimizaciÃ³n de cÃ³digo

**Estado:** Pendiente  
**Tipo:** Deuda tÃ©cnica  
**Orden de implementaciÃ³n:** 8 (ÃšLTIMA fase de V3)

**IMPORTANTE:** Esta fase solo comienza cuando P1 a P7 estÃ¡n completas y verificadas. Su propÃ³sito es auditar todo el cÃ³digo acumulado y dejarlo listo para el siguiente ciclo de desarrollo.

---

## MotivaciÃ³n

DespuÃ©s de V1, V2 y V3, el cÃ³digo habrÃ¡ crecido de forma incremental. Es el momento de hacer una pasada crÃ­tica antes de que la deuda tÃ©cnica se acumule demasiado: eliminar duplicaciones, simplificar lÃ³gica, mejorar tipos, y detectar problemas de rendimiento latentes.

---

## Ãreas de auditorÃ­a

### Frontend

| Ãrea | QuÃ© buscar |
|---|---|
| **Componentes** | Props no usadas, estados duplicados, efectos que podrÃ­an ser memos, re-renders innecesarios |
| **`utils.ts`** | Funciones duplicadas o muy similares que puedan unificarse |
| **`types.ts`** | Interfaces obsoletas de versiones anteriores que ya no se usan |
| **`api.ts`** | Llamadas duplicadas al mismo endpoint desde distintos lugares |
| **Imports** | Imports no utilizados en cualquier archivo `.tsx` / `.ts` |
| **Recharts** | Configuraciones de grÃ¡ficos duplicadas que podrÃ­an extraerse a un componente base |

### Backend

| Ãrea | QuÃ© buscar |
|---|---|
| **`arr_calculator.py`** | Queries N+1 o lÃ³gica que se podrÃ­a pre-computar |
| **`arr.py` (routes)** | Endpoints que hacen demasiado: separar lÃ³gica de negocio de la capa HTTP |
| **`schemas.py`** | Schemas Pydantic que ya no corresponden a ninguna ruta activa |
| **`snapshot_manager.py`** | CÃ³digo de V1 que quedÃ³ para compatibilidad pero ya no se ejecuta |
| **Tests** | Tests que prueban implementaciÃ³n en lugar de comportamiento (frÃ¡giles ante refactor) |

---

## Proceso de esta fase

1. **AuditorÃ­a primero, cambios despuÃ©s.** El agente primero produce un informe de los hallazgos y los presenta al CFO para priorizar.
2. **No romper funcionalidad.** Cada cambio debe dejar `pytest tests/` en verde y `npx tsc --noEmit` sin errores.
3. **Un commit por Ã¡rea** para facilitar reversiÃ³n si algo falla.
4. **Proponer, no implementar** cualquier refactor estructural que cambie la arquitectura â€” esperar aprobaciÃ³n explÃ­cita del CFO antes de ejecutarlo.

---

## Entregables de esta fase

1. **Informe de hallazgos** (comentario en el PR o documento en `docs/logs/`) con lista priorizada de:
   - Bugs latentes encontrados
   - Duplicaciones eliminadas
   - Simplificaciones aplicadas
   - Refactors mayores propuestos (pero no implementados)

2. **CÃ³digo limpio** con:
   - Tests pasando al 100%
   - TypeScript sin errores
   - Sin `console.log` de depuraciÃ³n en producciÃ³n
   - Sin cÃ³digo comentado ("dead code")

---

## Criterio de aceptaciÃ³n

- `pytest tests/` â†’ todos en verde
- `npx tsc --noEmit` â†’ sin errores
- `eslint` â†’ sin warnings nuevos respecto a antes de la fase
- El informe de hallazgos estÃ¡ documentado
- El CFO ha revisado y aprobado (o descartado) los refactors mayores propuestos

