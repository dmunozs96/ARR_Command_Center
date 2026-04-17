# Plan de Integración con Salesforce
**Versión:** 1.0
**Fecha:** 2026-04-17
**Audiencia:** Técnicos y no técnicos (incluye explicaciones pedagógicas)

---

## Qué es Salesforce y por qué necesitamos conectarnos

Salesforce es el CRM (gestor de relaciones con clientes) donde isEazy registra todas sus oportunidades comerciales. Cuando un consultor cierra una venta, la registra en Salesforce con el cliente, el producto, el precio y las fechas.

La app de ARR necesita leer esos datos para calcular el ARR. En el Excel actual, alguien exporta manualmente un informe de Salesforce a Excel. La app lo hará automáticamente.

---

## Alternativas de integración evaluadas

| Opción | Cómo funciona | Ventajas | Desventajas | Recomendación |
|--------|--------------|----------|-------------|---------------|
| A: Export manual CSV | Alguien exporta SF a CSV y lo sube a la app | Sencillo, sin credenciales | Manual, no escalable | Solo como fallback temporal |
| B: Salesforce API (REST/SOQL) | La app llama directamente a SF | Automático, preciso, en tiempo real | Requiere configurar Connected App | **Recomendado para MVP** |
| C: Conector intermediario (MuleSoft, Zapier) | Herramienta de middleware | Fácil de configurar | Coste adicional, dependencia externa | No recomendado para MVP |
| D: Data Export programado de SF | SF genera un fichero ZIP periódico | Sin código en SF | Delay de hasta 24h, formato rígido | No recomendado |

**Decisión: Opción B — Salesforce REST API con OAuth2.**

---

## Cómo funciona la Salesforce API (explicado sin jerga)

Salesforce tiene una "puerta de acceso" para aplicaciones externas. Para que nuestra app pueda pasar por esa puerta necesita:

1. **Una "Connected App"** en Salesforce: es como crear un usuario especial para nuestra aplicación (no una persona, sino un programa).
2. **Credenciales**: client_id y client_secret (como usuario y contraseña, pero para la app).
3. **Un token de acceso**: Salesforce nos da un "llave temporal" (token) que usamos para hacer consultas.
4. **Consultas SOQL**: el lenguaje para hacer preguntas a Salesforce (parecido a SQL).

---

## Qué datos necesitamos extraer

### Objetos de Salesforce necesarios

#### 1. Opportunity (Oportunidad)
Campos necesarios:
```
Id
OwnerId → Owner.Name  (propietario)
AccountId → Account.Name  (cliente)
Name  (nombre de la oportunidad)
Type  (Nuevo negocio / Negocio existente / SAAS - Variable Invoicing)
Amount  (importe total)
CloseDate  (fecha de cierre)
CreatedDate
StageName  (filtrar: solo 'Closed Won')
LeadSource  (tipo de oportunidad: KAM, Inbound, etc.)
```

#### 2. OpportunityLineItem (Línea de producto)
Campos necesarios:
```
Id
OpportunityId  (FK a Opportunity)
Product2Id → Product2.Name  (nombre del producto)
UnitPrice  (precio de venta)
Quantity
ServiceDate  (Subscription Start Date)
EndDate  (Subscription End Date — puede necesitar campo personalizado)
Description
```
> **NOTA:** `ServiceDate` en SF corresponde a "Subscription Start Date". Para "Subscription End Date" puede ser `EndDate` o un campo personalizado dependiendo de la configuración de isEazy en SF. **Verificar con el admin de SF.**

#### 3. Product2 (Catálogo de productos)
Campos necesarios:
```
Id
Name  (nombre del producto)
ProductCode  (código del producto)
Family  (línea de negocio)
```

### Consulta SOQL principal
```soql
SELECT
  o.Id, o.Name, o.Type, o.Amount, o.CloseDate, o.CreatedDate,
  o.Owner.Name, o.Account.Name, o.LeadSource,
  oli.Id, oli.Product2.Name, oli.UnitPrice, oli.Quantity,
  oli.ServiceDate, oli.EndDate, oli.Description
FROM OpportunityLineItem oli
JOIN Opportunity o ON oli.OpportunityId = o.Id
WHERE o.StageName = 'Closed Won'
ORDER BY o.CloseDate ASC
```

> En Salesforce API, la forma real de hacer esto es consultar `OpportunityLineItem` con subconsultas relacionales.

---

## Proceso de ingestión: paso a paso

```
[Salesforce API]
      ↓  (SOQL query, paginada)
[Extractor]  → valida campos obligatorios, logea errores
      ↓
[Transformer]  → aplica cálculo ARR por línea (motor de cálculo)
      ↓
[Base de datos local]  → guarda raw data + calculated data
      ↓
[Snapshot creator]  → crea snapshot inmutable con timestamp
      ↓
[Alert checker]  → detecta anomalías (productos no clasificados, duraciones anómalas)
      ↓
[Dashboard]  → muestra resultados actualizados
```

---

## Cómo configurar la Connected App en Salesforce

> Esta sección es para el admin de Salesforce de isEazy o para alguien con acceso a configuración.

**Pasos:**
1. En Salesforce → Setup → App Manager → New Connected App.
2. Nombre: "ARR Command Center".
3. Activar "Enable OAuth Settings".
4. Callback URL: `http://localhost:8000/oauth/callback` (para MVP local).
5. Scopes: `api`, `refresh_token`.
6. Guardar → se genera `Consumer Key` (client_id) y `Consumer Secret` (client_secret).
7. Configurar el usuario de servicio con permisos de lectura en: Opportunity, OpportunityLineItem, Product2.

**Credenciales resultantes** (guardar en `.env`, nunca en el código):
```
SF_CLIENT_ID=xxxx
SF_CLIENT_SECRET=xxxx
SF_USERNAME=service_user@iseazy.com
SF_PASSWORD=xxxx
SF_SECURITY_TOKEN=xxxx
SF_INSTANCE_URL=https://iseazy.lightning.force.com
```

---

## Estrategia de sincronización

### Sincronización completa (full sync)
- Extrae TODAS las oportunidades cerradas desde SF.
- Reemplaza los datos existentes en la BD.
- Se usa para la primera carga y para re-sincronizaciones manuales.
- Duración estimada: < 5 minutos con ~14K registros.

### Sincronización incremental (delta sync) [V2]
- Solo extrae oportunidades modificadas o creadas desde la última sync.
- Usa `LastModifiedDate > :last_sync_time` como filtro.
- Más rápida pero más compleja de implementar (hay que manejar eliminaciones).

### Para el MVP: sincronización completa siempre.
Justificación: con 14K registros, una full sync tarda menos de 5 minutos. La complejidad del delta sync no vale la pena en esta etapa.

---

## Gestión de errores y logging

| Situación | Comportamiento |
|-----------|----------------|
| SF no responde | Reintentar 3 veces con backoff exponencial, luego error visible en UI |
| Token expirado | Renovar automáticamente con refresh_token |
| Campo vacío | Aplicar el fallback documentado (AS-01, AS-02), loguear |
| Producto no clasificado | Marcar como UNCLASSIFIED, crear alerta, no interrumpir el proceso |
| Duración anómala (>730 días) | Calcular igualmente, crear alerta de revisión |
| Error de red | Mantener los datos anteriores intactos, mostrar error |

Cada sincronización genera un log con:
```
timestamp: 2026-04-17T10:30:00
source: salesforce_full_sync
records_fetched: 14095
records_calculated: 14094
unclassified_products: 1
alerts_generated: 3
duration_seconds: 47
status: success
```

---

## Riesgos específicos de la integración

Ver `docs/logs/salesforce_integration_risks.md` para el catálogo completo.

Riesgos principales:
1. Los campos de suscripción en SF pueden tener nombres personalizados distintos a los estándar.
2. El límite de API de SF (por defecto 15.000 llamadas/día) puede ser insuficiente con sync frecuente.
3. El campo `EndDate` en OpportunityLineItem puede no estar habilitado.
4. Necesidad de un admin de SF para crear la Connected App.

---

## Preguntas que requieren acceso a Salesforce

Antes de implementar, el admin de SF debe confirmar:
1. ¿Cómo se llama exactamente el campo "Subscription End Date" en los line items?
2. ¿Hay campos personalizados relevantes que no estén en el estándar de SF?
3. ¿Cuántos registros devuelve la consulta? (para estimar límites de API)
4. ¿El usuario de servicio tiene permisos de lectura en los objetos necesarios?
5. ¿Se usa la URL `lightning.force.com` o `salesforce.com`?
