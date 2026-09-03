# Dashboard y Reporting — Especificación

> **Actualizado 2026-09-03.** Las secciones "Vista: …" de más abajo son el diseño original de
> abril de 2026 (6 pantallas) y se conservan como referencia de intención. La aplicación tiene
> hoy **14 pantallas**. El inventario real, la navegación, el sistema visual y el catálogo
> completo de endpoints están en las dos secciones nuevas que siguen.

---

## A. Inventario real de pantallas (2026-09-03)

Navegación lateral fija (`components/Sidebar.tsx`), en este orden:

| # | Ruta | Nombre en el sidebar | Qué muestra | Spec de cálculo |
|---|---|---|---|---|
| 1 | `/` | Dashboard | 6 KPIs, serie de ARR total y por línea, barras por año, Top 20 clientes (barras y líneas), desglose por línea de negocio | [19 §5](./19_calculation_reference.md#5-arr-mensual-stock-y-los-dos-modos-temporales), [§17](./19_calculation_reference.md#17-kpis-del-dashboard-principal) |
| 2 | `/clients` | Clientes | Evolución de ARR por cliente consolidado + tabla de detalle | [19 §7.1](./19_calculation_reference.md#71-get-apiarrby-account--top-n-clientes) |
| 3 | `/snapshots` | Snapshots | Historial de cargas, estado, conteos, exportación a Excel | [19 §1](./19_calculation_reference.md#1-ingesta-de-datos) |
| 4 | `/snapshot-review` | Revisor de Snapshot | Comparativa A/B de dos snapshots: serie superpuesta, detalle por mes, "solo cambios" | [19 §14](./19_calculation_reference.md#14-revisor-de-snapshots) |
| 5 | `/gagero` | Gágero | Puente (waterfall) de ARR entre dos meses con detalle por cliente | [19 §10](./19_calculation_reference.md#10-gágero--puente-bridge-de-arr) |
| 6 | `/churn` | Churn | KPIs de retención, puente mensual, tendencia NRR y de erosión, bajas por línea, clientes churneados | [19 §9](./19_calculation_reference.md#9-churn-y-retención-de-ingresos) |
| 7 | `/cohort-retention` | Base Instalada Predictiva | Forecast a 12 meses de la base existente, 3 escenarios, desglose por línea de negocio | [19 §13](./19_calculation_reference.md#13-base-instalada-predictiva-forecast) |
| 8 | `/committed-vs-real` | Committed vs Real | ARR firmado vs. en servicio, delta en tránsito, alertas de implantación | [19 §12](./19_calculation_reference.md#12-committed-vs-real-delta-de-implantación) |
| 9 | `/renewals` | Renovaciones | Vencimientos en el horizonte, renovados vs. en riesgo | [19 §11](./19_calculation_reference.md#11-monitor-de-renovaciones) |
| 10 | `/consultants` | Consultores | ARR por consultor y país, con drill-down a clientes por línea | [19 §7.2](./19_calculation_reference.md#72-get-apiarrby-consultant) |
| 11 | `/stripe` | Stripe MRR | Input manual y carga masiva de Author Online | [19 §6](./19_calculation_reference.md#6-author-online-stripe) |
| 12 | `/alerts` | Alertas | Alertas de calidad agrupadas por causa raíz, con impacto en ARR y revisión masiva | [19 §15](./19_calculation_reference.md#15-alertas-de-calidad-de-dato) |
| 13 | `/config` | Configuración | Maestros de productos y de consultor→país | [19 §2](./19_calculation_reference.md#2-tablas-maestras-y-clasificación-de-producto) |
| 14 | `/expert` | ARR Expert | Chat con IA sobre los datos del snapshot (bloque destacado al final del menú) | F-27 |

### Controles globales del sidebar

Aplican a **todas** las pantallas analíticas y viven por encima del menú:

| Control | Componente | Persistencia | Efecto |
|---|---|---|---|
| Selector de snapshot | `SnapshotSelector` | contexto de sesión | Fija el snapshot activo de toda la app |
| Modo ARR | `ARRModeToggle` | `localStorage` → `arr-command-center-mode` | `from_start` / `from_close` ([19 §5.3](./19_calculation_reference.md#53-los-dos-modos-from_start-y-from_close)) |
| Línea de negocio | `FilterBar` | contexto (no persiste) | `product_type` o `product_types` |
| Cliente | `FilterBar` | contexto | `account_name` → `client_name`; opciones cargadas del Top 100 real del snapshot |
| Desde / Hasta | `FilterBar` | contexto | Rango de meses. Defecto: `2021-01-01` → mes actual |
| Agrupación LMS+AIO / Author | `BLGroupingProvider` | `localStorage` → `bl-grouping` | [19 §16](./19_calculation_reference.md#16-agrupación-de-líneas-de-negocio-lmsaio-author-total) |

**Regla de diseño:** los filtros no se duplican en cada página. Están una sola vez en el
sidebar y todas las vistas los consumen desde contexto. Las excepciones son locales y
explícitas (p.ej. el mes de partida del forecast, o los meses A/B de Gágero y del Revisor).

### Sistema visual

El sistema de diseño completo (paleta, tipografía, espaciado, sombras, componentes, config de
Recharts, breakpoints) está documentado aparte en
**[../../DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md)**.

Resumen: primario `#6d35ff`, oscuro `#2f185f`, un color fijo por línea de negocio, paleta
extendida de 20 colores para top cuentas (`"Otros"` siempre `#e5e7eb`), tarjetas
`rounded-3xl` con borde `#e7e1f2`, labels en mayúsculas con `tracking` amplio, tablas con
scroll horizontal propio, y todos los importes formateados en `es-ES` / EUR sin decimales.
UI íntegramente en español. Iconografía: `lucide-react`.

---

## B. Catálogo completo de endpoints (2026-09-03)

| Método | Ruta | Módulo |
|---|---|---|
| GET | `/api/health` | — |
| GET | `/api/snapshots` | Snapshots |
| GET | `/api/snapshots/{snapshot_id}` | Snapshots |
| GET | `/api/arr/summary` | ARR |
| GET | `/api/arr/by-account` | ARR |
| GET | `/api/arr/by-consultant` | ARR |
| GET | `/api/arr/line-items` | ARR |
| PATCH | `/api/arr/line-items/{item_id}` | ARR (exclusión manual) |
| POST | `/api/sync` | Salesforce |
| POST | `/api/sync/cron/daily` | Salesforce (cron, `X-Cron-Secret`) |
| POST | `/api/imports/excel` | Carga manual |
| POST | `/api/imports/masters` | Carga de maestros |
| GET/POST/PUT | `/api/config/products` · `/api/config/products/{id}` | Configuración |
| GET/PUT | `/api/config/consultants` · `/api/config/consultants/{id}` | Configuración |
| GET | `/api/stripe-mrr` | Stripe |
| PUT | `/api/stripe-mrr` | Stripe |
| POST | `/api/stripe-mrr/bulk` | Stripe |
| GET | `/api/alerts` | Alertas |
| PATCH | `/api/alerts/bulk-review` | Alertas |
| PATCH | `/api/alerts/{alert_id}` | Alertas |
| POST | `/api/expert/chat` | ARR Expert |
| GET | `/api/exports/excel` | Exportación |
| GET | `/api/snapshot-review/monthly-totals` | Revisor de Snapshot |
| GET | `/api/snapshot-review/period-detail` | Revisor de Snapshot |
| GET | `/api/gagero/bridge` | Gágero |
| GET | `/api/churn/monthly` | Churn (familia mensual) |
| GET | `/api/churn/monthly-trend` | Churn (familia mensual) |
| GET | `/api/churn/ratios` | Churn (familia cohorte) |
| GET | `/api/churn/rolling` | Churn (familia cohorte) |
| GET | `/api/churn/churned-accounts` | Churn (familia cohorte) |
| GET | `/api/churn/by-product-type` | Churn (familia cohorte) |
| GET | `/api/renewals/monitor` | Renovaciones |
| GET | `/api/delta/monthly-trend` | Committed vs Real |
| GET | `/api/delta/month-breakdown` | Committed vs Real |
| GET | `/api/delta/implementation-alerts` | Committed vs Real |

No hay endpoint de forecast: la Base Instalada Predictiva se calcula en el frontend combinando
`/api/arr/summary`, `/api/churn/monthly-trend` y `/api/renewals/monitor`.

---
---

# C. Diseño original de abril 2026 (histórico)
**Versión:** 1.0
**Fecha:** 2026-04-17

---

## Vista principal: Dashboard ARR compañía

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  ARR Command Center                    [🔄 Actualizar SF] [⚠️3] │
│  Última sync: 17 abr 2026, 10:30                                │
├─────────────────────────────────────────────────────────────────┤
│  [Filtros: Línea de negocio ▾] [Consultor ▾] [País ▾] [Canal ▾]│
│  [Desde: Ene 2021 ▾] [Hasta: Abr 2026 ▾]                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ARR Total Compañía — Abril 2026                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  €3.920.000  │  │  +€68.000    │  │   +1,7%      │          │
│  │  ARR actual  │  │  MoM (+/-)   │  │  MoM (%)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  [Gráfico de líneas: ARR por producto, serie 2021-2026]         │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  Desglose por línea de negocio — Abril 2026                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Línea          │ ARR Actual  │ MoM (+/-)  │ MoM (%) │ %s  │ │
│  │ isEazy LMS     │ €1.420.000  │ +€15.000   │ +1.1%   │ 36% │ │
│  │ isEazy Skills  │ €1.280.000  │ +€22.000   │ +1.7%   │ 33% │ │
│  │ isEazy Author  │  €760.000   │ +€18.000   │ +2.4%   │ 19% │ │
│  │  · Offline     │  €650.000   │            │         │     │ │
│  │  · Online(SF)  │  €110.000   │            │         │     │ │
│  │ isEazy Engage  │  €400.000   │  +€8.000   │ +2.0%   │ 10% │ │
│  │ isEazy AIO     │   €60.000   │  +€5.000   │ +9.1%   │  2% │ │
│  │ TOTAL          │ €3.920.000  │ +€68.000   │ +1.7%   │100% │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Gráfico principal
- Tipo: líneas apiladas o líneas separadas.
- Eje X: meses.
- Eje Y: ARR en €.
- Series: una línea por línea de negocio SaaS.
- Tooltip: al hover, muestra el ARR del mes y MoM.
- Zoom: permite seleccionar rango de fechas.

---

## Vista: ARR por Consultor

```
┌─────────────────────────────────────────────────────────────────┐
│  ARR por Consultor — Abril 2026                                 │
│  [Filtros: País ▾] [Línea ▾]                                    │
├─────────────────────────────────────────────────────────────────┤
│  Consultor         │ ARR Total  │ MoM(€)  │ MoM(%) │ País      │
│  ─────────────────────────────────────────────────────────────  │
│  Miguel V.         │ €1.120.000 │ +12.000 │ +1.1%  │ Spain     │
│  > isEazy LMS      │   €480.000 │         │        │           │
│  > isEazy Skills   │   €380.000 │         │        │           │
│  > isEazy Author   │   €260.000 │         │        │           │
│  ─────────────────────────────────────────────────────────────  │
│  JM                │   €960.000 │ +18.000 │ +1.9%  │ Spain     │
│  ─────────────────────────────────────────────────────────────  │
│  BA                │   €840.000 │ +22.000 │ +2.7%  │ LatAm     │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

- Tabla expandible: clic en consultor → muestra desglose por línea de negocio.
- Ordenable por columna.
- Exportable.

---

## Vista: Input de Stripe (MRR Author Online)

```
┌─────────────────────────────────────────────────────────────────┐
│  isEazy Author Online — MRR de Stripe                          │
│  (Input manual — actualizar mensualmente desde Stripe)          │
├─────────────────────────────────────────────────────────────────┤
│  Mes      │ MRR (€)    │ ARR equiv. │ Actualizado  │           │
│  Ene 2026 │  9.200     │   110.400  │ 2026-01-15   │ [Editar]  │
│  Feb 2026 │  9.350     │   112.200  │ 2026-02-12   │ [Editar]  │
│  Mar 2026 │  9.480     │   113.760  │ 2026-03-10   │ [Editar]  │
│  Abr 2026 │  9.600  ⚠️ │   115.200  │ (sin datos)  │ [Añadir]  │
│                                                    ⚠️ Mes sin dato │
└─────────────────────────────────────────────────────────────────┘
```

---

## Vista: Historial de Snapshots

```
┌─────────────────────────────────────────────────────────────────┐
│  Historial de Snapshots                                         │
├─────────────────────────────────────────────────────────────────┤
│  Fecha              │ ARR Total   │ Registros │ Alertas │       │
│  17 abr 2026 10:30  │ €3.920.000  │  14.110   │    3    │ [Ver] │
│  16 abr 2026 09:15  │ €3.852.000  │  14.098   │    2    │ [Ver] │
│  01 abr 2026 11:00  │ €3.801.000  │  14.085   │    5    │ [Ver] │
│  ...                                                            │
│                              [Comparar dos snapshots ▾]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Vista: Alertas de calidad de datos

```
┌─────────────────────────────────────────────────────────────────┐
│  Alertas de calidad de datos — Sync 17 abr 2026                │
├─────────────────────────────────────────────────────────────────┤
│  ⚠️ UNCLASSIFIED_PRODUCT                                        │
│  Oportunidad: "[CLI] Renovación plataforma"                     │
│  Cliente: Acme Corp | Producto: "New Product XYZ"               │
│  → Añadir clasificación en Configuración > Productos            │
│  [Marcar como revisada] [Ir a configuración]                    │
├─────────────────────────────────────────────────────────────────┤
│  ⚠️ DURATION_HIGH (>730 días)                                   │
│  Oportunidad: "Contrato global Virto"                           │
│  Cliente: Virto | Duración: 1825 días | ARR calculado: €2.400   │
│  → Verificar si el importe en SF corresponde al periodo total   │
│  [Marcar como revisada] [Añadir nota: "Contrato 5 años, ok"]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Vista: Configuración — Clasificación de productos

```
┌─────────────────────────────────────────────────────────────────┐
│  Clasificación de Productos                                     │
│  [+ Añadir producto] [Importar desde SF]                       │
├─────────────────────────────────────────────────────────────────┤
│  Nombre del Producto    │ Tipo           │ SaaS │ Línea        │
│  ──────────────────────────────────────────────────────────── │
│  Usuarios               │ SaaS LMS       │  ✅  │ isEazy LMS   │
│  isEazy Skills Base     │ SaaS Skills    │  ✅  │ isEazy Skills│
│  Implementación básica  │ Implantación   │  ❌  │ isEazy LMS   │
│  New Product XYZ        │ [SIN ASIGNAR]⚠️│  -   │ -            │ [Editar]
└─────────────────────────────────────────────────────────────────┘
```

---

## Endpoints de API necesarios

```
GET  /api/arr/summary?snapshot_id=&month_from=&month_to=&product_type=&consultant=
     → ARR mensual con filtros

GET  /api/arr/by-consultant?snapshot_id=&month=&country=
     → ARR por consultor para un mes

GET  /api/arr/line-items?snapshot_id=&filters...
     → Lista paginada de line items con detalles

GET  /api/snapshots
     → Lista de snapshots con metadatos

GET  /api/snapshots/{id}
     → Detalle de un snapshot

POST /api/sync
     → Lanza sincronización con SF

GET  /api/alerts?snapshot_id=&reviewed=false
     → Alertas de un snapshot

PATCH /api/alerts/{id}
     → Marcar alerta como revisada con nota

GET  /api/config/products
PUT  /api/config/products/{id}
POST /api/config/products

GET  /api/config/consultants
PUT  /api/config/consultants/{id}

GET  /api/stripe-mrr?snapshot_id=
PUT  /api/stripe-mrr  → {snapshot_id, month, mrr}
```
