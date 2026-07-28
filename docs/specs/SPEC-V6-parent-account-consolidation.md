# SPEC-V6 — Consolidación por Cuenta Principal (grupo empresarial)

**Tipo:** corrección transversal de criterio de cálculo (no es una página nueva)
**Módulos afectados:** Churn, New Logo, Gágero/Bridge, Up/Down-selling, ARR por cliente, Top cuentas, Renewals, Delta, Expert
**Estado:** propuesta — pendiente de aprobación y de verificación contra Excel de muestra

---

## 1. Contexto y problema

Hoy la **identidad de cliente** en todo el motor es un único campo:
[`RawOpportunityLineItem.account_name`](../../app/backend/db/models.py#L81) (la cuenta final de Salesforce).

Salesforce, sin embargo, modela grupos empresariales con una **cuenta principal / cuenta padre**: varias sociedades independientes (cada una con su propio `account_name`) que pertenecen a un mismo grupo. Como el análisis se hace por cuenta final:

- Cuando un grupo registra una oportunidad en una sociedad un periodo y en otra sociedad del mismo grupo el periodo siguiente, la primera se cuenta como **Churn** y la segunda como **New Logo**, cuando en realidad **el cliente (el grupo) no se ha movido**.
- Esto **infla artificialmente tanto el Churn como el New Logo** (y análogamente Up/Down cuando el reparto entre sociedades cambia), y desvirtúa el conteo de logos.

## 2. Decisión de diseño

Se introduce el concepto de **identidad de cliente consolidada** (`client_name`):

```
client_name = cuenta_principal   si la cuenta principal viene informada
client_name = account_name       si la cuenta principal está vacía (la cuenta es su propio padre)
```

Toda agrupación, clave de movimiento y filtro "por cliente" pasa a usar `client_name`
en lugar de `account_name`. La dimensión de producto **se mantiene**: la clave de
movimiento sigue siendo `(client_name, product_type)`.

**Decisiones confirmadas con negocio (Daniel, CFO):**
- La "Cuenta principal" viene como **nombre de cuenta (texto)**, no como ID de Salesforce
  → el cruce es por cadena de texto directa contra `account_name`.
- **No debería** ocurrir que una misma sociedad tenga el padre informado a medias
  (unas filas sí, otras no). Verificado contra la muestra (0 casos); **por defecto / si
  ocurriera, se aplica mapa global** (ver §4).
- **Consolidación hasta la raíz (cierre transitivo):** cuando hay cadena
  `Sociedad → Padre → Abuelo`, el `client_name` es la **raíz** del grupo, no el padre directo.
  Ejemplo real: `EUROCAJA RURAL → Banco Cooperativo → Grupo Caja Rural` ⇒ las tres quedan bajo
  **Grupo Caja Rural**. Evita que el grupo se parta en subgrupos. Se protege contra ciclos.
- El histórico **se recalcula**: se re-sube la BBDD ya con la columna y el snapshot activo
  recalcula todo consolidado (las tendencias quedan corregidas hacia atrás).

**Verificación contra muestra `MUESTRA JUL26…2026-07-28-12-10-56.xlsx` (14.901 filas):**
- Cabecera exacta: `Cuenta principal`, columna 19 (última). 1.740 filas con padre / 13.161 sin.
- 1.121 cuentas → **989 clientes** consolidados (94 grupos padre; 69 de ellos con ventas propias).
- **0 conflictos** (ninguna cuenta con dos padres distintos), **0 casos "a medias"**, **0 ciclos**.
- Profundidad máxima de cadena: **2 niveles** (8 sociedades cuelgan vía un padre intermedio).

## 3. Datos: nueva columna, modelo y migración

**Excel (hoja `Opos con Productos`):** una columna nueva, **la última del fichero**,
llamada `Cuenta principal`. Vacía ⇒ la cuenta es su propia principal.

> ⚠️ **Pendiente de verificar contra la muestra:** el texto EXACTO de la cabecera
> (el importador casa columnas por nombre de cabecera vía `_cell(...)`, no por posición).
> Se añadirán alias defensivos: `"Cuenta principal"`, `"Cuenta Principal"`,
> `"Parent Account"`, `"Account.Parent.Name"`.

**Modelo** — dos columnas nuevas en [`RawOpportunityLineItem`](../../app/backend/db/models.py#L71):

```python
parent_account_name = Column(Text)   # texto CRUDO de la col. "Cuenta principal"; NULL si vacía (auditoría)
client_name         = Column(Text)   # identidad consolidada YA RESUELTA a la raíz (§4); NUNCA NULL
```

Se persiste `client_name` **ya resuelto en el import** (necesita el mapa global, §4). Ventaja:
los 6 endpoints agrupan/filtran por `raw.client_name` directamente — cambio de una palabra,
sin recalcular y sin `COALESCE` en cada query. `parent_account_name` se guarda solo para auditar.

**Migración Alembic** (`0006_add_parent_and_client.py`): `ADD COLUMN parent_account_name TEXT NULL`
y `ADD COLUMN client_name TEXT NULL` sobre `raw_opportunity_line_items`. Nullable a nivel DDL
(seguro sobre filas existentes); el importador siempre lo rellena en snapshots nuevos.
Retrocompat: en snapshots antiguos `client_name` queda NULL → los endpoints usan
`COALESCE(client_name, account_name)` como salvaguarda (equivale al comportamiento actual).

## 4. Regla de resolución (mapa global + cierre transitivo a la raíz)

En el import, tras leer todas las filas, se construye un **mapa global** cuenta→padre directo:

```
Para cada sociedad S:
  parent[S] = el único valor no vacío de "Cuenta principal" observado en cualquier fila de S
```

- Si una sociedad declara padre en cualquiera de sus filas, ese padre se aplica a **todas**
  sus filas (robustez ante el dato incompleto). El cierre transitivo (abajo) **exige** este
  mapa global: para conocer el padre de "Banco Cooperativo" hace falta mirar sus propias filas,
  no las de la sociedad hija.
- **Validación de calidad:** si una misma sociedad presenta **dos padres distintos** en
  filas distintas (conflicto real), se registra un `SnapshotAlert`
  (`alert_type="PARENT_ACCOUNT_CONFLICT"`) y se toma el primero de forma determinista,
  para no romper el import. Esto hace visible el problema sin bloquear.

**Resolución a la raíz** — se sigue la cadena hasta la cuenta sin padre, con guarda anti-ciclos:

```python
def resolve_client_name(account_name, parent_map):
    """parent_map: {cuenta -> padre directo} global. Devuelve la raíz del grupo."""
    if not account_name:
        return "Sin cuenta"
    seen = set()
    current = account_name
    while current in parent_map and current not in seen:
        seen.add(current)
        current = parent_map[current]
    return current  # raíz (o el nodo donde se corta un ciclo, de forma determinista)
```

Un ciclo (`current in seen`) corta el bucle y deja el `client_name` en el nodo actual de forma
determinista; se registra alerta `PARENT_ACCOUNT_CONFLICT`. En la muestra no hay ciclos.

## 5. Puntos de código a modificar

Un solo concepto, sustituido en los sitios donde hoy se usa `raw.account_name` como identidad.
El punto neurálgico es `_get_arr_by_account_bl` (lo consumen churn, gágero y ratios).

| # | Archivo / función | Cambio |
|---|---|---|
Como `client_name` va persistido en `RawOpportunityLineItem`, cada punto usa `raw.client_name`
(con salvaguarda `COALESCE(client_name, account_name)` para snapshots antiguos sin la columna).

| # | Archivo / función | Cambio |
|---|---|---|
| 1 | [`gagero._get_arr_by_account_bl`](../../app/backend/api/routes/gagero.py#L19) | La clave pasa de `(raw.account_name, product_type)` a `(raw.client_name, product_type)`. Filtro `account_name` → `client_name` (§6). **Arregla churn/new logo/up/down/gágero de golpe.** |
| 2 | [`arr.arr_by_account`](../../app/backend/api/routes/arr.py#L369) | Agrupar por `client_name` (Top cuentas / ARR por cliente). |
| 3 | [`arr.arr_summary` / `arr_by_consultant`](../../app/backend/api/routes/arr.py#L121) | Filtro `account_name` → `client_name`. Totales NO cambian. |
| 4 | [`renewals`](../../app/backend/api/routes/renewals.py#L95) | `grouped.setdefault((client_name, product_type), …)`. |
| 5 | [`delta._filtered_items`](../../app/backend/api/routes/delta.py#L201) | Filtro `account_name` → `client_name`. |
| 6 | [`expert` tools](../../app/backend/api/routes/expert.py#L300) | `get_top_accounts` y agregados por cuenta → `client_name`. |
| 7 | [`churn`](../../app/backend/api/routes/churn.py) | Sin cambios directos: hereda todo de `_get_arr_by_account_bl`. Solo revisar textos (los `key[0]` ya serán el nombre del grupo). |

**Helper compartido** `_client_name(raw)` = `raw.client_name or raw.account_name or "Sin cuenta"`
para la salvaguarda de snapshots antiguos, usado en los 6 sitios.

## 6. Semántica del filtro "por cliente"

Hoy el filtro hace `RawOpportunityLineItem.account_name == X`. Tras el cambio, el desplegable
de clientes del frontend listará **grupos** (`client_name`). El filtro casa contra la columna
persistida:

```
WHERE COALESCE(client_name, account_name) == X
```

Así, filtrar por "Grupo Caja Rural" incluye todas las sociedades del grupo **y** la cuenta que
se llame literalmente "Grupo Caja Rural". El desplegable ya se alimenta de `/arr/by-account`,
que tras el cambio devolverá grupos — no requiere endpoint nuevo.

## 7. Qué NO cambia (invariantes de control)

- **ARR total** y series temporales agregadas: idénticas (consolidar es reagrupar una suma).
- **Vista por consultor**: agrupa por `opportunity_owner`, no por cuenta; solo cambia el
  desplegable de filtro por cliente.
- Clasificación de producto, fechas, cálculo de `annualized_value`: intactos.
- Author Online / Stripe: intacto (no tiene cuenta de Salesforce).

## 8. Migración de datos histórica

Según lo acordado, se **re-sube la BBDD completa** con la nueva columna. El import crea un
snapshot nuevo que ya nace consolidado; al ser el más reciente, pasa a ser el activo y todas
las tendencias (churn rolling, gágero, delta) quedan recalculadas hacia atrás. No se hace
backfill de snapshots antiguos en base de datos (quedan como estaban, solo por auditoría).

## 9. Pruebas

- **Unit (`tests/test_excel_importer.py` / nuevo):**
  - `resolve_client_name`: padre informado → padre; vacío → cuenta; ambos vacíos → "Sin cuenta".
  - Mapa global: sociedad con padre en 1 de 3 filas → las 3 filas resuelven al padre.
  - Conflicto de padres → genera alerta `PARENT_ACCOUNT_CONFLICT`.
- **Caso regresión (el bug):** dataset sintético con 2 sociedades del mismo grupo, una activa
  en mes A y otra en mes B. **Antes:** 1 churn + 1 new logo. **Después:** 0 churn, 0 new logo,
  1 cliente estable. Verificar sobre `_get_arr_by_account_bl` + `churn_monthly`.
- **Invariante:** ARR total por mes idéntico antes/después de consolidar (mismo dataset).
- **E2E existentes** de churn siguen verdes con datos sin cuenta principal (retrocompatible:
  columna vacía ⇒ comportamiento actual).

## 10. Fases de desarrollo

1. **Datos**: migración + columna en modelo + lectura de la columna en `load_opos_rows` /
   `insert_raw_items` + `resolve_client_name` + mapa global + alerta de conflicto.
2. **Motor**: refactor de `_get_arr_by_account_bl` y los otros 5 sitios a `client_name`;
   semántica de filtro (§6).
3. **Pruebas**: unit + regresión del bug + invariante de ARR total.
4. **Verificación**: re-subir muestra/histórico y validar en UI que churn/new logo bajan y
   el ARR total no se mueve.

---

### Puntos abiertos a confirmar
- [x] Cabecera exacta de la columna en la muestra (§3) → `Cuenta principal`, última columna.
- [x] Que ninguna sociedad tenga el padre informado a medias en la muestra (§4) → 0 casos.
- [x] Profundidad de jerarquía y decisión de consolidar hasta la raíz (§2, §4) → confirmado, máx. 2 niveles, 0 ciclos.
