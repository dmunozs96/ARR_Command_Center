# Next Steps
**Ultima actualizacion:** 2026-05-06

---

## Estado actual

Fases A-H + I-A + I-B completadas. Tests: 57/57 OK. TypeScript OK. E2E: 3/3 OK.

Bloqueos que siguen abiertos:
- faltan credenciales reales de Salesforce en `.env`
- PostgreSQL local no configurado en este entorno
- `npm run build` compila pero termina con `spawn EPERM` en Windows (no afecta Railway)

---

## FASE E — Integracion real con Salesforce

Pendiente para cerrarla de verdad:
- [ ] Levantar PostgreSQL local y ejecutar migración `alembic upgrade head` (incluye 0003)
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

## Pendientes de negocio menores

### Comportamiento exclusion entre snapshots
Actualmente `excluded_from_arr` vive en `arr_line_items` y es por snapshot. Al hacer un nuevo sync, los nuevos ARRLineItems tienen `excluded_from_arr=false` por defecto. Esto significa que las exclusiones de solapamientos del CFO no se transfieren al snapshot siguiente.

Opciones:
- **Opcion A (actual):** CFO re-revisa y re-excluye en cada snapshot nuevo. Simple, explícito.
- **Opcion B:** Al crear snapshot nuevo, copiar flags de exclusión del snapshot anterior para los mismos `sf_line_item_id`. Más automático pero puede "colar" exclusiones obsoletas.

Pendiente: confirmar con el CFO qué comportamiento prefiere.

### Toggle "desde cierre" en vista de consultores
El endpoint `/api/arr/by-consultant` aún usa `from_start` implícitamente. Si el CFO quiere ver el modo backlog también por consultor, añadir `mode` param al endpoint y la UI correspondiente.

---

## Comandos utiles

```bash
# Backend
pytest tests/

# Frontend
cd app/frontend
npx tsc --noEmit
npm run test:e2e

# Migraciones (con PG local)
alembic upgrade head

# Sync manual
curl -X POST http://localhost:8000/api/sync -H "Content-Type: application/json"

# Excluir un line item del ARR
curl -X PATCH http://localhost:8000/api/arr/line-items/<uuid> \
  -H "Content-Type: application/json" \
  -d '{"excluded_from_arr": true}'

# Cron test local
curl -X POST http://localhost:8000/api/sync/cron/daily \
  -H "x-cron-secret: <CRON_SECRET>"
```
