# Current State
**Ultima actualizacion:** 2026-05-04
**Agente:** Claude Sonnet 4.6 (sesion 17)

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
| A | Motor de calculo + infraestructura | completa | 17/17 |
| B | Backend API FastAPI | completa | parte de `pytest tests/` |
| C | Frontend Next.js | completa | TypeScript OK |
| D | Historial de snapshots en UI | completa | TypeScript OK |
| E | Integracion real con Salesforce | bloqueada | pendiente credenciales SF |
| F | Panel de alertas completo | completa | tests OK |
| G | Stripe UI completa + consultores exportables | completa | tests OK |
| H | Endurecimiento, e2e y UX final | **completa** | 27/27 backend, 3/3 e2e |
| — | Cron diario con dedup por hash | **completa** | 27/27 backend |

**Tests backend:** `pytest tests/` → **27/27 OK**  
**Frontend:** `npx tsc --noEmit` OK  
**E2E:** `npm run test:e2e` → **3/3 OK** (Playwright + Chromium instalados)

---

## Lo implementado en la sesion 17

### Fase H cerrada
- Playwright + Chromium instalados en `app/frontend`
- `playwright.config.ts` corregido: `baseURL` cambiado a `localhost`, timeouts a 15s
- `next.config.ts` con `allowedDevOrigins` para evitar bloqueo cross-origin en dev
- Tests e2e corregidos con locators precisos (combobox del sidebar vs main, texto duplicado)
- **3/3 tests e2e pasan**: dashboard, alertas (filtro + revision), stripe + consultores

### Cron diario con dedup por hash
- `compute_raw_hash()`: SHA-256 de los line items SF ordenados; detecta cualquier cambio
- `SnapshotManager.latest_data_hash()`: busca hash del ultimo snapshot SF completado
- `POST /api/sync`: ahora guarda `data_hash` en el snapshot; devuelve `skipped=true` si datos sin cambios
- `POST /api/sync/cron/daily`: nuevo endpoint protegido por header `x-cron-secret` (env `CRON_SECRET`)
- Migration `0002_add_snapshot_data_hash.py` para nueva columna en `snapshots`
- `SyncResponse`: ampliado con campos `skipped` y `skip_reason`
- 2 tests nuevos: rechazo de secret incorrecto, skip en datos identicos

### Preguntas de negocio resueltas (CFO)
- Q-03: ARR desde close won — backlog approach, toggle desde cierre vs desde inicio en Resumen
- Q-05: TaaS excluido del ARR SaaS — confirmado por SUMIF del Excel
- Q-06: Solapamientos — detectar + decidir linea a linea incluir/excluir; nueva alerta `OVERLAPPING_CONTRACTS` pendiente
- Q-07: Sync diaria con Opcion A (full fetch + skip por hash) — implementada

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

- `app/backend/api/routes/sync.py` — logica de cron + dedup
- `app/backend/core/snapshot_manager.py` — `compute_raw_hash`, `latest_data_hash`
- `app/backend/db/migrations/versions/0002_add_snapshot_data_hash.py`
- `app/frontend/playwright.config.ts` + `tests/e2e/`
- `docs/specs/12_open_questions_and_risks.md` — Q-03/Q-06 pendientes de implementar
- `docs/specs/18_daily_sync_cron.md` — instrucciones Railway cron

---

## Proximo paso recomendado

**Prioridad 1 (cuando haya credenciales SF):** Cerrar Fase E — `test_sf_connection.py`, sync real, `validate_vs_excel.py`, activar cron en Railway con `CRON_SECRET`.

**Prioridad 2 (funcionalidades de negocio pendientes):**
- Fase I-A: Toggle "desde cierre vs desde inicio" en dashboard (Q-03)
- Fase I-B: Deteccion de solapamientos + flag excluir/incluir por linea (Q-06)
