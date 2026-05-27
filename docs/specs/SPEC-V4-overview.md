# ARR Command Center — Especificación V4

**Fecha:** 2026-05-27  
**Autor:** Daniel Muñoz (CFO isEazy)  
**Estado:** Aprobado para implementación  
**Metodología:** Spec-Driven Development

---

## Resumen ejecutivo

V4 añade dos módulos analíticos de alto valor gerencial y extiende la exportación de snapshots. Ambos módulos tienen entrada propia en el sidebar y responden a una necesidad real del equipo financiero: entender **qué cambió retroactivamente en los datos** (Revisor de Snapshot) y **por qué varió el ARR entre dos periodos** (Gagero).

**Principio de diseño:** los datos ya están en la base de datos con suficiente granularidad. V4 es fundamentalmente una capa de presentación y análisis sobre los datos existentes, con mínimos cambios de modelo.

---

## Fases

| Fase | Nombre | Tipo | Sidebar | Orden |
|------|--------|------|---------|-------|
| V4-P1 | Revisor de Snapshot | Nueva funcionalidad | "Revisor de Snapshot" | 1 |
| V4-P2 | Gagero — Análisis de Variaciones | Nueva funcionalidad | "Gagero" | 2 |
| V4-P3 | Churn — Retención de Ingresos | Nueva funcionalidad | "Churn" | 3 |
| V4-P4 | Monitor de Renovaciones | Nueva funcionalidad | "Renovaciones" | 4 |

---

## Arquitectura (sin cambios respecto a V3)

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

Ambos módulos respetan los filtros del sidebar izquierdo (`useAnalysisFilters`):
- `product_type` (Línea de Negocio)
- `account_name` (Cliente)
- `monthFrom` / `monthTo` (Desde / Hasta) — usados como periodo por defecto al entrar en cada módulo

---

## Resumen de cambios de modelo de datos

V4 no requiere nuevas tablas. Los cambios son:

1. **Ningún cambio en `ARRLineItem`** — ya tiene toda la granularidad necesaria para ambos módulos.
2. **Nueva query helper en backend**: agregación `(account_name × product_type × month)` a partir de `ARRLineItem JOIN RawOpportunityLineItem`, reutilizada en Gagero y opcionalmente en el Revisor.
3. **Exportación de snapshot ampliada**: se añade una pestaña "Gagero" al endpoint existente de exportación Excel.

---

## Documentos de fase

- [SPEC-V4-phase1-snapshot-reviewer.md](./SPEC-V4-phase1-snapshot-reviewer.md) — Revisor de Snapshot
- [SPEC-V4-phase2-gagero.md](./SPEC-V4-phase2-gagero.md) — Gagero: Análisis de Variaciones
- [SPEC-V4-phase3-churn.md](./SPEC-V4-phase3-churn.md) — Churn: Retención de Ingresos (NRR/GRR)
- [SPEC-V4-phase4-renewal-monitor.md](./SPEC-V4-phase4-renewal-monitor.md) — Monitor de Renovaciones
