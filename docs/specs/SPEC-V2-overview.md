# ARR Command Center — Especificación V2

**Fecha:** 2026-05-07  
**Autor:** Daniel Muñoz (CFO isEazy)  
**Estado:** Borrador aprobado para implementación  
**Metodología:** Spec-Driven Development

---

## Resumen ejecutivo

Esta V2 añade cuatro bloques de funcionalidad sobre la base estable de V1. El objetivo es pasar de un dashboard de métricas globales a una herramienta de análisis de cliente, línea de negocio e inteligencia artificial embebida.

---

## Bloques de funcionalidad

| Fase | Nombre | Prioridad | Dependencias |
|------|--------|-----------|--------------|
| P1 | Análisis por Cliente y Línea de Negocio | Alta | Ninguna |
| P2 | Top 20 Clientes en Gráficos del Dashboard | Alta | P1 (endpoint compartido) |
| P3 | Agrupación de Líneas de Negocio | Media | Ninguna (puede ir paralelo) |
| P4 | ARR Expert (IA embebida) | Alta | P1, P3 idealmente |

**Orden recomendado de implementación:** P3 → P1 → P2 → P4

---

## Arquitectura común

### Stack existente (no cambia)
- **Backend:** Python FastAPI, PostgreSQL, SQLAlchemy
- **Frontend:** Next.js (App Router), React Query, Recharts, Tailwind CSS
- **Colores de marca:** Primario `#6d35ff`, Oscuro `#2f185f`
- **Idioma UI:** Español

### Convenciones de código que deben respetarse
- Los schemas Pydantic están en `app/backend/api/schemas.py`
- Las rutas FastAPI están en `app/backend/api/routes/`
- Los tipos TypeScript están en `app/frontend/lib/types.ts`
- Las llamadas API en `app/frontend/lib/api.ts`
- Las páginas nuevas van en `app/frontend/app/<nombre>/page.tsx`
- Los componentes reutilizables en `app/frontend/components/`
- El sidebar se edita en `app/frontend/components/Sidebar.tsx`

### Constante de líneas de negocio
En todo el código V2 se usará esta constante centralizada:

```typescript
// app/frontend/lib/constants.ts (crear si no existe)
export const PRODUCT_TYPES = [
  "SaaS LMS",
  "SaaS AIO",
  "SaaS Author",
  "SaaS Engage",
  "SaaS Skills",
  "Author Online",  // Stripe
] as const;

export const BL_GROUP_LMS_AIO = ["SaaS LMS", "SaaS AIO"];
export const BL_GROUP_AUTHOR = ["SaaS Author", "Author Online"];
```

---

## Glosario del dominio

| Término | Definición |
|---------|-----------|
| ARR | Annual Recurring Revenue — métrica principal de la app |
| Línea de negocio (BL) | Categoría de producto: SaaS LMS, AIO, Author, Engage, Skills, Author Online |
| Cliente / Cuenta | `account_name` en Salesforce — empresa contratante |
| Snapshot | Importación completa de datos de Salesforce en un momento dado |
| MoM | Month-over-Month — variación respecto al mes anterior |
| Delta | Diferencia absoluta de ARR entre dos periodos |
| Stripe / Author Online | ARR de la plataforma Author en modalidad online (input manual en V1) |
| LMS + AIO | Las dos líneas pueden sumarse para análisis conjunto |
| Author completo | SaaS Author (offline) + Author Online (Stripe) sumados |

---

## Impacto en navegación (Sidebar.tsx)

Se añaden dos entradas nuevas al array `NAV`:

```typescript
{ href: "/clients",  label: "Clientes",    icon: Building2 }
{ href: "/expert",   label: "ARR Expert",  icon: BrainCircuit }
```

Orden final del sidebar:
1. Dashboard `/`
2. **Clientes `/clients`** ← nuevo
3. Snapshots `/snapshots`
4. Consultores `/consultants`
5. Stripe MRR `/stripe`
6. Alertas `/alerts`
7. Configuración `/config`
8. **ARR Expert `/expert`** ← nuevo (al final, con estilo diferenciado)

---

## Gestión de migraciones de base de datos

La P4 (ARR Expert) requiere una nueva tabla para historial de conversaciones. Se creará como `0006_add_expert_conversations.py`.

Las fases P1, P2, P3 no requieren cambios en base de datos — operan sobre los datos ya calculados.

---

## Documentos de fase

- [SPEC-V2-phase1-client-analysis.md](./SPEC-V2-phase1-client-analysis.md) — Análisis por Cliente y Línea de Negocio
- [SPEC-V2-phase2-main-top20.md](./SPEC-V2-phase2-main-top20.md) — Top 20 Clientes en Dashboard Principal
- [SPEC-V2-phase3-bl-grouping.md](./SPEC-V2-phase3-bl-grouping.md) — Agrupación de Líneas de Negocio
- [SPEC-V2-phase4-arr-expert.md](./SPEC-V2-phase4-arr-expert.md) — ARR Expert (IA embebida)
