# Runtime And Env Reference
**Fecha original:** 2026-04-18
**Ultima actualizacion:** 2026-09-03
**Objetivo:** Tener en un solo sitio las variables de entorno necesarias para desarrollo y produccion.

---

## Backend

Archivo local esperado:
- `.env`

Variables:

| Variable | Requerida | Ejemplo | Uso |
|----------|-----------|---------|-----|
| `DATABASE_URL` | **Si** | `postgresql://arruser:arrpass@localhost:5432/arrdb` | Conexion de SQLAlchemy a PostgreSQL. **Sin ella la app no arranca** (`os.environ[...]`, no tiene default) |
| `APP_ENV` | No | `development` | Entorno logico de la app |
| `LOG_LEVEL` | No | `INFO` | Nivel de logging backend |
| `ANTHROPIC_API_KEY` | Solo para el ARR Expert | `sk-ant-...` | Clave de la API de Claude usada por `POST /api/expert/chat`. Si falta, ese endpoint devuelve **503** con mensaje explicativo; el resto de la app funciona con normalidad |
| `CRON_SECRET` | Solo para la sync programada | cadena aleatoria larga | Secreto compartido que protege `POST /api/sync/cron/daily`. Se envia en la cabecera `X-Cron-Secret`. Si esta vacia o no coincide → **401** |
| `FRONTEND_ORIGIN` | Recomendada en produccion | `https://mi-frontend.up.railway.app` | Origen adicional que se añade a la lista blanca de CORS, ademas de `localhost:3000`, `localhost:3001` y el dominio de Railway ya fijado en `main.py` |

Notas:
- El modelo de IA usado por el ARR Expert esta fijado en codigo
  (`app/backend/api/routes/expert.py`), no es configurable por entorno.
- La cabecera `Content-Disposition` se expone explicitamente en CORS para que la descarga del
  Excel funcione desde el navegador.

---

## Salesforce

Estas variables permiten la sync real de Fase E.

| Variable | Requerida para sync real | Ejemplo | Uso |
|----------|--------------------------|---------|-----|
| `SF_CLIENT_ID` | Si | `3MVG9...` | Consumer Key de la Connected App |
| `SF_CLIENT_SECRET` | Si | `1955279925675241571` | Consumer Secret de la Connected App |
| `SF_USERNAME` | Si | `service_user@iseazy.com` | Usuario de servicio |
| `SF_PASSWORD` | Si | `********` | Password del usuario de servicio |
| `SF_SECURITY_TOKEN` | Si | `********` | Security token del usuario |
| `SF_INSTANCE_URL` | No, pero recomendado | `https://isEazy.my.salesforce.com` | URL de la org |
| `SF_AUTH_URL` | No | `https://login.salesforce.com` | Base URL del token OAuth2 |
| `SF_API_VERSION` | No | `60.0` | Version de la API Salesforce |
| `SF_TIMEOUT_SECONDS` | No | `30` | Timeout de autenticacion y query |
| `SF_SYNC_STAGE_NAME` | No | `Closed Won` | Etapa de oportunidad incluida en la sync |
| `SF_OPPORTUNITY_CHANNEL_FIELD` | No | `LeadSource` | Campo del canal comercial |
| `SF_LINEITEM_START_DATE_FIELD` | No | `ServiceDate` | Campo de inicio de suscripcion |
| `SF_LINEITEM_END_DATE_FIELD` | No | `EndDate` | Campo de fin de suscripcion |
| `SF_LINEITEM_LICENSE_MONTHS_FIELD` | No | `Licence_Period_Months__c` | Campo de duracion en meses |
| `SF_LINEITEM_BUSINESS_LINE_FIELD` | No | `Product2.Family` | Campo de linea de negocio |

Notas:
- Sin las cinco credenciales principales, `POST /api/sync` devolvera error de configuracion.
- Los API names reales siguen pendientes de verificar contra la org.

---

## Frontend

Archivo local esperado:
- `app/frontend/.env.local`

Plantilla disponible:
- `app/frontend/.env.local.example`

Variables:

| Variable | Requerida | Ejemplo | Uso |
|----------|-----------|---------|-----|
| `NEXT_PUBLIC_API_URL` | No en local actual | `http://localhost:8000` | URL publica del backend |

Nota:
- Hoy el frontend usa rewrites en `next.config.ts`, por lo que en desarrollo local puede funcionar incluso sin esta variable.
- Aun asi, conviene mantener el archivo por claridad operativa.

---

## Minimo para desarrollo local

Backend:

```env
DATABASE_URL=postgresql://arruser:arrpass@localhost:5432/arrdb
APP_ENV=development
LOG_LEVEL=INFO
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Minimo para produccion

Backend:
- `DATABASE_URL`
- `APP_ENV=production`
- `LOG_LEVEL`
- `FRONTEND_ORIGIN` con el dominio real del frontend
- `ANTHROPIC_API_KEY` si se quiere el ARR Expert operativo
- `CRON_SECRET` si se activa la sync diaria programada
- Todas las `SF_*` si se va a usar sync real

Frontend:
- `NEXT_PUBLIC_API_URL` si no se usa proxy/rewrite interno

Ver [17_railway_deploy.md](./17_railway_deploy.md) para el detalle del despliegue.

---

## Comprobaciones utiles

Backend:

```bash
python scripts/test_sf_connection.py --sample-size 5
```

Frontend:

```bash
npx.cmd tsc --noEmit
```

Validacion funcional:

```bash
pytest tests/test_api.py
```
