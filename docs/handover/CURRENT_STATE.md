# Current State
**Ultima actualizacion:** 2026-05-08
**Agente:** Claude Sonnet 4.6 (sesion 19)

---

## Objetivo del proyecto

Construir una aplicacion web (**ARR Command Center**) que sustituya el proceso manual:
> Salesforce -> Excel -> calculo manual del CFO

La app calcula, visualiza y audita el ARR de isEazy.

**Usuarios finales:** CFO + equipo de finanzas  
**Stack:** Python/FastAPI + PostgreSQL + React/Next.js

---

## Estado actual

| Fase | Nombre | Estado | Verificacion |
|------|--------|--------|--------------|
| A | Motor de calculo + infraestructura | completa | 57/57 |
| B | Backend API FastAPI | completa | 57/57 |
| C | Frontend Next.js | completa | TypeScript OK |
| D | Historial de snapshots en UI | completa | TypeScript OK |
| E | Integracion real con Salesforce | bloqueada | pendiente credenciales SF |
| F | Panel de alertas completo | completa | 57/57 |
| G | Stripe UI completa + consultores exportables | completa | 57/57 |
| H | Endurecimiento, e2e y UX final | completa | 57/57 backend, 3/3 e2e |
| — | Cron diario con dedup por hash | completa | 57/57 |
| I-A | Toggle ARR "desde cierre" vs "desde inicio" | completa | 57/57 |
| I-B | Deteccion y gestion de solapamientos | completa | 57/57 |
| V2-P1 | Analisis por Cliente y Linea de Negocio | completa | TypeScript OK |
| V2-P2 | Top 20 Clientes en Dashboard | completa | TypeScript OK |
| V2-P3 | Agrupacion de Lineas de Negocio | completa | TypeScript OK |
| V2-P4 | ARR Expert (IA embebida) | completa | TypeScript OK |
| **V3-P1** | **Correccion matematica BL grouping** | **pendiente** | — |
| **V3-P2** | **Limpieza de NaN global** | **pendiente** | — |
| **V3-P3** | **MoM → YTD comparativo** | **pendiente** | — |
| **V3-P4** | **Top 20 sin "Otros"** | **pendiente** | — |
| **V3-P5** | **Tabla de clientes corregida** | **pendiente** | — |
| **V3-P6** | **Consultores — nivel 2 (clientes por BL)** | **pendiente** | — |
| **V3-P7** | **Exportar Excel snapshot** | **pendiente** | — |
| **V3-P8** | **Revision y optimizacion de codigo** | **pendiente** | — |

**Tests backend:** `pytest tests/` → **57/57 OK**  
**Frontend:** `npx tsc --noEmit` OK  
**E2E:** `npm run test:e2e` → **3/3 OK**

---

## Lo implementado en la sesion 19

- Documentacion completa de V3 creada en `docs/specs/`:
  - `SPEC-V3-overview.md` — vision general y tabla de fases
  - `SPEC-V3-phase1-bl-math-fix.md` — correccion matematica BL grouping
  - `SPEC-V3-phase2-nan-fix.md` — limpieza de NaN global
  - `SPEC-V3-phase3-ytd-metrics.md` — MoM → YTD comparativo
  - `SPEC-V3-phase4-top20-cleanup.md` — Top 20 sin "Otros"
  - `SPEC-V3-phase5-client-table.md` — tabla de clientes corregida
  - `SPEC-V3-phase6-consultants-level2.md` — consultores nivel 2
  - `SPEC-V3-phase7-excel-export.md` — exportar Excel snapshot
  - `SPEC-V3-phase8-code-review.md` — revision y optimizacion final

---

## Bugs conocidos en V2 (a resolver en V3)

| Bug | Fase que lo resuelve | Descripcion |
|-----|---------------------|-------------|
| BL grouping suma mal | V3-P1 | Author (Total) y LMS & AIO dan valores incorrectos en algunos meses |
| NaN por pais | V3-P2 | Spain, Mexico, Brazil muestran NaN € en el widget geografico |
| NaN en delta clientes | V3-P2 | Columna Δ muestra NaN cuando el primer mes es 0 |
| NaN ARR AGREGADO | V3-P2 | Fila de totales en tabla de consultores muestra NaN |
| Total clientes suma meses | V3-P5 | La columna TOTAL suma todos los meses (incorrecto para ARR) |

---

## Riesgos abiertos

| ID | Riesgo | Severidad | Estado |
|----|--------|-----------|--------|
| RT-01 | Nombres reales de campos Salesforce sin verificar | ALTA | abierto |
| RT-02 | Tabla de productos puede no coincidir con SF | ALTA | abierto |
| RT-03 | `validate_vs_excel.py` no ejecutado contra SF real | MEDIA | abierto |
| RT-06 | PostgreSQL local no levantado | MEDIA | abierto |
| RT-07 | `npm run build` con `spawn EPERM` en Windows | BAJA | abierto |

---

## Archivos clave para el siguiente agente

### V3-P1 (empezar aqui)
- `app/frontend/lib/bl-grouping-context.tsx`
- `app/frontend/lib/utils.ts`
- `app/frontend/components/ARRChart.tsx`
- `app/frontend/components/ARRBreakdownTable.tsx`

### V3-P2
- `app/frontend/lib/utils.ts` — formatter defensivo
- `app/frontend/components/ClientARRTable.tsx`
- `app/frontend/app/consultants/page.tsx`

### V3-P6 (nueva funcionalidad con cambio de backend)
- `app/backend/api/routes/arr.py`
- `app/frontend/app/consultants/page.tsx`

### V3-P7 (nuevo endpoint + nuevo componente)
- Crear `app/backend/core/excel_exporter.py`
- Crear `app/backend/api/routes/exports.py`
- Modificar `app/backend/main.py`
- Modificar `app/frontend/app/page.tsx`
