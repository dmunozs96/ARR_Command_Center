# Plantilla Minima de Excel para Upload Manual

**Fecha original:** 2026-04-19
**Ultima actualizacion:** 2026-09-03

## Fichero preparado

Se ha generado una plantilla minima en:

- [ARR Oportunidad - plantilla minima.xlsx](C:/Users/DanielMuñozSánchez/Documents/ARR_Command_Center/data_samples/raw_excel/ARR%20Oportunidad%20-%20plantilla%20minima.xlsx)

Esta plantilla ya incluye las 3 hojas que necesita la aplicacion:

- `Opos con Productos`
- `Productos SF SAAS`
- `País Consultor`

Y opcionalmente se admite una cuarta:

- `Mtricas_de_suscripciones_mensua` (serie de Author Online / Stripe)

---

## ⚠️ Cambio importante: la app casa columnas por NOMBRE DE CABECERA

Desde la version actual del importador, `Opos con Productos` **no se lee por posicion** salvo
como ultimo recurso. El importador:

1. Lee la **primera fila** como cabecera.
2. Normaliza cada nombre (minusculas, repara mojibake `latin1↔utf8`, quita acentos, sustituye
   todo lo no alfanumerico por espacios).
3. Busca cada campo contra una lista de **alias** aceptados.
4. **Solo si** no reconoce ninguna cabecera, cae al mapeo posicional de la tabla siguiente.

Consecuencia practica: **el orden de las columnas ya no importa** si los nombres de cabecera son
reconocibles. Se pueden añadir columnas nuevas sin romper nada.

### Alias aceptados por campo

| Campo | Alias (cualquiera vale) |
|---|---|
| Producto | `Nombre del producto`, `Producto`, `Product2.Name`, `Product Name` |
| Oportunidad | `Nombre de la oportunidad`, `Oportunidad`, `Opportunity.Name`, `Name` |
| Fecha de cierre | `Fecha de cierre`, `Fecha cierre`, `Close Date`, `CloseDate` |
| Precio unitario | `Precio de venta`, `Precio`, `UnitPrice`, `Sales Price` |
| Cantidad | `Cantidad`, `Quantity` |
| Cuenta | `Nombre de la cuenta`, `Cuenta`, `Account.Name`, `Account` |
| **Cuenta principal** | `Cuenta principal`, `Cuenta Principal`, `Parent Account`, `Account.Parent.Name` |
| Propietario | `Propietario de oportunidad`, `Propietario`, `Owner.Name` |
| Tipo de oportunidad | `Tipo`, `Opportunity.Type` |
| Canal | `Tipo de oportunidad`, `LeadSource`, `Canal` |
| Importe | `Importe`, `Amount` |
| Inicio de suscripcion | `Subscription Start Date`, `Inicio`, `ServiceDate` |
| Fin de suscripcion | `Subscription End Date`, `Fin`, `EndDate` |
| Meses de licencia | `Licence period (months)`, `Meses`, `Licence_Period_Months__c` |
| Linea de negocio | `Línea de negocio`, `Linea de negocio`, `Product2.Family` |
| Codigo de producto | `Product`, `ProductCode`, `Código producto`, `Codigo` |
| ID de oportunidad | `Opportunity.Id`, `Opportunity ID`, `Id oportunidad` |
| ID de linea | `Id`, `Line Item ID`, `OpportunityLineItem.Id` |

### Columna `Cuenta principal` (obligatoria desde V6)

Es la **cuenta padre** de Salesforce, en **texto** (nombre de cuenta, no ID). Vacia significa
que la cuenta es su propia principal. La app resuelve la **raiz** del grupo siguiendo la cadena
de forma transitiva, y todo el analisis por cliente (churn, new logo, up/down, gagero, top
cuentas, renovaciones) agrupa por esa raiz.

- Si la columna **no viene**, la app sigue funcionando: cada cuenta es su propio cliente
  (comportamiento anterior a V6). Pero el churn y el new logo quedaran inflados en los grupos
  empresariales.
- Si una misma cuenta aparece con **dos padres distintos**, se elige el primero por orden
  alfabetico y se genera la alerta `PARENT_ACCOUNT_CONFLICT`.

### Columnas de ID (opcionales pero recomendables)

Si el Excel trae los IDs reales de Salesforce, se usan. Si no, la app genera IDs sinteticos por
hash de `(oportunidad, cuenta, fecha_cierre, producto, precio, cantidad)`. Dos filas identicas
en esos campos colisionan y se colapsa la traza de auditoria; traer el `Id` real lo evita.

---

## Contenido minimo por hoja

### 1. `Opos con Productos`

Mapeo **posicional de respaldo** (solo se aplica si la cabecera no es reconocible):

| Columna | Campo esperado | Obligatorio |
|---|---|---|
| A | Propietario de oportunidad | recomendable |
| B | Nombre de la cuenta | recomendable |
| C | Nombre de la oportunidad | si |
| D | Tipo | no |
| E | Tipo de oportunidad / canal | no |
| F | Importe | no |
| G | Fecha de cierre | si |
| H | Fecha de creación | no |
| I | Etapa | no |
| J | Nombre del producto | si |
| K | Precio de venta | recomendable |
| L | Subscription Start Date | recomendable |
| M | Subscription End Date | recomendable |
| N | Licence period (months) | no |
| O | Línea de negocio | no |
| P | Cantidad | recomendable |
| Q | Product / product_code | no |
| R | Creado por | no |
| S | **Cuenta principal** | recomendable (ver arriba) |

Reglas minimas:

- Si falta `G` (fecha de cierre) o `J` (producto), la fila **no se procesa**.
- Si falta `L`, la app usa `G` como `effective_start_date` (flag `MISSING_START_DATE`).
- Si falta `M`, la app asume 365 dias desde la fecha de inicio (flag `MISSING_END_DATE`).
- Si falta `P`, la app usa cantidad `1`.
- Si falta `K`, la app usa precio `0`.

Formatos de fecha aceptados: fecha nativa de Excel, `dd/mm/aaaa`, `aaaa-mm-dd`, `mm/dd/aaaa` y
numero de serie de Excel. Cualquier otro formato se lee como vacio y dispara el fallback.

### 2. `Productos SF SAAS`

Estructura esperada:

| Columna | Campo esperado | Obligatorio |
|---|---|---|
| B | product_name | si |
| C | product_code | no |
| E | business_line | no |
| F | category | no |
| G | subcategory | no |
| H | product_type | si |

Reglas:

- La app construye la clave de busqueda como **`product_name|business_line`** y, si no la
  encuentra, cae al `product_name` solo (gana la primera aparicion). Esto permite que el mismo
  nombre de producto (p.ej. `Usuarios`) este clasificado distinto en cada linea de negocio.
- Si el producto de `Opos con Productos` no existe aqui, la app **intenta inferir** el tipo por
  la linea de negocio (`isEazy LMS` → `SaaS LMS`, etc.) siempre que el producto "parezca
  recurrente" (tiene fechas de suscripcion, o meses de licencia, o el nombre contiene
  `licencia`, `usuario`, `subscription`, `suscripcion`, `saas` o `plataforma`).
- Si tampoco puede inferirlo, lo crea como `[SIN ASIGNAR]`, genera `UNCLASSIFIED_PRODUCT` y
  **excluye esa fila del ARR**. Queda pendiente de clasificar a mano en `/config`.
- Solo cuenta como ARR el producto cuyo `product_type` **empieza por `SaaS`**. `TaaS`,
  `Implantacion`, servicios y contenidos quedan fuera por diseño.

### 3. `País Consultor`

La app busca una fila de cabecera cuyo valor en `C` sea `Consultor`.

Estructura esperada desde esa cabecera:

| Columna | Campo esperado | Obligatorio |
|---|---|---|
| C | Consultor | si |
| D | País | si |

Regla:

- Si no encuentra pais para el consultor de `Opos con Productos!A`, la fila sigue entrando pero se marca con `MISSING_COUNTRY` y el consultor se crea como `[SIN ASIGNAR]`.

### 4. `Mtricas_de_suscripciones_mensua` (opcional — Author Online / Stripe)

Hoja de metricas de suscripciones de Stripe. La app busca en la **columna A** una fila con
etiqueta `Ending MRR`; si no existe, usa la fila `Online anual`. Las **columnas desde la C**
son los meses.

- Fila `Ending MRR` → el valor se guarda tal cual.
- Fila `Online anual` → el valor se guarda dividido entre 12.
- Si la hoja **no viene**, la app **hereda** los valores de Author Online del ultimo snapshot
  completado, de modo que no se pierde esa linea de negocio al recargar.

> ⚠️ La semantica de este valor (¿ARR anual o MRR mensual?) esta pendiente de confirmar con
> negocio. El dashboard lo trata como **ARR anual** (lo suma sin multiplicar por 12). Ver
> [19 INC-01](./19_calculation_reference.md#inc-01) y Q-09 en
> [12_open_questions_and_risks.md](./12_open_questions_and_risks.md).

---

## Que pasa despues de subir el fichero

`POST /api/imports/excel` ejecuta, en este orden:

1. Lee las cuatro hojas.
2. Resuelve el **cliente consolidado** de cada fila (raiz del grupo empresarial).
3. Actualiza los maestros (upsert; nunca borra filas existentes).
4. Crea un **snapshot nuevo** (`sync_type = "excel_import"`); los anteriores no se tocan.
5. Calcula el ARR linea a linea y persiste flags de calidad y alertas.
6. Carga o hereda los valores de Author Online.
7. Marca el snapshot como `completed`.

Existe tambien `POST /api/imports/masters` para cargar **solo** los maestros
(`Productos SF SAAS` y/o `País Consultor`) sin crear snapshot.

---

## Campos calculados por la aplicacion

Estos campos no hace falta traerlos en el Excel porque la app los calcula:

- `sf_opportunity_id`
- `sf_line_item_id`
- `product_type`
- `is_saas`
- `effective_start_date`
- `effective_end_date`
- `real_price`
- `start_month`
- `end_month_normalized`
- `service_days`
- `daily_price`
- `annualized_value`
- `consultant_country`
- `data_quality_flags`

## Equivalencia con la logica heredada del Excel

La app reproduce estas columnas calculadas del flujo original:

- `U`: clasificacion de producto
- `V`: fecha inicio efectiva
- `W`: fecha fin efectiva
- `X`: real price
- `Y`: start month
- `Z`: end month normalized
- `AG`: pais consultor
- `AI`: daily price
- `AJ`: annualized value
