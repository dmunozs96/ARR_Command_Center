# Referencia de Cálculo — ARR Command Center (documento maestro)

**Versión:** 1.0
**Fecha:** 2026-09-03
**Estado:** VIGENTE — refleja el código en `main` @ commit `6404aed` (V6)
**Alcance:** todas las lógicas de cálculo del sistema: ARR, churn, retención, bridge, renovaciones, committed vs real y forecast de base instalada.

> Este documento sustituye funcionalmente al borrador
> [08_calculation_engine_draft.md](./08_calculation_engine_draft.md) (Abr-2026), que describía
> únicamente el motor de línea de producto y quedó desalineado con el código.
> Ante cualquier discrepancia entre documentos, **manda este**.
>
> Orden de lectura recomendado para alguien externo:
> 1. [02_business_context_arr.md](./02_business_context_arr.md) — qué es el ARR para isEazy
> 2. **este documento** — cómo se calcula todo
> 3. [05_functional_requirements.md](./05_functional_requirements.md) — qué hace la app
> 4. [09_dashboard_and_reporting_draft.md](./09_dashboard_and_reporting_draft.md) — qué se ve en pantalla
> 5. [../../DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) — sistema visual

---

## Índice

- [0. Principios y convenciones](#0-principios-y-convenciones)
- [1. Ingesta de datos](#1-ingesta-de-datos)
- [2. Tablas maestras y clasificación de producto](#2-tablas-maestras-y-clasificación-de-producto)
- [3. Identidad de cliente consolidada (grupo empresarial)](#3-identidad-de-cliente-consolidada-grupo-empresarial)
- [4. Motor de cálculo: ARR por línea de producto](#4-motor-de-cálculo-arr-por-línea-de-producto)
- [5. ARR mensual (stock) y los dos modos temporales](#5-arr-mensual-stock-y-los-dos-modos-temporales)
- [6. Author Online (Stripe)](#6-author-online-stripe)
- [7. Agregaciones por cliente, consultor y país](#7-agregaciones-por-cliente-consultor-y-país)
- [8. Núcleo de movimientos: la base común de Churn y Gágero](#8-núcleo-de-movimientos-la-base-común-de-churn-y-gágero)
- [9. Churn y retención de ingresos](#9-churn-y-retención-de-ingresos)
- [10. Gágero — puente (bridge) de ARR](#10-gágero--puente-bridge-de-arr)
- [11. Monitor de renovaciones](#11-monitor-de-renovaciones)
- [12. Committed vs Real (delta de implantación)](#12-committed-vs-real-delta-de-implantación)
- [13. Base Instalada Predictiva (forecast)](#13-base-instalada-predictiva-forecast)
- [14. Revisor de snapshots](#14-revisor-de-snapshots)
- [15. Alertas de calidad de dato](#15-alertas-de-calidad-de-dato)
- [16. Agrupación de líneas de negocio (LMS+AIO, Author total)](#16-agrupación-de-líneas-de-negocio-lmsaio-author-total)
- [17. KPIs del dashboard principal](#17-kpis-del-dashboard-principal)
- [18. Exportación a Excel](#18-exportación-a-excel)
- [19. Inconsistencias detectadas y decisiones pendientes](#19-inconsistencias-detectadas-y-decisiones-pendientes)
- [20. Trazabilidad código ↔ sección](#20-trazabilidad-código--sección)

---

## 0. Principios y convenciones

| Principio | Regla |
|---|---|
| Moneda | Todo en EUR. No hay conversión multi-divisa (Q-04 resuelta). |
| Unidad de cálculo | La **línea de producto** de una oportunidad (`OpportunityLineItem`), no la oportunidad. |
| Definición de ARR | Valor anualizado del contrato: `precio_diario × 365`. No es facturación ni caja. |
| Qué entra en ARR | Solo líneas cuyo `product_type` **empieza por `"SaaS"`** y que no estén excluidas manualmente. |
| Granularidad temporal | Mes natural. Todas las fechas de actividad se normalizan al día 1 del mes. |
| Punto en el tiempo | El ARR de un mes es un **stock** (fotografía), no un flujo acumulado. |
| Precisión | `Decimal` en todo el backend. `annualized_value` se persiste con 4 decimales; `daily_price` con 8. |
| Inmutabilidad | Cada carga de datos crea un **snapshot** independiente. Los snapshots no se recalculan hacia atrás; se re-suben. |
| Idempotencia del cálculo | Los endpoints analíticos **recalculan en vivo** desde `arr_line_items`, no leen agregados precocinados (así respetan exclusiones manuales posteriores). |

**Redondeo:** no se redondea en ningún paso intermedio del cálculo. Los porcentajes de la API se redondean a 2 decimales solo en la respuesta.

---

## 1. Ingesta de datos

Hay **dos vías de entrada**, y el ARR resultante es idéntico porque ambas terminan en el mismo motor (`ARRCalculator`).

### 1.A Carga manual de Excel — vía operativa actual

`POST /api/imports/excel` (multipart, `.xlsx`) → [`app/backend/core/excel_importer.py`](../../app/backend/core/excel_importer.py)

Hojas leídas:

| Hoja | Obligatoria | Contenido |
|---|---|---|
| `Opos con Productos` | **Sí** | Una fila por línea de producto de oportunidad ganada |
| `Productos SF SAAS` | No | Maestro de clasificación de productos |
| `País Consultor` | No | Maestro consultor → país |
| `Mtricas_de_suscripciones_mensua` | No | Serie de Author Online (Stripe) |

Si falta `Opos con Productos` → error 400. Si el Excel no trae hoja de Stripe, **se copian los valores de Stripe del último snapshot `completed`** (`copy_stripe_mrr`).

**Lectura de columnas.** El importador **casa por nombre de cabecera**, no por posición. El nombre se normaliza (minúsculas, se repara mojibake latin1↔utf8, se quitan acentos, todo lo no alfanumérico → espacio) y se busca contra una lista de alias:

| Campo | Alias aceptados |
|---|---|
| `product_name` | Nombre del producto, Producto, Product2.Name, Product Name |
| `opportunity_name` | Nombre de la oportunidad, Oportunidad, Opportunity.Name, Name |
| `close_date` | Fecha de cierre, Fecha cierre, Close Date, CloseDate |
| `unit_price` | Precio de venta, Precio, UnitPrice, Sales Price |
| `quantity` | Cantidad, Quantity |
| `account_name` | Nombre de la cuenta, Cuenta, Account.Name, Account |
| `opportunity_owner` | Propietario de oportunidad, Propietario, Owner.Name |
| `opportunity_type` | Tipo, Opportunity.Type |
| `channel_type` | Tipo de oportunidad, LeadSource, Canal |
| `subscription_start_date` | Subscription Start Date, Inicio, ServiceDate |
| `subscription_end_date` | Subscription End Date, Fin, EndDate |
| `licence_period_months` | Licence period (months), Meses, Licence_Period_Months__c |
| `business_line` | Línea de negocio, Linea de negocio, Product2.Family |
| `parent_account_name` | Cuenta principal, Cuenta Principal, Parent Account, Account.Parent.Name |

Si la primera fila no produce ninguna cabecera reconocible, hay un **fallback por posición fija** (columnas 0..18) para ficheros sin encabezado.

**Filtros de fila:** se descarta la fila si no hay `close_date` o no hay `product_name`.
**Valores por defecto:** `unit_price = 0`, `quantity = 1`, `opportunity_owner = "Unknown"`.

**Parseo de fechas** (`_parse_date_text`), en este orden:
1. `datetime`/`date` nativos de openpyxl → se usan tal cual
2. `%d/%m/%Y`, luego `%Y-%m-%d`, luego `%m/%d/%Y`
3. Número serie de Excel → `1899-12-30 + n días`
4. Si nada funciona → `None`

**Identificadores sintéticos.** El Excel no trae IDs de Salesforce, así que se generan de forma determinista:

```
opp_key           = f"{opportunity_name}-{account_name}-{close_date}"
sf_opportunity_id = "EXCEL_" + md5(opp_key)[:12].upper()

line_key          = f"{opp_key}-{product_name}-{unit_price}-{quantity}"
sf_line_item_id   = "EXCL_" + md5(line_key)[:13].upper()
```

Si el Excel sí trae columnas de ID (`Opportunity.Id`, `Id`, ...), se usan esas.
→ Ver [INC-06](#inc-06) sobre colisiones cuando dos filas son idénticas en esos campos.

### 1.B Sincronización con Salesforce — implementada, pendiente de credenciales

`POST /api/sync` y `POST /api/sync/cron/daily` (protegido por header `X-Cron-Secret` = `CRON_SECRET`)
→ [`sf_extractor.py`](../../app/backend/core/sf_extractor.py) + [`snapshot_manager.py`](../../app/backend/core/snapshot_manager.py)

**Deduplicación por hash.** Antes de crear snapshot se calcula:

```
data_hash = SHA-256( json ordenado de [ {id, opp, start, end, price, qty, product, close} por línea ] )
```

Si `data_hash` coincide con el del último snapshot `completed` de tipo `salesforce_full`, **no se crea snapshot** y la respuesta es `status="skipped"`. `force=True` lo salta.

### 1.C Diferencia relevante entre ambas vías

| | Excel (`excel_importer`) | Salesforce (`snapshot_manager`) |
|---|---|---|
| `sync_type` | `excel_import` | `salesforce_full` |
| `client_name` / `parent_account_name` | **Sí** se resuelven y persisten | **No** se rellenan (quedan NULL → COALESCE a `account_name`) |
| Alerta `OVERLAPPING_CONTRACTS` | **No se genera** | Sí |
| Alerta `PARENT_ACCOUNT_CONFLICT` | Sí | No aplica |
| `data_hash` | No se calcula | Sí |
| Stripe | Desde hoja Excel o copiado del snapshot anterior | No se carga (input manual en UI) |

→ Ver [INC-03](#inc-03).

---

## 2. Tablas maestras y clasificación de producto

### 2.1 `product_classifications`

Origen: hoja `Productos SF SAAS`, por posición de columna:

| Col | Campo |
|---|---|
| B (1) | `product_name` |
| C (2) | `product_code` |
| E (4) | `business_line` (“Línea de Negocio2”, mismo formato que la BBDD: `isEazy LMS`, …) |
| F (5) | `category` |
| G (6) | `subcategory` |
| H (7) | `product_type` ← **el campo que decide el ARR** |

**Clave compuesta.** Un mismo nombre de producto (p.ej. `Usuarios`) existe en varias líneas de negocio con clasificaciones distintas. Por eso el diccionario de lookup contiene **dos entradas por producto**:

```
products["Usuarios|isEazy LMS"] = "SaaS LMS"     ← clave compuesta (precisa)
products["Usuarios"]            = "SaaS LMS"     ← fallback por nombre (gana la 1ª aparición)
```

En el cálculo se intenta primero `f"{product_name}|{business_line}"` y solo si falla se usa `product_name`.

### 2.2 Cascada de resolución del `product_type`

Al importar, el `product_type` de cada producto se resuelve en este orden:

1. **Maestro del Excel** (`Productos SF SAAS`) o fila ya existente en BBDD.
2. **Inferencia heurística** (`_infer_product_type`) si el producto no está en el maestro:
   - se concatena `business_line + product_name` normalizados
   - se busca coincidencia contra el mapa:
     `iseazy lms | lms → SaaS LMS`, `iseazy author | author → SaaS Author`,
     `iseazy skills | skills → SaaS Skills`, `iseazy engage | engage → SaaS Engage`,
     `iseazy aio | aio → SaaS AIO`, `author online → Author Online`
   - **y además** debe “parecer recurrente” (`_looks_recurring_product`): tiene fecha de inicio o fin
     de suscripción, **o** tiene `licence_period_months`, **o** el nombre contiene alguna de:
     `licencia, licencias, usuario, usuarios, subscription, suscripcion, suscripción, saas, plataforma`
3. **Placeholder** `[SIN ASIGNAR]` si sigue sin resolverse → la línea se trata como **no clasificada**
   (ARR = 0, excluida, alerta `UNCLASSIFIED_PRODUCT`).

La tabla es editable desde `/config` (`GET/POST/PUT /api/config/products`). El cambio afecta a los **snapshots nuevos**, no recalcula los existentes.

### 2.3 Regla `is_saas`

```python
is_saas = product_type.startswith("SaaS")
```

Consecuencias directas y deliberadas:

- Entran: `SaaS LMS`, `SaaS AIO`, `SaaS Author`, `SaaS Engage`, `SaaS Skills`
- **No** entran: `TaaS` (Q-05 resuelta: TaaS no es ARR SaaS), `Implantación`, `Diseño Instruccional`,
  `Videos`, `Cursos`, `Plantillas`, `Catálogo de Servicios`, `Servicio de Formación`, `[SIN ASIGNAR]`
- **No** entra `Author Online`: no empieza por `"SaaS"`. Author Online **solo** llega vía Stripe
  (§6). Si una línea de Salesforce quedara clasificada como `Author Online`, su ARR sería 0.
  → Ver [INC-08](#inc-08).

`opportunity_type` (incluido `SAAS - Variable Invoicing`) **no** influye en el cálculo: solo el
`product_type` decide (Q-01 resuelta).

### 2.4 `consultant_countries`

Origen: hoja `País Consultor`. Se localiza la fila de cabecera buscando la celda normalizada
`consultor`; el país se toma de la columna `pais`/`country`, o de la columna siguiente si no
aparece. Consultores presentes en datos pero no en el maestro → `[SIN ASIGNAR]` + alerta
`MISSING_COUNTRY`. Editable en `/config`.

---

## 3. Identidad de cliente consolidada (grupo empresarial)

Implementado en V6 — [`core/client_identity.py`](../../app/backend/core/client_identity.py).
Spec de origen: [SPEC-V6](./SPEC-V6-parent-account-consolidation.md).

**Problema resuelto:** Salesforce modela grupos empresariales con una “Cuenta principal”. Si un
grupo factura un periodo por la sociedad A y el siguiente por la sociedad B, el análisis por
`account_name` cuenta **churn en A + new logo en B**, inflando ambos.

**Regla:**

```
1. Mapa global cuenta → padre directo, construido con TODAS las filas del fichero:
   si una cuenta declara padre en CUALQUIERA de sus filas, ese padre aplica a todas.
   Se ignora padre vacío y padre == cuenta.

2. Conflicto = una cuenta vista con dos padres distintos no vacíos
   → se elige el primero por orden lexicográfico (determinista)
   → se emite alerta PARENT_ACCOUNT_CONFLICT (nunca se descarta en silencio)

3. client_name = raíz del grupo, siguiendo la cadena transitivamente, con guarda de ciclos:
   EUROCAJA RURAL → Banco Cooperativo → Grupo Caja Rural  ⇒  client_name = "Grupo Caja Rural"
   (las tres sociedades quedan bajo la raíz, no bajo el padre directo)

4. Cuenta que nunca aparece como hija ⇒ client_name = su propio account_name
5. Cuenta vacía ⇒ client_name = "Sin cuenta"
```

Se persiste resuelto en `raw_opportunity_line_items.client_name`; el texto crudo queda en
`parent_account_name` solo para auditoría.

**Retrocompatibilidad:** snapshots anteriores a V6 tienen `client_name` NULL. Todos los endpoints
usan `COALESCE(client_name, account_name)` (`client_name_expr()` / `client_name_of()`), de modo que
esos snapshots se comportan como antes (cada cuenta es su propio cliente).

**Módulos que agrupan por `client_name`:** Churn, New Logo, Up/Down-selling, Gágero, ARR por
cliente, Top cuentas, Renovaciones, Committed vs Real (breakdown), ARR Expert.
**Módulos que siguen usando `account_name`:** detección de solapamientos
(`check_overlapping_contracts`) y el detalle línea a línea del Revisor de Snapshot.

---

## 4. Motor de cálculo: ARR por línea de producto

Núcleo del sistema: [`core/arr_calculator.py`](../../app/backend/core/arr_calculator.py),
método `_calculate_line_item`. Replica columna a columna la hoja `Opos con Productos` del Excel
original (las letras entre paréntesis son las columnas del Excel).

### 4.1 Algoritmo completo

```python
# --- Paso 1. Clasificar el producto (col U) ---
product_type = products.get(f"{product_name}|{business_line}") or products.get(product_name)

if product_type is None or product_type == "[SIN ASIGNAR]":
    → UNCLASSIFIED_PRODUCT
      is_saas = False, annualized_value = 0, exclude_from_arr = True, error = "UNCLASSIFIED_PRODUCT"
      (se rellenan campos de forma defensiva: start = close_date, end = close_date + 365d,
       service_days = 365, real_price = quantity × unit_price)
      FIN

is_saas = product_type.startswith("SaaS")

# --- Paso 2. Fechas efectivas (cols V y W) ---
if subscription_start_date is None:              # AS-01
    effective_start = close_date                 # flag MISSING_START_DATE
else:
    effective_start = subscription_start_date

if subscription_end_date is None:                # AS-02
    effective_end = effective_start + 365 días   # flag MISSING_END_DATE
else:
    effective_end = subscription_end_date

# --- Paso 3. Validación de coherencia ---
if effective_start > effective_end:
    → INVALID_DATES: annualized_value = 0, exclude_from_arr = True, service_days = 1
      FIN

# --- Paso 4. Precio real (col X) ---
real_price = quantity × unit_price
if real_price < 0:  flag NEGATIVE_PRICE  →  exclude_from_arr = True

# --- Paso 5. Normalización al mes (cols Y y Z) ---
start_month = effective_start con día = 1
raw_days    = (effective_end - effective_start).days          # col AB

if raw_days == 0:
    end_month_normalized = start_month + 30 días               # flag DURATION_ZERO_FALLBACK
else:
    end_month_normalized = start_month + (raw_days - 1) días   # col Z

# --- Paso 6. Días de servicio (col AH / AA) ---
service_days = (end_month_normalized - start_month).days
if service_days <= 0:
    service_days = 30                                          # flag DURATION_ZERO_FALLBACK
if service_days < 15:
    flag DURATION_ANOMALY_LOW

# --- Paso 7. ARR (cols AI y AJ) ---
daily_price      = real_price / service_days
annualized_value = daily_price × 365
if is_saas and annualized_value > 1.000.000:
    flag HIGH_ARR_FLAG

# --- Paso 8. País del consultor (col AG) ---
consultant_country = consultant_countries.get(opportunity_owner, "Unknown")
if consultant_country in ("Unknown", "[SIN ASIGNAR]"):
    flag MISSING_COUNTRY
```

### 4.2 Los dos detalles que más sorprenden (y son intencionados)

**(a) `service_days = raw_days − 1`, no `raw_days`.**

Porque `end_month_normalized = start_month + (raw_days − 1)` y `service_days` se mide desde
`start_month`. Efecto en la anualización:

| Contrato | `raw_days` | `service_days` | `annualized_value` |
|---|---|---|---|
| 2025-01-01 → 2026-01-01 | 365 | 364 | `precio × 365/364` = **+0,275 %** |
| 2025-01-01 → 2025-12-31 | 364 | 363 | `precio × 365/363` = **+0,551 %** |
| 2025-01-01 → 2025-07-01 (6 meses) | 181 | 180 | `precio × 2,0278` |

Es un *off-by-one* heredado del Excel. Se mantiene deliberadamente (ADR-001: replicar el Excel
fielmente en el MVP) para que las cifras de la app cuadren con las históricas del CFO.
→ Ver [INC-05](#inc-05) si se quisiera corregir.

**(b) `end_month_normalized` se ancla en `start_month`, no en `effective_end`.**

La duración se “desplaza” al principio del mes de inicio. Ejemplo:

```
effective_start = 2025-01-20
effective_end   = 2026-01-19      raw_days = 364
start_month          = 2025-01-01
end_month_normalized = 2025-01-01 + 363d = 2025-12-30   ← NO 2026-01-19
```

Es decir, el contrato se considera activo de **ene-2025 a dic-2025** (12 meses), no de ene-2025 a
ene-2026 (13 meses). Es exactamente el motivo por el que el Excel lo hacía así: evita que un
contrato anual aparezca activo en 13 meses distintos.

### 4.3 Salida persistida (`arr_line_items`)

| Campo | Significado |
|---|---|
| `product_type`, `is_saas` | Clasificación resuelta |
| `effective_start_date`, `effective_end_date` | Fechas tras fallbacks |
| `used_start_fallback`, `used_end_fallback` | Si se aplicó AS-01 / AS-02 |
| `start_month`, `end_month_normalized` | Ventana de actividad normalizada al mes |
| `service_days` | Denominador de la anualización |
| `real_price`, `daily_price`, `annualized_value` | Cadena de cálculo |
| `consultant_country` | Lookup del maestro |
| `data_quality_flags` | JSONB con la lista de flags |
| `excluded_from_arr` | **Editable a mano** vía `PATCH /api/arr/line-items/{id}` |

`excluded_from_arr` es la palanca de gobierno: permite excluir un contrato concreto del ARR (caso
típico: solapamiento con su propia renovación) sin tocar Salesforce. **Todos** los endpoints
analíticos la respetan.

### 4.4 Catálogo de flags

| Flag | Severidad | ¿Excluye del ARR? | Origen |
|---|---|---|---|
| `UNCLASSIFIED_PRODUCT` | error | **Sí** | Producto sin `product_type` o `[SIN ASIGNAR]` |
| `INVALID_DATES` | error | **Sí** | `effective_start > effective_end` |
| `NEGATIVE_PRICE` | error | **Sí** | `quantity × unit_price < 0` |
| `MISSING_START_DATE` | warning | No | Se usó `close_date` como proxy |
| `MISSING_END_DATE` | warning | No | Se asumieron 365 días |
| `DURATION_ZERO_FALLBACK` | warning | No | Duración 0 → 30 días |
| `DURATION_ANOMALY_LOW` | warning | No | `service_days < 15` |
| `HIGH_ARR_FLAG` | warning | No | ARR anualizado > 1.000.000 € (solo SaaS) |
| `MISSING_COUNTRY` | info | No | Consultor sin país |

Tres flags se registran en la línea pero **no generan alerta** para no hacer ruido:
`MISSING_START_DATE`, `MISSING_END_DATE`, `DURATION_ZERO_FALLBACK`.

---

## 5. ARR mensual (stock) y los dos modos temporales

`GET /api/arr/summary` → [`api/routes/arr.py`](../../app/backend/api/routes/arr.py)

### 5.1 Universo

```sql
FROM arr_line_items a JOIN raw_opportunity_line_items r ON a.raw_line_item_id = r.id
WHERE a.snapshot_id = :sid
  AND a.is_saas = TRUE
  AND a.excluded_from_arr = FALSE
  [AND COALESCE(r.client_name, r.account_name) = :account_name]
```

### 5.2 Test de actividad en el mes M

```
activo_en(M)  ⟺  active_start ≤ último_día(M)  AND  end_month_normalized ≥ primer_día(M)
```

Como `active_start` es **siempre día 1** de un mes, esto equivale a
`active_start ≤ M AND end_month_normalized ≥ M`. Ambas formulaciones aparecen en el código
(`/summary` usa la primera, el núcleo de movimientos §8 la segunda) y son **matemáticamente
equivalentes**.

```
ARR(M) = Σ annualized_value  de todas las líneas activas en M
```

### 5.3 Los dos modos: `from_start` y `from_close`

Selector global en el sidebar (`ARRModeToggle`, persistido en `localStorage`, clave
`arr-command-center-mode`). Se propaga como `?mode=` a `/summary`, `/by-account`,
`/by-consultant`, `/gagero/bridge`, `/churn/monthly`, `/churn/monthly-trend` y la exportación Excel.

```python
def _active_start_month(arr, raw, mode):
    if mode == "from_close":
        if (raw.opportunity_type.lower().strip() == "nuevo negocio"
                and raw.subscription_start_date is not None
                and raw.close_date < raw.subscription_start_date):
            return raw.close_date.replace(day=1)
    return arr.start_month
```

| | `from_start` (defecto) | `from_close` |
|---|---|---|
| Pregunta que responde | ¿Cuánto ARR está **en servicio**? | ¿Cuánto ARR está **firmado**? |
| Inicio de actividad | `start_month` (mes de inicio de suscripción) | mes de `close_date`, **solo si** el tipo es exactamente `"nuevo negocio"` **y** existe fecha de inicio **y** el cierre es anterior a ella |
| Resto de casos | — | idéntico a `from_start` |
| `end_month_normalized` | sin cambios | **sin cambios** (no se recalcula) |

Consecuencia importante: en `from_close` un contrato de nuevo negocio **dura más meses**, porque
se le añaden los meses entre el cierre y el inicio del servicio sin acortar el final. El delta
entre ambos modos es precisamente lo que mide el módulo Committed vs Real (§12).

En `/summary` modo `from_close` se descartan además las líneas donde
`active_start > end_month_normalized`.

### 5.4 Rango de meses y serie devuelta

- `range_start = month_from` o, si no se indica, el mínimo `active_start` del universo
- `range_end = month_to` o, si no se indica, el máximo `end_month_normalized`
- Se generan todos los meses del rango; los meses sin ningún importe **no aparecen** en la serie
- Filtro de línea de negocio: `product_type` (uno) o `product_types` (CSV; se aplica **después**
  de fijar el rango, de modo que el eje temporal no cambia al filtrar)

Por cada mes:

```
total_arr  = Σ by_product_type
mom_change = total_arr(M) − total_arr(M−1)          (null en el primer punto)
mom_pct    = mom_change / total_arr(M−1) × 100      (null si el anterior es 0)
```

### 5.5 `arr_monthly_summary`: agregado precalculado

Se escribe en el import (una fila por `snapshot × mes × product_type`, con `line_items_count`),
pero **los endpoints analíticos no lo usan** para calcular ARR: solo sirve para resolver “el último
mes disponible” cuando `/by-consultant` se llama sin `month`. Motivo: el agregado se congela en el
import y no reflejaría las exclusiones manuales posteriores.

---

## 6. Author Online (Stripe)

Author Online es la única línea de negocio que **no** proviene de Salesforce. Se alimenta de la
tabla `snapshot_stripe_mrr` (`snapshot_id`, `month`, `mrr`, `entered_by`, `entered_at`).

### 6.1 Entrada del dato

1. **Manual en la UI** `/stripe` → `PUT /api/stripe-mrr` (un mes) o `POST /api/stripe-mrr/bulk`
   (carga masiva desde Excel/plantilla). La columna de la tabla se rotula **“ARR (EUR)”**.
2. **Desde el Excel de carga**, hoja `Mtricas_de_suscripciones_mensua`:
   - se busca la fila con etiqueta normalizada `ending mrr`; si no existe, la fila `online anual`
   - las columnas desde el índice 2 son los meses
   - valor almacenado = el de `ending mrr` tal cual, **o** `online anual / 12`
3. **Herencia:** si el Excel no trae hoja de Stripe, se copian los valores del último snapshot
   `completed`.

### 6.2 Cómo entra en el ARR

En `/api/arr/summary`:

```python
by_type["Author Online"] += snapshot_stripe_mrr.mrr   # sin multiplicar por 12
```

Es decir, **el valor guardado se trata como ARR anual ya anualizado** (decisión explícita del
commit `2f22605`, “Stripe ARR: field is already annualized, remove x12 multiplication”).

Se incluye **solo si**:
- no hay filtro de cliente (`account_name`), **y**
- no hay filtro de línea de negocio, **o** el filtro es/incluye `"Author Online"`

Los meses sin dato de Stripe simplemente **no suman nada** (no se interpola el último valor
conocido). → Ver [INC-04](#inc-04).

En `/api/arr/by-consultant` aparece como una fila sintética `[Author Online Stripe]` con país `-`,
para que el total por consultor cuadre con el dashboard.

→ La semántica del campo `mrr` es inconsistente entre módulos: ver [INC-01](#inc-01).

---

## 7. Agregaciones por cliente, consultor y país

### 7.1 `GET /api/arr/by-account` — Top N clientes

- Universo §5.1, con filtros de `product_type(s)`, `consultant`, `account_name` y `mode`
- Se acumula `annualized_value` por `(client_name, mes)` para cada mes del rango
- Meses: o los del rango `month_from..month_to`, o una lista explícita en `months` (CSV)
- **Ranking:** por `total_arr` = **suma del ARR de todos los meses del rango**, no por el ARR del
  último mes. Un cliente presente muchos meses con poco ARR puede rankear por encima de uno
  reciente con mucho ARR.
- Se devuelven las `limit` primeras (defecto 20, máx. 100) y un bucket `"Otros"` con el resto
- Por cliente: `by_month`, `total_arr`, `first_month_arr`, `last_month_arr`,
  `delta = last_month_arr − first_month_arr`
- **No incluye Stripe/Author Online** (Stripe no tiene dimensión de cliente)

### 7.2 `GET /api/arr/by-consultant`

- **Punto en el tiempo**, no rango: `active_start ≤ month_start AND end_month_normalized ≥ month_start`
- Si no se pasa `month`, se usa `MAX(arr_monthly_summary.month)` del snapshot
- Agrupa por `opportunity_owner`; `country` se toma del `consultant_country` de la línea
- MoM: se recalcula el mismo universo para `month − 1` y se compara por consultor
  (`mom_pct = null` si el mes anterior es 0)
- Filtro `country` disponible; fila sintética de Stripe según §6.2

### 7.3 Nivel 2 de consultores

El drill-down de un consultor reutiliza `/by-account` con `consultant=` y `product_type=`, de modo
que “clientes de este consultor en esta línea” usa exactamente la misma matemática que el Top N.

---

## 8. Núcleo de movimientos: la base común de Churn y Gágero

Función única compartida: `_get_arr_by_account_bl` en
[`api/routes/gagero.py`](../../app/backend/api/routes/gagero.py). **Todo el análisis de variaciones
del sistema se apoya en ella.**

```python
def _get_arr_by_account_bl(db, snapshot_id, month, product_type, account_name,
                           product_types=None, mode="from_start") -> dict[(str, str), Decimal]:
    # SaaS, no excluidas, end_month_normalized >= month
    # se descarta la línea si _active_start_month(...) > month
    # clave = (client_name_of(raw), product_type)
    # valor = Σ annualized_value
```

**Salida:** un diccionario `{(cliente_consolidado, línea_de_negocio): ARR}` que es la **fotografía
puntual** del primer día de `month`.

### 8.1 Clave de movimiento

```
clave = (client_name, product_type)
```

Esta es la decisión de diseño más determinante de todo el módulo de churn:

- ✅ Un grupo empresarial que mueve el contrato entre sus sociedades **no** genera churn+new logo
  (§3).
- ⚠️ Un cliente que **migra de línea de negocio** (p.ej. de `SaaS LMS` a `SaaS AIO`) **sí** genera
  `churn` en LMS y `new_logo` en AIO simultáneamente. Es intencionado: permite leer el churn por
  línea de negocio. Ver §16 sobre los límites de la agrupación LMS+AIO en este punto.

### 8.2 Clasificación de un movimiento A → B

Para cada clave presente en A o en B (`a = ARR en mes A`, `b = ARR en mes B`):

| Condición | Tipo | Importe imputado |
|---|---|---|
| `a = 0` y `b > 0` | `new_logo` | `+b` |
| `a > 0` y `b = 0` | `churn` | `−a` (y `churned_logos += 1`) |
| `a > 0` y `0 < b < a` | `down_selling` | `−(a − b)` |
| `a > 0` y `b > a` | `up_selling` | `+(b − a)` |
| resto (`a = b`) | `unchanged` | 0 |

Identidad que siempre se cumple:

```
ARR(B) − ARR(A) = new_logo + up_selling − churn − down_selling
```

---

## 9. Churn y retención de ingresos

Módulo `/churn` → [`api/routes/churn.py`](../../app/backend/api/routes/churn.py).
Hay **dos familias de métricas** que responden a preguntas distintas y **no son intercambiables**.

### 9.1 Familia A — Churn mensual (variación total de cartera)

`GET /api/churn/monthly` y `GET /api/churn/monthly-trend`

```
mes_anterior = month_from   si se pasa   (permite comparar periodos arbitrarios, no solo M-1)
               month − 1    si no
previous = _get_arr_by_account_bl(mes_anterior, ..., mode)
current  = _get_arr_by_account_bl(month,        ..., mode)
```

**Inyección de Author Online.** Si hay dato de Stripe en alguno de los dos meses, se añade la clave
sintética `("[Author Online Stripe]", "Author Online")` a ambos diccionarios. Esta clave solo puede
clasificarse como `up_selling` o `down_selling` — **nunca** como `churn` ni `new_logo`, porque un
agregado de miles de suscripciones autoservicio no “se da de baja” como logo.

**Métricas:**

```
arr_start        = Σ previous            (incluye Author Online)
arr_end_existing = Σ current[k] para k ∈ previous     (excluye new logos)

churn_arr        = Σ previous[k]                  donde current[k] = 0
down_selling_arr = Σ (previous[k] − current[k])   donde 0 < current[k] < previous[k]
up_selling_arr   = Σ (current[k] − previous[k])   donde current[k] > previous[k]
new_logo_arr     = Σ current[k]                   donde previous[k] = 0

net_existing_change = up_selling_arr − churn_arr − down_selling_arr

gross_arr_churn_rate = churn_arr / arr_start × 100
down_selling_rate    = down_selling_arr / arr_start × 100
up_selling_rate      = up_selling_arr / arr_start × 100
net_arr_churn_rate   = (churn_arr + down_selling_arr − up_selling_arr) / arr_start × 100

GRR = (arr_start − churn_arr − down_selling_arr) / arr_start × 100                    → capado a 100
NRR = (arr_start − churn_arr − down_selling_arr + up_selling_arr) / arr_start × 100   → sin capar

churned_logos     = nº de claves con previous > 0 y current = 0
total_logos_start = nº de claves de SALESFORCE con previous > 0   (Author Online NO cuenta)
logo_churn_rate   = churned_logos / total_logos_start × 100
```

Si `arr_start = 0`, todas las tasas son 0.
El detalle (`items`) se ordena por `|delta|` descendente.

**Lectura de negocio:** GRR y NRR aquí son **mensuales**, no anuales. Un NRR mensual del 99,5 %
equivale a ~94 % anual compuesto.

### 9.2 Familia B — Ratios de cohorte con ventana LTM/YTD

`GET /api/churn/ratios`, `/rolling`, `/churned-accounts`, `/by-product-type`

```
mes_B = el que se pide
mes_A = mes_B − 12 meses        si window = "ltm"
        1 de enero del año de B si window = "ytd"

cohorte = { k : ARR_A[k] > 0 }        ← solo clientes×BL que ya existían en A
arr_cohort_start = Σ cohorte
```

Sobre esa cohorte fija (los new logos aparecidos entre A y B **se ignoran**):

```
churn_eur        = Σ cohorte[k]                donde ARR_B[k] = 0
down_selling_eur = Σ (cohorte[k] − ARR_B[k])   donde 0 < ARR_B[k] < cohorte[k]
up_selling_eur   = Σ (ARR_B[k] − cohorte[k])   donde ARR_B[k] > cohorte[k]

GRR = (arr_start − churn − down) / arr_start × 100        → capado a 100
NRR = (arr_start − churn − down + up) / arr_start × 100   → sin capar
logo_churn_rate = churned_logos / nº claves de la cohorte × 100
```

**Diferencias operativas frente a la Familia A** (importante al interpretar la página, donde
conviven ambas):

| | Familia A (`/monthly`) | Familia B (`/ratios`, `/rolling`, …) |
|---|---|---|
| Ventana | Mes a mes (o periodo libre) | 12 meses (LTM) o YTD |
| Base | Toda la cartera del mes anterior | Cohorte fija del mes A |
| New logos | Se reportan (`new_logo_arr`) | Se ignoran |
| Author Online (Stripe) | **Incluido** | **Excluido** |
| Parámetro `mode` | Aceptado (`from_start`/`from_close`) | **No aceptado** → siempre `from_start` |

→ Ver [INC-07](#inc-07).

### 9.3 `/rolling` — serie temporal de NRR/GRR

Recorre todos los meses desde `MIN(start_month)` hasta `MIN(month_to, MAX(end_month_normalized))`
del snapshot y, por cada uno, calcula la Familia B. Se **omite** un punto si:
- `mes_A < primer mes con datos` (la ventana no cabe), o
- la cohorte está vacía (`total_logos = 0`)

### 9.4 `/churned-accounts` — clientes perdidos y **cuándo**

Para cada clave de la cohorte con `ARR_B = 0`, el mes de churn es el **primer** mes del intervalo
`(mes_A + 1) … mes_B` en el que su ARR es 0; si nunca se encuentra, se imputa `mes_B`. Se cachea
la fotografía de cada mes para no repetir consultas. Salida ordenada por `arr_lost` descendente.

### 9.5 `/by-product-type` — bajas por línea de negocio

Para cada mes del rango, compara `M−1` vs `M` y agrupa por `product_type` el ARR de las claves que
pasan de `>0` a `0`. Es churn puro (sin downselling) y **sin** Author Online.

---

## 10. Gágero — puente (bridge) de ARR

`GET /api/gagero/bridge?month_a=&month_b=&mode=` → mismo núcleo §8 con dos meses **arbitrarios**.

```
arr_a = Σ _get_arr_by_account_bl(month_a)
arr_b = Σ _get_arr_by_account_bl(month_b)
net_change     = arr_b − arr_a
net_change_pct = net_change / arr_a          ← FRACCIÓN (0,07 = 7 %), no porcentaje
```

Devuelve las cuatro categorías (`new_logo`, `churn`, `up_selling`, `down_selling`) con
`total_delta`, `count` y **la lista completa de items** `(account_name, product_type, arr_a, arr_b,
delta)`, cada lista ordenada por `|delta|` descendente, más `unchanged_count`.

Es la vista de auditoría: permite responder “¿por qué el ARR ha subido 340 k€ entre enero y junio?”
bajando hasta el cliente concreto. No incluye Author Online.

---

## 11. Monitor de renovaciones

`GET /api/renewals/monitor?horizon_months=` (1–24, defecto 6)
→ [`api/routes/renewals.py`](../../app/backend/api/routes/renewals.py)

Trabaja sobre **hoy** (`date.today()`), no sobre un mes seleccionado.

```
current_month = hoy con día 1
horizon_end   = hoy + horizon_months

Agrupar líneas SaaS no excluidas por (client_name, product_type):

  activos = líneas con start_month ≤ current_month ≤ end_month_normalized
  si no hay activos → se descarta el grupo

  expiry = MAX(end_month_normalized de los activos)
  si NO (hoy ≤ expiry ≤ horizon_end) → se descarta el grupo

  # ¿hay renovación ya firmada en el snapshot?
  renovaciones        = líneas del mismo grupo con start_month > expiry
  first_renewal_month = MIN(start_month de renovaciones)
  signed_renewals     = las que arrancan exactamente en first_renewal_month

  current_arr = Σ daily_price × días_del_mes(current_month)
  renewal_arr = Σ daily_price × días_del_mes(first_renewal_month)   (null si no hay renovación)

  renewal_delta_pct = (renewal_arr − current_arr) / current_arr × 100
  months_remaining  = meses completos entre hoy y expiry (mínimo 0)
  status            = "renewed" si hay renovación, "at_risk" si no
```

**⚠️ `current_arr` y `renewal_arr` son importes MENSUALES** (`precio_diario × días del mes`), no
anualizados — aproximadamente `annualized_value / 12`. La UI los rotula “ARR actual”, “ARR en
riesgo” y “ARR ya renovado”. Fue una decisión de la spec V4-P4 (`daily_price_to_monthly`), pero el
etiquetado induce a error y **no es comparable con las cifras del dashboard**.
→ Ver [INC-02](#inc-02).

Salida: `items` (ordenados por `status`, `expiry_month`, `account_name`; filtrables por
`status=all|at_risk|renewed`), `summary` (ARR en riesgo, ARR renovado y conteos sobre **todos** los
items, no solo los visibles) y `by_month` (agregado por mes de vencimiento).

---

## 12. Committed vs Real (delta de implantación)

Módulo `/committed-vs-real` → [`api/routes/delta.py`](../../app/backend/api/routes/delta.py).
Spec de origen: [SPEC-V5-phase1](./SPEC-V5-phase1-committed-vs-real.md).

Convierte la diferencia técnica entre los dos modos temporales (§5.3) en un indicador de gestión:
**ARR firmado que todavía no está en marcha**.

Universo: SaaS, no excluidas, `close_date IS NOT NULL`.

### 12.1 `GET /api/delta/monthly-trend`

Por cada mes `M` del rango, sobre cada línea con
`close_month = mes(close_date)`, `start_month`, `end_month = mes(end_month_normalized)`:

```
committed_arr        += annualized_value   si  close_month ≤ M ≤ end_month
real_arr             += annualized_value   si  start_month ≤ M ≤ end_month
delta_total          += annualized_value   si  close_month ≤ M  AND  start_month > M
contracts_in_transit += 1                  (misma condición del delta)
delta_by_product_type[pt] += annualized_value
```

`delta_total` = ARR firmado y aún no iniciado en ese mes. Nótese que aquí `committed_arr` usa
`close_month` para **todas** las líneas, sin la condición “nuevo negocio” del modo `from_close`
(§5.3): es una lectura pura de compromiso.

**`trend_note`** (últimos 3 meses `d0, d1, d2` de `delta_total`):

```
"ascendente"   si d1 > d0 y d2 > d1
"descendente"  si d1 < d0 y d2 < d1
"estable"      si max(|d2−d0|, |d1−d0|, |d2−d1|) / max(|d0|,|d1|,|d2|) < 10 %
"mixta"        en cualquier otro caso (y si hay menos de 3 meses)
```

### 12.2 `GET /api/delta/month-breakdown`

Lista los contratos que forman el delta de un mes concreto
(`close_month ≤ month AND start_month > month`), con
`days_since_close = hoy − close_date`, ordenados por antigüedad descendente. Acepta filtro de
cliente (`account_name` → `client_name`).

### 12.3 `GET /api/delta/implementation-alerts`

Detecta contratos cuya implantación se está retrasando **de forma estadísticamente anómala para su
propia línea de negocio**.

**Paso 1 — distribución histórica por `product_type`.** Sobre líneas SaaS no excluidas con
`used_start_fallback = False`, `close_date` y `subscription_start_date` informadas, y

```
subscription_start_date ≤ hoy   AND   subscription_start_date > close_date
```

se acumula `días = subscription_start_date − close_date`. Por línea de negocio se calcula:

```
median_days = mediana
p75_days    = percentil 75   (interpolación lineal)
p90_days    = percentil 90   (interpolación lineal)
sample_size = n
is_reliable = (n ≥ 10)
```

Percentil por interpolación lineal: `idx = p/100 × (n−1)`,
`valor = s[⌊idx⌋] + frac × (s[⌈idx⌉] − s[⌊idx⌋])`.

**Paso 2 — contratos pendientes:** líneas SaaS no excluidas con `close_date` informada y
`start_month > hoy`.

**Paso 3 — ranking:**

```
days_since_close = hoy − close_date
percentile_rank  = (nº de días históricos de su BL ≤ days_since_close) / n × 100
                   (solo si la distribución es fiable)
```

Los fiables se ordenan por `percentile_rank` descendente; los no fiables (BL con <10 muestras) por
`days_since_close` descendente; se concatenan (fiables primero) y se corta en `limit` (defecto 15).
Un `percentile_rank` de 95 significa: *“este contrato lleva más tiempo esperando que el 95 % de los
contratos históricos de su línea de negocio”*.

---

## 13. Base Instalada Predictiva (forecast)

Módulo `/cohort-retention` → **calculado íntegramente en el frontend**
([`components/CohortRetentionView.tsx`](../../app/frontend/components/CohortRetentionView.tsx))
combinando tres endpoints ya existentes. No hay endpoint de forecast en el backend.

Responde: *“si no vendiéramos nada nuevo, ¿cuánto ARR tendríamos en 12 meses?”*
**Excluye explícitamente pipeline, nuevo negocio, CAC y marketing.**

### 13.1 Insumos

| Insumo | Fuente |
|---|---|
| `initialArr` | `GET /api/arr/summary` para el mes de partida (respeta filtros globales y modo ARR) |
| histórico de movimientos | `GET /api/churn/monthly-trend` de los 12 meses hasta el mes de partida |
| vencimientos | `GET /api/renewals/monitor?horizon_months=12` |

### 13.2 Tasas: media ponderada por ARR (no media aritmética)

```
tasa_x = Σ_m  x_arr(m)  /  Σ_m  arr_start(m)          para x ∈ {churn, down_selling, up_selling}
```

Ponderar por `arr_start` evita que un mes de cartera pequeña distorsione la tasa. Si el
denominador es 0, la tasa es 0.

### 13.3 Escenarios

| Escenario | Pérdidas (`churn`, `down`) | Ganancias (`up`) |
|---|---|---|
| **Base** | × 1,00 | × 1,00 |
| **Conservador** | × 1,25 | × 0,75 |
| **Agresivo** | × 0,80 | × 1,20 |

### 13.4 Modelo

```
churn_esperado = initialArr × tasa_churn
down_esperado  = initialArr × tasa_down
up_esperado    = initialArr × tasa_up

ARR_proyectado = initialArr − churn_esperado − down_esperado + up_esperado
retención_neta = 1 + (ARR_proyectado − initialArr) / initialArr
```

Se representa como puente (`ARR inicial − bajas − downsell + upsell`).

**Nota metodológica:** las tasas derivadas de `/churn/monthly-trend` son **mensuales**, y se aplican
una sola vez sobre el ARR inicial. Por tanto la proyección debe leerse como *“el efecto de un mes
típico proyectado sobre la base”*, no como un compuesto a 12 meses, aunque la UI la rotule
“Churn esperado 12M”. Conviene tenerlo presente al comunicar la cifra.

### 13.5 Desglose por línea de negocio

Misma lógica aplicada BL a BL: `initialArr` = valor de esa BL en `by_product_type` del mes de
partida; tasas derivadas del `monthly-trend` **de esa misma BL** (una query por línea). Se listan
solo las líneas con ARR inicial > 0, ordenadas por ARR descendente.

### 13.6 Riesgo por renovaciones

Sobre el `by_month` del monitor de renovaciones (horizonte 12 meses):

```
churn_esperado(mes) = at_risk_arr(mes) × tasa_churn
down_esperado(mes)  = at_risk_arr(mes) × tasa_down
```

frente a `renewed_arr(mes)` (ya renovado). Hereda la unidad mensual de `at_risk_arr`
([INC-02](#inc-02)).

---

## 14. Revisor de snapshots

`/snapshot-review` → [`api/routes/snapshot_review.py`](../../app/backend/api/routes/snapshot_review.py)

Responde a *“¿qué ha cambiado retroactivamente en el ARR de un mes cerrado entre dos cargas?”*

### 14.1 `GET /api/snapshot-review/monthly-totals`

Por cada snapshot (A y B), recorre cada línea SaaS no excluida mes a mes desde `start_month` hasta
`end_month_normalized` sumando `annualized_value`. Devuelve la serie de ambos, el nº de meses
comunes / solo en A / solo en B, y `data_identical = (data_hash_A = data_hash_B)` cuando ambos
hashes existen.

> Este recorrido es equivalente al test de actividad de §5.2, pero **no aplica el modo ARR** (siempre
> `from_start`) y no incluye Stripe.

### 14.2 `GET /api/snapshot-review/period-detail`

Para un mes concreto, empareja las líneas de ambos snapshots por `sf_line_item_id`:

| Situación | `change_type` |
|---|---|
| Solo en B | `new` |
| Solo en A | `removed` |
| En ambos con `annualized_value` distinto | `modified` |
| En ambos con el mismo valor | `unchanged` |

`delta = arr_b − arr_a`; `delta_pct = delta / arr_a × 100` (null si `arr_a = 0`). `only_changes=true`
oculta las `unchanged` (pero siguen contando en el `summary`).

**Decisión documentada (sesión 25):** la spec original pedía un prorrateo diario; se usa el ARR
anualizado para que el detalle reconcilie exactamente con los totales y con el dashboard.

---

## 15. Alertas de calidad de dato

`GET /api/alerts` → [`api/routes/alerts.py`](../../app/backend/api/routes/alerts.py)

### 15.1 Tipos

| Tipo | Severidad | Generado por |
|---|---|---|
| `UNCLASSIFIED_PRODUCT` | error | `ARRCalculator` |
| `INVALID_DATES` | error | `ARRCalculator` |
| `NEGATIVE_PRICE` | error | `ARRCalculator` |
| `DURATION_ANOMALY_LOW` | warning | `ARRCalculator` |
| `HIGH_ARR_FLAG` | warning | `ARRCalculator` |
| `MISSING_COUNTRY` | info | `ARRCalculator` |
| `OVERLAPPING_CONTRACTS` | warning | `alert_checker.check_overlapping_contracts` (solo vía Salesforce) |
| `PARENT_ACCOUNT_CONFLICT` | warning | `excel_importer.store_parent_conflict_alerts` (solo vía Excel) |

### 15.2 Detección de solapamientos

```
Agrupar líneas SaaS no excluidas por (account_name, product_type)      ← account_name, NO client_name
Para cada par (a, b) del grupo:
    si  a.start_month ≤ b.end_month_normalized  AND  b.start_month ≤ a.end_month_normalized
    → generar DOS alertas (una por línea), cada una enlazada a su arr_line_item_id
```

Se generan dos para que el usuario pueda decidir **cuál de las dos excluir** vía
`PATCH /api/arr/line-items/{id}` (Q-06). El importe en riesgo de doble conteo se muestra en la
descripción.

### 15.3 Agrupación y supresiones en la API

**Clave de agrupación** (`_group_key`): las alertas repetitivas se colapsan por causa raíz.

| Tipo | Se agrupa por |
|---|---|
| `MISSING_COUNTRY` | consultor (la descripción) |
| `UNCLASSIFIED_PRODUCT` | `product_name` |
| resto | no se agrupa (una por oportunidad) |

Cada grupo devuelve `occurrence_count`, `alert_ids`, `reviewed_count` y `reviewed` (true solo si
**todas** las del grupo están revisadas), lo que permite marcar todo el grupo de una vez con
`PATCH /api/alerts/bulk-review`.

**Impacto en ARR** (`arr_impact`) por tipo:
- `OVERLAPPING_CONTRACTS` → `annualized_value` de la línea enlazada
- `UNCLASSIFIED_PRODUCT` → suma del ARR de **todas** las líneas con ese `product_name` en el snapshot
- `MISSING_COUNTRY` → suma del ARR de todas las oportunidades del consultor (exposición total)

**Supresiones:**
- `DURATION_ANOMALY_HIGH` se filtra **siempre** (contratos > 2 años son normales; es ruido)
- `HIGH_ARR_FLAG` se muestra solo si la oportunidad tiene al menos una línea SaaS

**Orden:** severidad (error → warning → info), luego `occurrence_count` descendente.

**Nota:** `alert_checker.check_raw_items()` existe pero no se invoca en ninguna de las dos vías de
ingesta (sus comprobaciones ya las cubre el calculador).

---

## 16. Agrupación de líneas de negocio (LMS+AIO, Author total)

Dos toggles globales (`BLGroupingProvider`, persistidos en `localStorage` clave `bl-grouping`):

| Toggle | Efecto en la visualización | Traducción a filtro de API |
|---|---|---|
| `combineLmsAio` | `LMS & AIO` = `SaaS LMS` + `SaaS AIO` (se eliminan las dos originales) | `product_types="SaaS LMS,SaaS AIO"` |
| `combineAuthor` | `Author (Total)` = `SaaS Author` + `Author Online` | `product_types="SaaS Author,Author Online"` |

Implementación: `applyBLGrouping` / `applyBLGroupingToMonths` para la presentación, y
`productTypeFilterParams` para traducir la selección del filtro a parámetros de query.

**Corrección matemática de V3-P1:** la agrupación se hace **sumando series mes a mes** con join por
clave de mes (`sumSeriesByMonth`), rellenando con 0 los meses presentes en solo una de las series.
Sumar totales agregados en lugar de series producía desalineación cuando las dos líneas no cubrían
los mismos meses.

**Límite conocido:** en el churn, activar la agrupación hace que ambas líneas entren en la misma
consulta (vía `product_types`), pero la **clave de movimiento sigue siendo
`(client_name, product_type)`**. Por tanto un cliente que migra de LMS a AIO seguirá generando
churn + new logo. Consolidar de verdad esa migración requeriría consolidar también la clave.

---

## 17. KPIs del dashboard principal

Los seis KPIs de [`KPICards.tsx`](../../app/frontend/components/KPICards.tsx) se calculan **en el
frontend** sobre la serie devuelta por `/api/arr/summary` (por eso el rango de meses filtrado debe
incluir los meses de referencia, o el KPI aparece como “—”):

| KPI | Cálculo |
|---|---|
| **ARR actual** | `total_arr` del mes seleccionado |
| **Dic {año−1}** | `total_arr` del mes `{año−1}-12-01` |
| **Mismo mes {año−1}** | `total_arr` del mismo mes del año anterior |
| **Calidad de dato** | nº de alertas **no revisadas** del snapshot + nº de meses del periodo |
| **Variación YoY** | `ARR(M) − ARR(mismo mes año anterior)` (absoluto) |
| **Δ vs Dic {año−1}** | `(ARR(M) − ARR(dic año−1)) / ARR(dic año−1) × 100` |

El emparejamiento de meses se hace por prefijo `YYYY-MM` (`findMonthPoint`), no por igualdad de
fecha completa. Todos los formateos usan locale `es-ES` y EUR sin decimales.

---

## 18. Exportación a Excel

`GET /api/exports/excel?snapshot_id=&gagero_month_a=&gagero_month_b=&gagero_mode=`
→ [`core/excel_exporter.py`](../../app/backend/core/excel_exporter.py)

Genera un `.xlsx` con:
- una hoja de **ARR calculado** por línea (réplica auditable de `Opos con Productos` con las
  columnas de cálculo: fechas efectivas, `start_month`, `end_month_normalized`, `service_days`,
  `real_price`, `daily_price`, `annualized_value`, flags), respetando el modo ARR
- una hoja **Gágero** con el puente entre los dos meses indicados

El objetivo es que el CFO pueda reconciliar cifra a cifra contra el Excel original.

---

## 19. Inconsistencias detectadas y decisiones pendientes

Encontradas al contrastar el código con las specs. **Ninguna se ha modificado**: se documentan para
que el negocio decida.

<a id="inc-01"></a>
### INC-01 — Semántica del campo Stripe (`snapshot_stripe_mrr.mrr`) — ALTA

El mismo campo se interpreta de tres formas distintas:

| Lugar | Interpretación |
|---|---|
| `GET /api/arr/summary`, `/by-consultant`, `/churn/monthly` | **ARR anual** (se suma sin ×12) |
| UI `/stripe` (cabecera “ARR (EUR)”) y aviso “Falta el ARR de Stripe” | **ARR anual** |
| `GET /api/stripe-mrr` → campo `arr_equivalent` | **MRR mensual** (devuelve `mrr × 12`) |
| Tool `get_stripe_mrr` del ARR Expert | **MRR mensual** (`mrr × 12`) |
| Importador Excel, fila `online anual` | **MRR mensual** (guarda `anual / 12`) |

Convención de facto: el valor guardado es **ARR anual**. Bajo esa convención, `arr_equivalent` es
12× el valor real y la rama `online anual / 12` del importador introduciría un valor 12 veces menor
de lo debido. **Acción:** fijar la convención (recomendado: renombrar el campo a `arr_annual`,
eliminar `arr_equivalent` y quitar la división por 12) y verificar qué contiene realmente la fila
`Ending MRR` del Excel de Stripe.

<a id="inc-02"></a>
### INC-02 — El monitor de renovaciones muestra importes mensuales rotulados como ARR — ALTA

`current_arr = Σ daily_price × días_del_mes` es ~`ARR/12`. La UI lo llama “ARR actual”, “ARR en
riesgo” y “ARR ya renovado”, y el forecast (§13.6) hereda esa unidad. Las cifras de `/renewals` no
son comparables con las del dashboard. **Acción:** o anualizar (`daily_price × 365`) o renombrar a
“Importe mensual” de forma explícita.

<a id="inc-03"></a>
### INC-03 — Los solapamientos no se detectan en la vía Excel — ALTA

`check_overlapping_contracts` solo se invoca en `snapshot_manager.create_snapshot` (Salesforce).
`excel_importer.run_calculation_and_store` no la llama. Como la vía operativa hoy es la carga de
Excel, **la alerta `OVERLAPPING_CONTRACTS` no se está generando en producción**, y con ella el
control de doble conteo por renovaciones solapadas (Q-06). **Acción:** añadir la llamada en el
importador de Excel.

<a id="inc-04"></a>
### INC-04 — Meses sin dato de Stripe cuentan 0, no el último valor conocido — MEDIA

F-07 especifica “si no se ha introducido el MRR de un mes, se usa el último valor conocido con
advertencia visual”. El código no interpola: el mes sin dato aporta 0 a Author Online, lo que
produce una caída artificial del ARR total. Existe aviso en la UI, pero solo para el mes en curso.
**Acción:** decidir entre interpolar (last-known-value) o mantener el 0 y reforzar el aviso.

<a id="inc-05"></a>
### INC-05 — `service_days = raw_days − 1` sobreestima la anualización — MEDIA (heredado del Excel)

Un contrato anual se anualiza a `precio × 365/364` (+0,275 %). Es fiel al Excel (ADR-001) y
consistente en toda la serie, así que **no distorsiona tendencias**, pero sí infla ligeramente los
niveles absolutos. **Acción:** decisión de negocio — corregir a `raw_days` rompe la comparabilidad
con el histórico del Excel.

<a id="inc-06"></a>
### INC-06 — Colisión de IDs sintéticos en la carga de Excel — MEDIA

`sf_line_item_id` se deriva de `(oportunidad, cuenta, fecha_cierre, producto, precio, cantidad)`.
Dos filas idénticas en esos campos generan el mismo ID. El ARR **no se pierde** (ambas líneas se
calculan y se persisten), pero el mapa `raw_by_id` conserva una sola fila cruda, por lo que dos
`ARRLineItem` pueden apuntar a la misma fila de origen. Además el `period-detail` del Revisor de
Snapshot empareja por ese ID, así que duplicados exactos se colapsan en la comparativa.
**Acción:** añadir el número de fila del Excel al `line_key`.

<a id="inc-07"></a>
### INC-07 — Las dos familias de churn no están en la misma base — MEDIA

En la misma página `/churn` conviven métricas mensuales (con Stripe y sensibles al modo ARR) y
ratios LTM/YTD de cohorte (sin Stripe y siempre `from_start`). Un usuario puede comparar un NRR
mensual con un NRR LTM sin saber que las bases difieren. **Acción:** o propagar `mode` y Stripe a
la Familia B, o etiquetar explícitamente la base de cada bloque en la UI.

<a id="inc-08"></a>
### INC-08 — `product_type = "Author Online"` en Salesforce se excluye silenciosamente — BAJA

`is_saas = product_type.startswith("SaaS")` ⇒ `"Author Online"` da `is_saas = False` y ARR 0, sin
flag ni alerta. Es coherente con el diseño (Author Online viene de Stripe), pero si algún día se
clasificara así una línea de Salesforce, desaparecería del ARR sin aviso.
**Acción:** flag informativo cuando `product_type = "Author Online"` en una línea de Salesforce.

<a id="inc-09"></a>
### INC-09 — GRR se capa a 100 y NRR no — BAJA

`grr = min(grr, 100.0)`; el NRR no se capa (y no debe caparse: puede superar 100 legítimamente). El
capado del GRR oculta el caso en que el ARR de la cohorte crece por un ajuste retroactivo, en lugar
de señalarlo como anomalía de dato. **Acción:** mantener el capado pero registrar cuándo se activa.

### Preguntas abiertas de negocio que siguen vivas

- **Q-08** ¿Desde qué fecha son fiables los campos de suscripción en Salesforce? Define el “cutoff”
  de confianza del ARR histórico y cuántas líneas usan los fallbacks AS-01/AS-02.
- **Migración entre líneas de negocio:** ¿un cliente que pasa de LMS a AIO debe generar
  churn + new logo (hoy sí, §8.1) o tratarse como movimiento interno neutro?
- **Ventana de forecast:** ¿se quiere que las tasas mensuales se compongan a 12 meses (§13.4) o
  mantener la lectura de un mes típico?

---

## 20. Trazabilidad código ↔ sección

| Sección | Fichero |
|---|---|
| §1.A Ingesta Excel | [`core/excel_importer.py`](../../app/backend/core/excel_importer.py) |
| §1.B Ingesta Salesforce | [`core/sf_extractor.py`](../../app/backend/core/sf_extractor.py), [`core/snapshot_manager.py`](../../app/backend/core/snapshot_manager.py) |
| §2 Maestros | [`api/routes/config.py`](../../app/backend/api/routes/config.py), `excel_importer.load_product_classifications` |
| §3 Cliente consolidado | [`core/client_identity.py`](../../app/backend/core/client_identity.py) |
| §4 Motor ARR | [`core/arr_calculator.py`](../../app/backend/core/arr_calculator.py) |
| §5 ARR mensual y modos | [`api/routes/arr.py`](../../app/backend/api/routes/arr.py) |
| §6 Stripe | [`api/routes/stripe.py`](../../app/backend/api/routes/stripe.py), `excel_importer.load_stripe_mrr` |
| §7 Por cliente/consultor | [`api/routes/arr.py`](../../app/backend/api/routes/arr.py) |
| §8 Núcleo de movimientos | `gagero._get_arr_by_account_bl` |
| §9 Churn | [`api/routes/churn.py`](../../app/backend/api/routes/churn.py) |
| §10 Gágero | [`api/routes/gagero.py`](../../app/backend/api/routes/gagero.py) |
| §11 Renovaciones | [`api/routes/renewals.py`](../../app/backend/api/routes/renewals.py) |
| §12 Committed vs Real | [`api/routes/delta.py`](../../app/backend/api/routes/delta.py) |
| §13 Forecast | [`components/CohortRetentionView.tsx`](../../app/frontend/components/CohortRetentionView.tsx) |
| §14 Revisor de snapshots | [`api/routes/snapshot_review.py`](../../app/backend/api/routes/snapshot_review.py) |
| §15 Alertas | [`core/alert_checker.py`](../../app/backend/core/alert_checker.py), [`api/routes/alerts.py`](../../app/backend/api/routes/alerts.py) |
| §16 Agrupación BL | [`lib/utils.ts`](../../app/frontend/lib/utils.ts), [`lib/bl-grouping-context.tsx`](../../app/frontend/lib/bl-grouping-context.tsx) |
| §17 KPIs | [`components/KPICards.tsx`](../../app/frontend/components/KPICards.tsx) |
| §18 Exportación | [`core/excel_exporter.py`](../../app/backend/core/excel_exporter.py) |
| Modelo de datos | [`db/models.py`](../../app/backend/db/models.py), [07_data_model_draft.md](./07_data_model_draft.md) |
