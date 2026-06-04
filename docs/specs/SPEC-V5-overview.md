# ARR Command Center — Especificación V5

**Fecha:** 2026-06-04  
**Autor:** Daniel Muñoz (CFO isEazy)  
**Estado:** Aprobado para implementación  
**Metodología:** Spec-Driven Development

---

## Resumen ejecutivo

V5 introduce un único módulo analítico nuevo de alto valor estratégico: **Committed vs Real**. Este dashboard responde a una pregunta que ningún módulo anterior puede contestar: ¿cuánto ARR está firmado pero aún no en marcha, y cuáles son los contratos que llevan más tiempo sin implementarse?

La distinción entre las dos metodologías de cálculo de ARR ya existe en el sistema (modo `from_close` vs `from_start`). V5 convierte esa diferencia técnica en un **instrumento de gestión**: el gap entre ambas lecturas revela el pipeline de contratos en tránsito, y su evolución temporal distingue el crecimiento sano del riesgo operativo.

---

## Fases

| Fase | Nombre | Tipo | Sidebar | Orden |
|------|--------|------|---------|-------|
| V5-P1 | Committed vs Real | Nueva funcionalidad | "Committed vs Real" | Tras "Base Instalada" |

---

## Arquitectura (sin cambios respecto a V4)

- **Backend:** Python FastAPI, PostgreSQL, SQLAlchemy  
- **Frontend:** Next.js (App Router), React Query, Recharts, Tailwind CSS  
- **Colores de marca:** Primario `#6d35ff`, Oscuro `#2f185f`  
- **Idioma UI:** Español

### Convenciones que deben respetarse

- Schemas Pydantic → `app/backend/api/schemas.py`
- Rutas FastAPI → `app/backend/api/routes/`
- Tipos TypeScript → `app/frontend/lib/types.ts`
- Llamadas API → `app/frontend/lib/api.ts`
- Componentes → `app/frontend/components/`

### Filtros globales del sidebar

El módulo respeta los filtros del sidebar izquierdo (`useAnalysisFilters`):
- `product_type` (Línea de Negocio)
- `monthFrom` / `monthTo` (Desde / Hasta)

El filtro `account_name` no se aplica en la tendencia ni en los KPIs pero sí en la tabla de radiografía.

---

## Principio de diseño de V5

> "El mismo número visto desde dos perspectivas temporales distintas es un indicador de gestión, no una inconsistencia."

El delta Committed minus Real no es un error de datos: es el inventario de contratos firmados pendientes de implantación. Gestionarlo activamente separa las organizaciones que cierran bien de las que implementan bien.

---

## Documentos de fase

- [SPEC-V5-phase1-committed-vs-real.md](./SPEC-V5-phase1-committed-vs-real.md) — Committed vs Real: Delta ARR y alertas de implantación
