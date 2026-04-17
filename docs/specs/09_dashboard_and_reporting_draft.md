# Dashboard y Reporting — Especificación
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
