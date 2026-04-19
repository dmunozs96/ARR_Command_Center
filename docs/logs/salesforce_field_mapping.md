# Mapeo de Campos Salesforce -> ARR Command Center
**Fecha:** 2026-04-17
**Estado:** IMPLEMENTADO EN CODIGO, pendiente de verificacion en la instancia real de isEazy

---

## Resumen

En esta sesion se ha implementado el extractor real de Salesforce en:
- `app/backend/core/sf_extractor.py`
- `app/backend/api/routes/sync.py`
- `scripts/test_sf_connection.py`

El mapeo que sigue es el que **usa el codigo hoy**. Es un mapeo operativo y configurable por variables de entorno.

Importante:
- El 2026-04-17 se reintentó la verificacion operativa con `python scripts/test_sf_connection.py --sample-size 5`.
- La ejecucion falló antes de autenticar por falta de credenciales locales en `.env`: `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN`.
- En esta sesion no se pudieron confirmar API names reales desde la org ni lanzar una sync real.
- Los nombres marcados como "pendiente de verificacion real" deben confirmarse con el admin de Salesforce antes de considerar cerrada la Fase E.

---

## Variables de entorno que gobiernan el mapeo

Estas variables ya estan soportadas en `.env.example` y `app/backend/config/settings.py`:

| Variable | Default | Uso |
|----------|---------|-----|
| `SF_AUTH_URL` | `https://login.salesforce.com` | URL base del token OAuth2 |
| `SF_API_VERSION` | `60.0` | Version de API usada por `simple-salesforce` |
| `SF_SYNC_STAGE_NAME` | `Closed Won` | Stage de oportunidad a sincronizar |
| `SF_OPPORTUNITY_CHANNEL_FIELD` | `LeadSource` | Campo del canal / tipo de oportunidad comercial |
| `SF_LINEITEM_START_DATE_FIELD` | `ServiceDate` | Fecha inicio suscripcion |
| `SF_LINEITEM_END_DATE_FIELD` | `EndDate` | Fecha fin suscripcion |
| `SF_LINEITEM_LICENSE_MONTHS_FIELD` | `Licence_Period_Months__c` | Duracion en meses |
| `SF_LINEITEM_BUSINESS_LINE_FIELD` | `Product2.Family` | Linea de negocio |

---

## Mapeo implementado: Opportunity

| Campo app / Excel | API name usado en codigo | Estado |
|-------------------|--------------------------|--------|
| `sf_opportunity_id` | `Opportunity.Id` | Implementado |
| `opportunity_name` | `Opportunity.Name` | Implementado |
| `opportunity_type` | `Opportunity.Type` | Implementado |
| `opportunity_amount` | `Opportunity.Amount` | Implementado |
| `close_date` | `Opportunity.CloseDate` | Implementado |
| `channel_type` | `Opportunity.LeadSource` por defecto, configurable via `SF_OPPORTUNITY_CHANNEL_FIELD` | Pendiente de verificacion real |
| `opportunity_owner` | `Opportunity.Owner.Name` | Implementado |
| `account_name` | `Opportunity.Account.Name` | Implementado |
| Filtro sync | `Opportunity.StageName = 'Closed Won'` por defecto, configurable via `SF_SYNC_STAGE_NAME` | Pendiente de verificacion real |

Notas:
- Si el canal real en isEazy no vive en `LeadSource`, basta con cambiar `SF_OPPORTUNITY_CHANNEL_FIELD`.
- El extractor ya soporta tanto campos simples en Opportunity como rutas con punto si hiciera falta.

---

## Mapeo implementado: OpportunityLineItem

| Campo app / Excel | API name usado en codigo | Estado |
|-------------------|--------------------------|--------|
| `sf_line_item_id` | `Id` | Implementado |
| `product_name` | `Product2.Name` | Implementado |
| `product_code` | `Product2.ProductCode` | Implementado |
| `unit_price` | `UnitPrice` | Implementado |
| `quantity` | `Quantity` | Implementado |
| `subscription_start_date` | `ServiceDate` por defecto, configurable via `SF_LINEITEM_START_DATE_FIELD` | Pendiente de verificacion real |
| `subscription_end_date` | `EndDate` por defecto, configurable via `SF_LINEITEM_END_DATE_FIELD` | Pendiente de verificacion real |
| `licence_period_months` | `Licence_Period_Months__c` por defecto, configurable via `SF_LINEITEM_LICENSE_MONTHS_FIELD` | Pendiente de verificacion real |
| `business_line` | `Product2.Family` por defecto, configurable via `SF_LINEITEM_BUSINESS_LINE_FIELD` | Pendiente de verificacion real |

Notas:
- `EndDate` puede no existir o no estar habilitado en la org. Si el nombre real es custom, solo hay que cambiar la variable de entorno.
- `Licence_Period_Months__c` es una suposicion razonable basada en la documentacion, no una verificacion real.

---

## Mapeo implementado: Product2

| Campo app / Excel | API name usado en codigo | Estado |
|-------------------|--------------------------|--------|
| Nombre producto | `Product2.Name` | Implementado |
| Codigo producto | `Product2.ProductCode` | Implementado |
| Linea de negocio | `Product2.Family` por defecto | Pendiente de verificacion real |

---

## Consulta SOQL implementada

La query base generada por `SalesforceExtractor.build_query()` es:

```soql
SELECT
  Id,
  Opportunity.Id,
  Opportunity.Name,
  Opportunity.Type,
  Opportunity.Amount,
  Opportunity.CloseDate,
  Opportunity.CreatedDate,
  Opportunity.StageName,
  Opportunity.Owner.Name,
  Opportunity.Account.Name,
  Product2.Name,
  Product2.ProductCode,
  UnitPrice,
  Quantity,
  LeadSource,
  ServiceDate,
  EndDate,
  Licence_Period_Months__c,
  Product2.Family
FROM OpportunityLineItem
WHERE Opportunity.StageName = 'Closed Won'
ORDER BY Opportunity.CloseDate ASC
```

La query real cambia automaticamente si se ajustan las variables de entorno de mapeo.

---

## Verificado en codigo

- El extractor autentica via OAuth2 password grant contra `/services/oauth2/token`.
- El endpoint `POST /api/sync` ya usa el extractor real en vez del mock.
- El script `scripts/test_sf_connection.py` autentica, muestra la query y trae muestras.
- Tests backend:
  - `tests/test_salesforce_extractor.py`
  - `tests/test_api.py`
- Estado actual de tests: `pytest tests/` -> 44/44 OK

---

## Pendiente de verificacion real con admin de Salesforce

- [ ] Confirmar si el canal comercial sale realmente de `LeadSource` o de otro campo.
- [ ] Confirmar el API name real de la fecha fin de suscripcion.
- [ ] Confirmar el API name real de `Licence period (months)`.
- [ ] Confirmar si `Product2.Family` es la linea de negocio correcta o si existe un campo custom.
- [ ] Confirmar que `Closed Won` es el valor exacto de `StageName` en la org.
- [ ] Rellenar `.env` con credenciales reales de Salesforce.
- [ ] Ejecutar `python scripts/test_sf_connection.py --sample-size 5` con credenciales reales.
- [ ] Lanzar `POST /api/sync` y guardar el `snapshot_id` devuelto.
- [ ] Ejecutar `python scripts/validate_vs_excel.py --snapshot-id <snapshot_id>` para comparar el snapshot real contra el Excel importado.
- [ ] Sustituir en este documento los defaults por los nombres reales confirmados.

---

## Estado operativo verificado en esta sesion

Comandos ejecutados y resultado:

```bash
pytest tests/
```

- Resultado: `44/44 OK`

```bash
python scripts/test_sf_connection.py --sample-size 5
```

- Resultado: `Configuration error: Missing Salesforce configuration: SF_CLIENT_ID, SF_CLIENT_SECRET, SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN`

```bash
POST /api/sync
```

- Resultado: `500` con `Missing Salesforce configuration: SF_CLIENT_ID, SF_CLIENT_SECRET, SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN`

Nota operativa:
- Tambien falta levantar PostgreSQL local (`localhost:5432` rechazando conexion), por lo que aunque se rellenen las credenciales SF, antes de validar paridad hay que arrancar la BD y cargar el snapshot base de Excel si aun no existe.
