# Next Steps
**Ultima actualizacion:** 2026-05-04

---

## Estado actual

Fases A-H completadas. Cron diario implementado.

Bloqueos que siguen abiertos:
- faltan credenciales reales de Salesforce en `.env`
- PostgreSQL local no configurado en este entorno
- `npm run build` compila pero termina con `spawn EPERM` en Windows (no afecta Railway)

Verificaciones recientes:
- `pytest tests/` → **27/27 OK**
- `npx tsc --noEmit` → **OK**
- `npm run test:e2e` → **3/3 OK**

---

## FASE E — Integracion real con Salesforce

Pendiente para cerrarla de verdad:
- [ ] Levantar PostgreSQL local y cargar snapshot base Excel si aun no existe
- [ ] Configurar credenciales reales en `.env`:
  - `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN`, `SF_DOMAIN`
- [ ] Ejecutar `python scripts/test_sf_connection.py --sample-size 5`
- [ ] Verificar y corregir API names reales:
  - `SF_OPPORTUNITY_CHANNEL_FIELD`
  - `SF_LINEITEM_START_DATE_FIELD`
  - `SF_LINEITEM_END_DATE_FIELD`
  - `SF_LINEITEM_LICENSE_MONTHS_FIELD`
  - `SF_LINEITEM_BUSINESS_LINE_FIELD`
- [ ] Lanzar sync real via `POST /api/sync` y guardar `snapshot_id`
- [ ] Ejecutar `python scripts/validate_vs_excel.py --snapshot-id <snapshot_id>`
- [ ] Confirmar desviacion < 1% frente al Excel
- [ ] Actualizar `docs/logs/salesforce_field_mapping.md` con nombres verificados
- [ ] Configurar cron en Railway:
  - Añadir env var `CRON_SECRET` al servicio backend
  - Crear cron job en cron-job.org apuntando a `POST /api/sync/cron/daily`
  - Ver `docs/specs/18_daily_sync_cron.md` para instrucciones completas

---

## FASE I-A — Toggle ARR "desde cierre" vs "desde inicio" (Q-03)

El CFO quiere poder alternar en el dashboard entre dos criterios de ARR:
- **Desde inicio:** fecha efectiva de inicio del servicio (comportamiento actual)
- **Desde cierre (backlog):** fecha en que la oportunidad se marco como ganada (`close_date`)

Implementacion necesaria:
- [ ] Verificar que `close_date` se extrae de SF y se persiste en `RawOpportunityLineItem`
- [ ] Nuevo campo calculado en `ARRLineItem`: `arr_from_close_date`
- [ ] Toggle en el dashboard (UI) que alterna el criterio de calculo
- [ ] Endpoint o parametro en `GET /api/arr/summary` para `mode=from_start|from_close`
- [ ] Tests actualizados

---

## FASE I-B — Deteccion y gestion de solapamientos (Q-06)

Cuando dos line items del mismo cliente y producto se solapan en fechas, el ARR se dobla.

Implementacion necesaria:
- [ ] Logica de deteccion en `ARRCalculator` o `alert_checker`: comparar pares (account, product_type) con fechas solapadas
- [ ] Nueva alerta tipo `OVERLAPPING_CONTRACTS` con severidad `WARNING`
  - Incluir ambas oportunidades (IDs, nombres, fechas) en la descripcion
- [ ] Nuevo campo `excluded_from_arr` (bool) en `SnapshotAlert` o en `ARRLineItem`
- [ ] Toggle en la UI de alertas para incluir/excluir el line item solapado del ARR
- [ ] El calculo de ARR del dashboard debe respetar los flags de exclusion del snapshot activo
- [ ] Tests para el detector y para el endpoint PATCH que cambia el flag

---

## Comandos utiles

```bash
# Backend
pytest tests/

# Frontend
cd app/frontend
npx tsc --noEmit
npm run test:e2e

# Sync manual
curl -X POST http://localhost:8000/api/sync -H "Content-Type: application/json"

# Cron test local
curl -X POST http://localhost:8000/api/sync/cron/daily \
  -H "x-cron-secret: <CRON_SECRET>"
```
