# Daily Sync Cron — Diseño e Instrucciones

Fecha: 2026-05-04

## Comportamiento

El cron llama a `POST /api/sync/cron/daily` una vez al día.

El backend:
1. Descarga todos los registros de Salesforce
2. Calcula un hash SHA-256 del conjunto de datos brutos
3. Si el hash coincide con el último snapshot completado → **skip** (no crea snapshot, solo loggea)
4. Si hay diferencias → crea un snapshot nuevo completo como siempre

Respuesta cuando hay cambios:
```json
{ "status": "completed", "skipped": false, "snapshot_id": "...", "records_processed": 42 }
```

Respuesta cuando no hay cambios:
```json
{ "status": "skipped", "skipped": true, "skip_reason": "SF data unchanged since last snapshot" }
```

---

## Variables de entorno necesarias

| Variable | Descripción |
|----------|-------------|
| `CRON_SECRET` | Token secreto que Railway envía en el header `x-cron-secret`. Generar con `openssl rand -hex 32`. |

---

## Configuración en Railway

### Opción A — Cron Job con Railway (recomendada)

1. En el proyecto Railway, ir a **New Service → Cron Job**
2. Configurar:
   - **Schedule:** `0 6 * * *` (06:00 UTC = 07:00 hora España en invierno)
   - **Command:**
     ```bash
     curl -s -X POST https://<dominio-backend>/api/sync/cron/daily \
       -H "x-cron-secret: $CRON_SECRET" \
       -H "Content-Type: application/json" \
       | jq .
     ```
3. Añadir la variable `CRON_SECRET` al servicio cron (misma que en el backend)
4. El servicio cron necesita `curl` y `jq` — usar imagen `alpine/curl` o similar

### Opción B — Cron externo (más simple para empezar)

Usar [cron-job.org](https://cron-job.org) (gratuito):
1. Crear cuenta y añadir un nuevo cron job
2. URL: `https://<dominio-backend>/api/sync/cron/daily`
3. Método: POST
4. Headers: `x-cron-secret: <valor de CRON_SECRET>`
5. Schedule: una vez al día a las 06:00 UTC

Ventaja: sin configuración adicional en Railway, funciona desde el día 1.

---

## Autenticación

El endpoint verifica el header `x-cron-secret`. Si no coincide con la variable `CRON_SECRET` del entorno, devuelve `401`.

El sync manual desde el botón de la UI (`POST /api/sync`) no requiere el secret — sigue funcionando igual.

---

## Runbook de troubleshooting

| Síntoma | Causa probable | Solución |
|---------|---------------|---------|
| `401` en cron | Secret incorrecto o no configurado | Verificar `CRON_SECRET` en Railway y en el cron job |
| `500` en cron | SF no configurado | Verificar variables `SF_*` en backend |
| Siempre `skipped` | Datos SF no cambian | Normal si no hay actividad en SF. Forzar con `POST /api/sync` manual |
| Snapshots diarios iguales | Hash match | Correcto — el sistema funciona como se diseñó |
