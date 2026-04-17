# Mapeo de Campos Salesforce → ARR Command Center
**Fecha:** 2026-04-17
**Estado:** BORRADOR — requiere verificación con admin de SF de isEazy

---

## Leyenda

- ✅ Campo estándar SF, nombre confirmado por análisis del Excel
- ⚠️ Campo probablemente correcto pero requiere verificación
- ❓ Campo incierto — necesita verificación con admin SF
- 🚨 Campo crítico — sin él el cálculo falla

---

## Objeto: Opportunity

| Campo en Excel | Campo SF (API name) | Estado | Tipo SF | Notas |
|----------------|--------------------|----|------|-------|
| Propietario de oportunidad | `Owner.Name` | ✅ | Text | Via relación Owner |
| Nombre de la cuenta | `Account.Name` | ✅ | Text | Via relación Account |
| Nombre de la oportunidad | `Name` | ✅ | Text | |
| Tipo | `Type` | ✅ | Picklist | Valores: 'New Business', 'Existing Business', etc. Verificar valores exactos en SF de isEazy |
| Tipo de oportunidad | `LeadSource` | ⚠️ | Picklist | Puede ser campo personalizado. En Excel: KAM/Inbound/Outbound/Partner |
| Importe | `Amount` | ✅ | Currency | Importe total de la oportunidad |
| Fecha de cierre | `CloseDate` | ✅ 🚨 | Date | ISO 8601: yyyy-mm-dd |
| Fecha de creación | `CreatedDate` | ✅ | DateTime | |
| Etapa | `StageName` | ✅ | Picklist | Filtrar: `StageName = 'Closed Won'` |

---

## Objeto: OpportunityLineItem

| Campo en Excel | Campo SF (API name) | Estado | Tipo SF | Notas |
|----------------|--------------------|----|------|-------|
| Nombre del producto | `Product2.Name` | ✅ 🚨 | Text | Via relación Product2 |
| Precio de venta | `UnitPrice` | ✅ 🚨 | Currency | Precio unitario del line item |
| Subscription Start Date | `ServiceDate` | ⚠️ 🚨 | Date | Campo estándar SF para fecha inicio. Puede estar vacío |
| Subscription End Date | `EndDate` | ❓ 🚨 | Date | En SF estándar existe `EndDate` pero no siempre está habilitado. Puede ser campo personalizado |
| Licence period (months) | ❓ | ❓ | Number | No encontrado en SF estándar. Probablemente campo personalizado |
| Línea de negocio | `Product2.Family` | ⚠️ | Text | O puede ser campo personalizado del producto |
| Cantidad | `Quantity` | ✅ 🚨 | Number | |
| Product (código) | `Product2.ProductCode` | ✅ | Text | |
| Creado por | `CreatedBy.Name` | ✅ | Text | |

---

## Objeto: Product2

| Campo en Excel (Productos SF SAAS) | Campo SF (API name) | Estado | Notas |
|-------------------------------------|--------------------|----|------|
| Nombre del Producto | `Name` | ✅ 🚨 | Clave del VLOOKUP |
| Código del producto | `ProductCode` | ✅ | |
| Descripción del producto | `Description` | ✅ | |
| Línea de Negocio | `Family` | ⚠️ | Puede ser campo personalizado |

---

## Campos calculados en la app (no vienen de SF)

| Campo calculado | Origen |
|----------------|--------|
| Tipo de Producto Correcto | Lookup en tabla local ProductClassification |
| fecha inicio efectiva | ServiceDate o CloseDate (fallback) |
| fecha fin efectiva | EndDate o start+365 (fallback) |
| inicio mes | DATE(YEAR(start), MONTH(start), 1) |
| fin mes normalizado | inicio_mes + días_brutos - 1 |
| dias servicio | fin_mes_normalizado - inicio_mes |
| precio real | Quantity × UnitPrice |
| precio diario | precio_real / dias_servicio |
| servicio anualizado | precio_diario × 365 |
| país del consultor | Lookup en tabla local ConsultantCountry |
| is_saas | product_type starts with "SaaS" |

---

## Tabla de valores de Tipo de oportunidad (pendiente verificación)

El Excel tiene estos valores en col D:
- `Nuevo negocio`
- `Negocio existente`
- `SAAS - Variable Invoicing`

Y en col E (canal):
- `KAM`
- `Inbound`
- `Outbound`
- `Partner`
- (vacío)

**Verificar con admin SF** qué campo/picklist corresponde a cada uno en el SF de isEazy.

---

## Acciones pendientes

- [ ] Verificar nombre exacto del campo "Subscription End Date" en SF de isEazy.
- [ ] Verificar si "Licence period (months)" es campo personalizado y su API name.
- [ ] Verificar si "Tipo de oportunidad" (KAM/Inbound/etc.) viene de `LeadSource` u otro campo.
- [ ] Verificar valores exactos de la picklist `Type` en SF de isEazy.
- [ ] Confirmar URL del SF de isEazy (instance URL).
- [ ] Confirmar si hay campos personalizados relevantes en OpportunityLineItem.
