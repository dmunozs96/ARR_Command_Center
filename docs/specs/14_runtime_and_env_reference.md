# Runtime And Env Reference
**Fecha:** 2026-04-18
**Objetivo:** Tener en un solo sitio las variables de entorno necesarias para desarrollo y produccion.

---

## Backend

Archivo local esperado:
- `.env`

Variables:

| Variable | Requerida | Ejemplo | Uso |
|----------|-----------|---------|-----|
| `DATABASE_URL` | Si | `postgresql://arruser:arrpass@localhost:5432/arrdb` | Conexion de SQLAlchemy a PostgreSQL |
| `APP_ENV` | No | `development` | Entorno logico de la app |
| `LOG_LEVEL` | No | `INFO` | Nivel de logging backend |

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
- Todas las `SF_*` si se va a usar sync real

Frontend:
- `NEXT_PUBLIC_API_URL` si no se usa proxy/rewrite interno

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
