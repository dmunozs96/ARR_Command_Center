# ARR Command Center — Especificación V3

**Fecha:** 2026-05-08  
**Autor:** Daniel Muñoz (CFO isEazy)  
**Estado:** Aprobado para implementación  
**Metodología:** Spec-Driven Development

---

## Resumen ejecutivo

V3 cierra bugs matemáticos críticos, reemplaza métricas de poca utilidad gerencial (MoM) por comparativas relevantes (YTD), mejora la legibilidad de los gráficos, añade dos funcionalidades nuevas (nivel 2 en consultores y exportación Excel), y termina con un ciclo de limpieza y optimización de código.

**Regla de oro:** bugs primero, mejoras después, nuevas funcionalidades al final, limpieza de cierre.

---

## Fases

| Fase | Nombre | Tipo | Orden |
|------|--------|------|-------|
| V3-P1 | Corrección matemática BL grouping | Bug crítico | 1 |
| V3-P2 | Limpieza de NaN global | Bug crítico | 2 |
| V3-P3 | MoM → YTD comparativo | Mejora métrica | 3 |
| V3-P4 | Top 20 sin "Otros" | Mejora visual | 4 |
| V3-P5 | Tabla de clientes corregida | Mejora funcional | 5 |
| V3-P6 | Consultores — nivel 2 (clientes por BL) | Nueva funcionalidad | 6 |
| V3-P7 | Exportar Excel snapshot | Nueva funcionalidad | 7 |
| V3-P8 | Revisión y optimización de código | Deuda técnica | 8 |

---

## Arquitectura (sin cambios respecto a V2)

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

---

## Documentos de fase

- [SPEC-V3-phase1-bl-math-fix.md](./SPEC-V3-phase1-bl-math-fix.md) — Corrección matemática BL grouping
- [SPEC-V3-phase2-nan-fix.md](./SPEC-V3-phase2-nan-fix.md) — Limpieza de NaN global
- [SPEC-V3-phase3-ytd-metrics.md](./SPEC-V3-phase3-ytd-metrics.md) — MoM → YTD comparativo
- [SPEC-V3-phase4-top20-cleanup.md](./SPEC-V3-phase4-top20-cleanup.md) — Top 20 sin "Otros"
- [SPEC-V3-phase5-client-table.md](./SPEC-V3-phase5-client-table.md) — Tabla de clientes corregida
- [SPEC-V3-phase6-consultants-level2.md](./SPEC-V3-phase6-consultants-level2.md) — Consultores nivel 2
- [SPEC-V3-phase7-excel-export.md](./SPEC-V3-phase7-excel-export.md) — Exportar Excel snapshot
- [SPEC-V3-phase8-code-review.md](./SPEC-V3-phase8-code-review.md) — Revisión y optimización de código
