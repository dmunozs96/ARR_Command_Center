# Requisitos Funcionales
**Versión:** 1.0
**Fecha:** 2026-04-17
**Estado:** BORRADOR — derivado del análisis del Excel + decisiones del CFO

Cada requisito se clasifica como:
- **MVP** — imprescindible en la primera versión funcional
- **V2** — segunda iteración, una vez el MVP es estable
- **NICE** — deseable a largo plazo

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
