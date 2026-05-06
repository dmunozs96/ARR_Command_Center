# Current State
**Ultima actualizacion:** 2026-05-06
**Agente:** Claude Sonnet 4.6 (sesion 18)

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
| I-A | Toggle ARR "desde cierre" vs "desde inicio" | **completa** | 57/57 |
| I-B | Deteccion y gestion de solapamientos | **completa** | 57/57 |

**Tests backend:** `pytest tests/` → **57/57 OK**  
**Frontend:** `npx tsc --noEmit` OK  
**E2E:** `npm run test:e2e` → **3/3 OK**

---

## Lo implementado en la sesion 18

### Fase I-A — Toggle ARR "desde inicio" / "desde cierre"

- `/api/arr/summary` recibe nuevo param `mode=from_start|from_close`
- `from_start` (default): usa `start_month` del `ARRLineItem` (comportamiento anterior)
- `from_close`: usa `close_date.replace(day=1)` de `RawOpportunityLineItem` como inicio
- El summary se calcula **en vivo desde `arr_line_items`** (ya no desde `ARRMonthlySummary`), lo que permite respetar `excluded_from_arr`
- Dashboard: toggle "Desde inicio / Desde cierre" en la cabecera

### Fase I-B — Solapamientos de contratos

- Nueva columna `excluded_from_arr` (boolean, default false) en `arr_line_items`
- Nueva columna `arr_line_item_id` (UUID FK nullable) en `snapshot_alerts`
- Migración `0003_add_overlaps.py`
- `check_overlapping_contracts()` en `alert_checker.py`: detecta pares de items SaaS del mismo (account, product_type) con fechas solapadas; genera 2 alertas por par (una por line item), con `_sf_line_item_id` para que snapshot_manager resuelva el FK
- `snapshot_manager.py` llama al checker y persiste `arr_line_item_id` en cada alerta
- `PATCH /api/arr/line-items/{id}` con body `{"excluded_from_arr": true/false}` para que el usuario excluya/incluya desde la UI
- El summary respeta `excluded_from_arr` en tiempo real (no hay re-sync necesario)
- UI de alertas: botón "Excluir del ARR" / "Incluir en ARR" en alertas tipo `OVERLAPPING_CONTRACTS`; al hacer toggle invalida la query del summary del dashboard

### Tests nuevos (57 total, antes 27)

- 5 tests en `test_arr_calculator.py`: overlap detection (no overlap por cuenta distinta, no overlap mismo cliente distinto producto, no overlap contratos consecutivos, solapamiento genera 2 alertas, 3 contratos solapados generan 6 alertas)
- 4 tests en `test_api.py`: `from_close` mode cambia primer mes, PATCH exclusion vacía el summary, PATCH 404 para ID inexistente, sync con 2 contratos solapados genera alertas `OVERLAPPING_CONTRACTS` con `arr_line_item_id` no nulo
- 2 tests de summary actualizados de `ARRMonthlySummary` a `ARRLineItem` (fuente de verdad ahora)

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

- `app/backend/core/alert_checker.py` — `check_overlapping_contracts()`
- `app/backend/api/routes/arr.py` — summary live + PATCH line-item
- `app/backend/db/migrations/versions/0003_add_overlaps.py`
- `app/frontend/app/page.tsx` — toggle from_start/from_close
- `app/frontend/app/alerts/page.tsx` — toggle excluir/incluir

---

## Proximo paso recomendado

**Prioridad 1 (cuando haya credenciales SF):** Cerrar Fase E — credenciales en `.env`, `test_sf_connection.py`, sync real, `validate_vs_excel.py`, activar cron en Railway.

**Prioridad 2 (funcionalidad de negocio):**
- Fase I-C: Toggle "desde cierre" en vista de consultores (actualmente solo en el dashboard general)
- Validar que `excluded_from_arr` se resetea correctamente en cada nuevo snapshot (comportamiento actual: cada snapshot genera nuevas alertas de solapamiento; las exclusiones de snapshots anteriores no se transfieren automáticamente — decisión de negocio pendiente)
