# Requisitos Funcionales
**Versión:** 2.0
**Fecha original:** 2026-04-17
**Última actualización:** 2026-09-03
**Estado:** VIGENTE — actualizado con V2 a V6

Cada requisito se clasifica como:
- **MVP** — imprescindible en la primera versión funcional
- **V2** — segunda iteración, una vez el MVP es estable
- **NICE** — deseable a largo plazo

La etiqueta de prioridad original se conserva por trazabilidad; el **estado real de
implementación** está en la tabla siguiente.

---

## Estado de implementación (2026-09-03)

Leyenda: ✅ implementado · 🟡 parcial · ⛔ no implementado · 🚫 descartado

### Requisitos originales (F-01 a F-22)

| Req | Descripción corta | Estado | Nota |
|---|---|---|---|
| F-01 | Ingestión desde Salesforce | 🟡 | Código completo y testeado; **sin credenciales SF**. La vía operativa es F-23 (carga de Excel) |
| F-02 | Botón de refresco manual | ✅ | `SyncButton` + `ExcelUploadButton` |
| F-03 | Cálculo ARR por línea de producto | ✅ | Ver [19 §4](./19_calculation_reference.md#4-motor-de-cálculo-arr-por-línea-de-producto) |
| F-04 | Clasificación de productos SaaS | ✅ | Con clave compuesta nombre\|línea + inferencia heurística + placeholder `[SIN ASIGNAR]` |
| F-05 | ARR mensual por snapshot | ✅ | Se recalcula en vivo desde `arr_line_items` |
| F-06 | Dashboard ARR por línea de negocio | ✅ | Sin gráfico YoY dedicado; el YoY está en los KPIs |
| F-07 | ARR Author Online (Stripe) manual | 🟡 | Input manual + carga masiva OK. **No** se hereda el último valor conocido en meses vacíos (INC-04) |
| F-08 | Filtros y segmentación | 🟡 | Activos: línea de negocio, cliente, país, consultor, rango de meses. **No** hay filtro por tipo de oportunidad ni por canal |
| F-09 | ARR por consultor | ✅ | Con drill-down de nivel 2 (clientes por línea) |
| F-10 | Snapshots históricos inmutables | ✅ | Incluye el valor de Stripe usado |
| F-11 | Alertas de calidad de dato | ✅ | Con agrupación por causa raíz e impacto en ARR. `DURATION_ANOMALY_HIGH` suprimida por ruido |
| F-12 | Comparativa entre snapshots | ✅ | Módulo *Revisor de Snapshot* (V4-P1) |
| F-13 | ARR desde close won | ✅ | Toggle global `from_start` / `from_close` (V-I A) |
| F-14 | Integración automática con Stripe | ⛔ | Sigue siendo input manual |
| F-15 | Exportación a Excel/CSV | ✅ | Excel de snapshot + CSV en varias tablas |
| F-16 | Tabla consultor → país editable | ✅ | `/config` |
| F-17 | ARR por tipo de oportunidad (canal) | ⛔ | El campo se ingesta pero no se explota |
| F-18 | ARR por partner | ⛔ | |
| F-19 | ARR vs Budget (FY) | ⛔ | |
| F-20 | Sincronización automática programada | ✅ | Cron diario en Railway con dedup por hash |
| F-21 | Autenticación de usuarios | ⛔ | Control a nivel de despliegue |
| F-22 | Logs de auditoría | 🟡 | Tabla `sync_logs` + trazas de revisión de alertas; sin log unificado de cambios en maestros |

### Requisitos añadidos después (F-23 a F-31)

| Req | Descripción corta | Versión | Estado |
|---|---|---|---|
| F-23 | Carga manual de BBDD vía Excel | V1.5 | ✅ |
| F-24 | Exclusión manual de líneas del ARR + detección de solapamientos | V-I B | 🟡 (ver INC-03) |
| F-25 | Análisis por cliente y agrupación de líneas de negocio | V2-P1/P3 | ✅ |
| F-26 | Top N clientes en dashboard | V2-P2 | ✅ |
| F-27 | ARR Expert (IA embebida) | V2-P4 | ✅ |
| F-28 | Gágero — puente de variaciones de ARR | V4-P2 | ✅ |
| F-29 | Churn y retención de ingresos | V4-P3 | ✅ |
| F-30 | Monitor de renovaciones | V4-P4 | ✅ |
| F-31 | Base Instalada Predictiva (forecast) | V4.5 | ✅ |
| F-32 | Committed vs Real (delta de implantación) | V5-P1 | ✅ |
| F-33 | Consolidación por cuenta principal (grupo empresarial) | V6 | ✅ |

Los detalles de cálculo de F-23 a F-33 están en
[19_calculation_reference.md](./19_calculation_reference.md); su descripción funcional, al final
de este documento.

---

## F-01 Ingestión de datos desde Salesforce [MVP]

La app debe conectarse a Salesforce y extraer:
- Oportunidades en etapa "Closed Won"
- Sus líneas de producto (OpportunityLineItems)
- Campos necesarios para el cálculo ARR (ver `docs/logs/salesforce_field_mapping.md`)

**Criterios de aceptación:**
- Se pueden extraer todas las oportunidades ganadas desde SF.
- Los datos se almacenan en la base de datos local.
- El proceso es reproducible sin intervención manual en el código.

---

## F-02 Botón de refresco manual [MVP]

La app debe ofrecer un botón visible en la UI para lanzar una nueva sincronización con Salesforce.

**Criterios de aceptación:**
- El usuario hace clic en "Actualizar desde Salesforce".
- La app muestra un indicador de progreso.
- Al terminar, muestra la fecha y hora de la última sincronización.
- Si la sincronización falla, muestra un mensaje de error claro.

---

## F-03 Cálculo ARR por línea de producto [MVP]

Por cada OpportunityLineItem SaaS, la app calcula:
- `precio_real` = cantidad × precio_unitario
- `fecha_inicio_efectiva` con fallback a close_date si vacía
- `fecha_fin_efectiva` con fallback a start + 365 si vacía
- `inicio_mes` = primer día del mes de inicio
- `fin_mes_normalizado` = inicio_mes + días_brutos - 1
- `dias_servicio` = fin_mes_normalizado - inicio_mes
- `precio_diario` = precio_real / dias_servicio
- `servicio_anualizado` = precio_diario × 365

**Criterios de aceptación:**
- El cálculo reproduce fielmente la lógica del Excel para el mismo dataset.
- Los line items no SaaS quedan calculados pero excluidos del ARR.
- Los line items con producto no clasificado se marcan como UNCLASSIFIED y se excluyen del ARR.

---

## F-04 Clasificación de productos SaaS [MVP]

La app debe tener una tabla maestra de clasificación de productos, equivalente a `Productos SF SAAS` del Excel.

**Criterios de aceptación:**
- Cada producto de Salesforce tiene un tipo asignado (SaaS LMS, SaaS Author, etc.).
- Un producto no clasificado genera una alerta visible.
- La tabla es editable desde la UI por un administrador.

---

## F-05 ARR mensual por snapshot [MVP]

Para cualquier mes, la app calcula el ARR total = suma del `servicio_anualizado` de todos los line items SaaS activos durante ese mes.

La lógica de solapamiento: `inicio_mes <= fin_del_mes_objetivo AND fin_mes_normalizado >= inicio_del_mes_objetivo`.

**Criterios de aceptación:**
- Se puede consultar el ARR de cualquier mes desde la fecha más antigua hasta hoy.
- Los resultados coinciden con el Excel para el mismo dataset.

---

## F-06 Dashboard de ARR por línea de negocio [MVP]

Vista principal con:
- ARR mensual total de la compañía (serie temporal, gráfico de línea)
- Desglose por línea de negocio SaaS: LMS, Author, Skills, Engage, AIO
- MoM (variación mensual absoluta y porcentual)
- YoY (variación interanual)

**Criterios de aceptación:**
- El dashboard carga correctamente con los últimos datos sincronizados.
- Los valores coinciden con la hoja "Resumen" del Excel.

---

## F-07 ARR de isEazy Author Online (Stripe) — input manual [MVP]

La app debe permitir al usuario introducir manualmente el MRR de Stripe por mes para el componente de isEazy Author Online.

**Criterios de aceptación:**
- Hay una sección en la UI para introducir/editar el MRR de Stripe por mes.
- El ARR de Author Online = MRR introducido × 12.
- Este componente se suma al ARR total junto con los datos de Salesforce.
- Si no se ha introducido el MRR de un mes, se usa el último valor conocido (con advertencia visual).

---

## F-08 Filtros y segmentación [MVP]

El usuario debe poder filtrar el ARR por:
- Línea de negocio (LMS, Author, Skills, Engage, AIO)
- Consultor (propietario de oportunidad)
- País del consultor
- Tipo de oportunidad (Nuevo negocio / Negocio existente / Variable Invoicing)
- Canal (KAM / Inbound / Outbound / Partner)
- Rango de fechas (mes de inicio y fin del periodo visualizado)

**Criterios de aceptación:**
- Los filtros se aplican en tiempo real sin recargar la página.
- Se puede combinar cualquier subconjunto de filtros.

---

## F-09 ARR por consultor [MVP]

Vista de tabla con el ARR mensual por consultor (equivalente a la hoja "Consultor Activos + Línea").

**Criterios de aceptación:**
- Lista de consultores con su ARR total del mes seleccionado.
- Posibilidad de expandir por línea de negocio.
- Variación MoM para cada consultor.

---

## F-10 Snapshots históricos inmutables [MVP]

Cada vez que se ejecuta una sincronización, se guarda un snapshot con:
- Dataset completo de line items en ese momento.
- ARR calculado para cada mes hasta la fecha.
- Timestamp de la sincronización.
- Versión de los datos.

**Criterios de aceptación:**
- Los snapshots son de solo lectura (inmutables una vez creados).
- Se puede recuperar y visualizar cualquier snapshot anterior.
- Los snapshots incluyen qué valor de MRR Stripe se usó.

---

## F-11 Alertas de calidad de datos [MVP]

La app debe detectar y alertar sobre:
- Productos no clasificados (no existe en la tabla maestra).
- Line items con fecha_inicio > fecha_fin.
- Line items con duración > 730 días (posible error Virto-like).
- Line items con duración < 15 días.
- Consultores sin país asignado.

**Criterios de aceptación:**
- Hay una sección de "Alertas" visible post-sincronización.
- Las alertas incluyen el nombre de la oportunidad y el cliente afectado.
- El usuario puede marcar una alerta como "revisada y aceptada" con una nota.

---

## F-12 Comparativa entre snapshots [V2]

Comparar el ARR de dos snapshots diferentes para el mismo mes, mostrando diferencias línea a línea.

**Criterios de aceptación:**
- Selector de dos snapshots a comparar.
- Tabla de diferencias: qué oportunidades aparecieron, desaparecieron o cambiaron.
- Diferencia absoluta y porcentual del ARR total.

---

## F-13 ARR desde close won (modo alternativo) [V2]

Modo de visualización alternativo que usa la fecha de close won como inicio del ARR en lugar de la fecha de inicio de servicio.

**Criterios de aceptación:**
- Toggle en el dashboard para cambiar entre "ARR desde servicio" y "ARR desde close won".
- Ambos modos usan la misma fórmula de anualización.
- Diferencia visible entre los dos modos para un mismo mes.

---

## F-14 Integración automática con Stripe [V2]

Automatizar la ingesta del MRR de Stripe via API.

**Criterios de aceptación:**
- Conexión a la API de Stripe con credenciales configuradas.
- MRR actualizado automáticamente en cada sincronización.
- Fallback a input manual si la API falla.

---

## F-15 Exportación a Excel/CSV [V2]

Exportar el dataset calculado y los resúmenes a Excel o CSV.

**Criterios de aceptación:**
- Botón "Exportar" en dashboard y tablas.
- El Excel exportado es compatible con el formato del Excel original.

---

## F-16 Tabla de consultor → país editable [MVP]

La app debe mantener la tabla de asignación consultor → país, editable desde la UI.

**Criterios de aceptación:**
- Vista de lista de consultores con su país.
- Edición inline o formulario de edición.
- Los cambios afectan inmediatamente al cálculo de filtros por país.

---

## F-17 ARR por tipo de oportunidad (canal) [V2]

Vista de ARR segmentada por canal (KAM, Inbound, Outbound, Partner), equivalente a "Resumen Tipo de Opo" del Excel.

---

## F-18 ARR por partner [V2]

Vista de ARR segmentada por partner, equivalente a la hoja "Partner + Línea".

---

## F-19 Modo ARR vs Budget (FY) [V2]

Comparativa del ARR real vs objetivos presupuestados por consultor, equivalente a la hoja "FY26B - ARR por consultor".

**Criterios de aceptación:**
- El usuario puede introducir objetivos de ARR por consultor y período fiscal.
- El dashboard muestra ARR real vs objetivo con % de cumplimiento.

---

## F-20 Sincronización automática programada [V2]

Job nocturno o diario que actualiza los datos automáticamente sin intervención del usuario.

---

## F-21 Autenticación de usuarios [V2]

Acceso controlado por usuario/contraseña o SSO corporativo.

---

## F-22 Logs de auditoría [MVP]

Registro de quién hizo qué y cuándo: sincronizaciones, cambios en tablas maestras, ajustes manuales de Stripe.

---
---

# Requisitos añadidos en V1.5 – V6

> Cálculo detallado de todos ellos en
> [19_calculation_reference.md](./19_calculation_reference.md).

---

## F-23 Carga manual de la BBDD vía Excel [V1.5] ✅

Mientras no haya credenciales de Salesforce, el usuario sube el mismo `.xlsx` que exportaba
antes y la app crea un snapshot completo.

**Criterios de aceptación:**
- `POST /api/imports/excel` acepta un `.xlsx` con la hoja `Opos con Productos` (obligatoria).
- Las columnas se localizan por **nombre de cabecera** con alias tolerantes a acentos, mojibake
  y variantes en inglés; existe fallback por posición si no hay cabecera reconocible.
- Si el fichero trae `Productos SF SAAS` y/o `País Consultor`, los maestros se actualizan
  (upsert, no borrado).
- Si trae la hoja de métricas de Stripe, se carga; si no, se heredan los valores del último
  snapshot `completed`.
- Productos desconocidos se crean como `[SIN ASIGNAR]` y generan alerta, en vez de romper el import.
- Existe además `POST /api/imports/masters` para cargar solo maestros.

---

## F-24 Exclusión manual de líneas del ARR y detección de solapamientos [V-I B] 🟡

Un contrato y su renovación pueden solaparse en el tiempo y contarse dos veces (Q-06).

**Criterios de aceptación:**
- Se detectan pares de líneas SaaS de la misma `(cuenta, línea de negocio)` con rangos de
  actividad solapados y se genera **una alerta por cada línea del par**, con el ARR en riesgo.
- `PATCH /api/arr/line-items/{id}` permite marcar `excluded_from_arr`.
- **Todos** los cálculos (ARR, churn, gágero, renovaciones, committed vs real, exportación)
  respetan la exclusión.
- La alerta indica el importe expuesto para que la decisión sea informada.

**⚠️ Deuda abierta (INC-03):** la detección solo se ejecuta en la vía Salesforce. La vía Excel
—la operativa— no la invoca, por lo que estas alertas no se generan hoy en producción.

---

## F-25 Análisis por cliente y agrupación de líneas de negocio [V2-P1 / V2-P3] ✅

**Criterios de aceptación:**
- Página `/clients` con evolución de ARR por cliente y tabla de detalle.
- Filtro global de cliente en el sidebar, alimentado con los clientes reales del snapshot.
- Dos toggles de agrupación: `LMS & AIO` y `Author (Total)`, persistidos en el navegador.
- La agrupación **suma series mes a mes** (no totales agregados), rellenando con 0 los meses
  ausentes en una de las dos series (corrección V3-P1).
- Al seleccionar una línea agrupada, el filtro se traduce a `product_types` en la API.

---

## F-26 Top N clientes en el dashboard [V2-P2] ✅

**Criterios de aceptación:**
- Gráficos de barras y de líneas con los N clientes de mayor ARR del periodo (defecto 20).
- El ranking es por **ARR acumulado en todos los meses del rango**, no por el último mes.
- Bucket `"Otros"` con el resto (color fijo `#e5e7eb`).
- Paleta de 20 colores estable por posición de ranking.

---

## F-27 ARR Expert — IA embebida [V2-P4] ✅

**Criterios de aceptación:**
- `POST /api/expert/chat` con un bucle agéntico (máx. 10 iteraciones) sobre 6 herramientas de
  consulta: `get_arr_summary`, `get_top_accounts`, `get_arr_mom_changes`,
  `get_upcoming_renewals`, `get_stripe_mrr`, `get_data_quality_summary`.
- Responde en español, en JSON estructurado por bloques (`text`, `table`, `chart`) que el
  frontend renderiza como texto, tabla o gráfico Recharts.
- Solo usa datos del snapshot activo; si no puede responder con ellos, lo dice explícitamente
  en lugar de especular.
- Resuelve nombres de comercial/cliente con coincidencia aproximada e indica el nombre
  normalizado que ha usado.
- Requiere `ANTHROPIC_API_KEY`; si falta, devuelve 503 con mensaje claro.
- Historial limitado a los últimos 20 mensajes; mensaje de entrada truncado a 2.000 caracteres.

---

## F-28 Gágero — puente de variaciones de ARR [V4-P2] ✅

**Criterios de aceptación:**
- `GET /api/gagero/bridge` entre dos meses arbitrarios A y B.
- Descompone la variación en `new_logo`, `churn`, `up_selling`, `down_selling` por
  `(cliente consolidado, línea de negocio)`, más el conteo de sin cambios.
- Se cumple siempre: `ARR(B) − ARR(A) = new_logo + up_selling − churn − down_selling`.
- Cada categoría devuelve el detalle completo de clientes, ordenado por impacto.
- Respeta el modo ARR global y los filtros del sidebar.
- Waterfall visual + tablas resumen y detalle, exportables.

---

## F-29 Churn y retención de ingresos [V4-P3] ✅

**Criterios de aceptación:**
- **Vista mensual** (`/monthly`, `/monthly-trend`): ARR inicial, churn, downselling, upselling,
  new logo, cambio neto de la base existente, GRR, NRR, logo churn rate y tasas sobre el ARR
  inicial. Permite comparar dos periodos arbitrarios, no solo meses consecutivos.
- **Vista de cohorte** (`/ratios`, `/rolling`, `/churned-accounts`, `/by-product-type`) con
  ventana LTM o YTD sobre la cohorte existente al inicio del periodo.
- Tabla de clientes churneados con el **mes exacto** en que se perdieron y el ARR perdido.
- Bajas por línea de negocio en el tiempo.
- Author Online (Stripe) se incluye en la vista mensual como variación de total y **nunca** como
  churn ni new logo; se excluye de la vista de cohorte (nota visible en la UI).
- Las dos familias de métricas deben quedar etiquetadas para que no se comparen entre sí
  (deuda abierta INC-07).

---

## F-30 Monitor de renovaciones [V4-P4] ✅

**Criterios de aceptación:**
- `GET /api/renewals/monitor` con horizonte configurable de 1 a 24 meses (selector 3/6/12/libre).
- Por `(cliente consolidado, línea de negocio)`: importe actual, mes de vencimiento, meses
  restantes y estado `renewed` / `at_risk`.
- Se considera **renovado** si existe en el snapshot una línea del mismo grupo que arranca
  después del vencimiento; se muestra el importe de la renovación y la variación % (up/down).
- KPIs de importe en riesgo y renovado, gráfico por mes de vencimiento, tabla filtrable por
  estado y exportación CSV.
- **⚠️ Deuda abierta (INC-02):** los importes son **mensuales**, no anualizados, pese a
  rotularse "ARR". No son comparables con el dashboard.

---

## F-31 Base Instalada Predictiva [V4.5] ✅

Proyecta la base existente a 12 meses **sin** pipeline, nuevo negocio, CAC ni marketing.

**Criterios de aceptación:**
- Tasas de churn, downselling y upselling derivadas del histórico real de los últimos 12 meses,
  como **media ponderada por el ARR inicial de cada mes**.
- Tres escenarios: Base, Conservador (pérdidas ×1,25 / expansión ×0,75) y Agresivo
  (pérdidas ×0,8 / expansión ×1,2).
- Puente visual `ARR inicial − churn − downsell + upsell = ARR proyectado` y retención neta.
- Mismo modelo desglosado **por línea de negocio**, con tasas propias de cada línea y
  comparativa en tabla.
- Riesgo por renovaciones: aplica las tasas históricas al importe pendiente de renovar cada mes.
- Tabla del histórico que alimenta los supuestos, para auditar la tasa.
- Selector de mes de partida independiente del filtro global.

---

## F-32 Committed vs Real [V5-P1] ✅

**Criterios de aceptación:**
- `GET /api/delta/monthly-trend`: por mes, ARR comprometido (desde cierre), ARR real (desde
  inicio de servicio), delta y nº de contratos en tránsito, con desglose por línea de negocio.
- Etiqueta automática de tendencia del delta: ascendente / descendente / estable / mixta.
- `GET /api/delta/month-breakdown`: radiografía de los contratos que componen el delta de un mes,
  con días transcurridos desde el cierre.
- `GET /api/delta/implementation-alerts`: contratos firmados sin arrancar, priorizados por su
  **percentil** dentro de la distribución histórica de días cierre→inicio **de su propia línea de
  negocio** (mediana, p75, p90).
- Las líneas con menos de 10 muestras históricas se marcan como *no estadísticamente fiables* y
  se ordenan por antigüedad simple, separadas de las fiables.

---

## F-33 Consolidación por cuenta principal [V6] ✅

**Criterios de aceptación:**
- Se lee la columna `Cuenta principal` del Excel y se persiste en crudo para auditoría.
- El cliente consolidado (`client_name`) es la **raíz** del grupo, siguiendo la cadena
  cuenta → padre → abuelo transitivamente, con protección contra ciclos.
- El mapa cuenta→padre es **global**: si una cuenta declara padre en cualquier fila, aplica a
  todas sus filas.
- Una cuenta con dos padres distintos genera alerta `PARENT_ACCOUNT_CONFLICT` y se resuelve de
  forma determinista (primer padre por orden alfabético), nunca en silencio.
- Churn, new logo, up/down-selling, gágero, ARR por cliente, top cuentas, renovaciones y el
  Expert agrupan por `client_name`.
- Snapshots anteriores a V6 (`client_name` NULL) mantienen el comportamiento previo vía
  `COALESCE(client_name, account_name)`.
