# Plantilla Minima de Excel para Upload Manual

Fecha: 2026-04-19

## Fichero preparado

Se ha generado una plantilla minima en:

- [ARR Oportunidad - plantilla minima.xlsx](C:/Users/DanielMuñozSánchez/Documents/ARR_Command_Center/data_samples/raw_excel/ARR%20Oportunidad%20-%20plantilla%20minima.xlsx)

Esta plantilla ya incluye las 3 hojas que necesita la aplicacion:

- `Opos con Productos`
- `Productos SF SAAS`
- `País Consultor`

## Contenido minimo por hoja

### 1. `Opos con Productos`

La app espera esta estructura posicional:

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

Reglas minimas:

- Si falta `G` o `J`, la fila no se procesa.
- Si falta `L`, la app usa `G` como `effective_start_date`.
- Si falta `M`, la app asume 365 dias desde la fecha de inicio.
- Si falta `P`, la app usa cantidad `1`.
- Si falta `K`, la app usa precio `0`.

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

Regla:

- Si el producto de `Opos con Productos!J` no existe aqui, la app genera `UNCLASSIFIED_PRODUCT` y excluye esa fila del ARR.

### 3. `País Consultor`

La app busca una fila de cabecera cuyo valor en `C` sea `Consultor`.

Estructura esperada desde esa cabecera:

| Columna | Campo esperado | Obligatorio |
|---|---|---|
| C | Consultor | si |
| D | País | si |

Regla:

- Si no encuentra pais para el consultor de `Opos con Productos!A`, la fila sigue entrando pero se marca con `MISSING_COUNTRY`.

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
