# Preguntas Abiertas y Riesgos
**Fecha de creación:** 2026-04-17
**Última actualización:** 2026-09-03

---

## Preguntas abiertas de negocio (requieren respuesta del CFO/negocio)

### ~~Q-01~~ ✅ RESUELTA — "SAAS - Variable Invoicing" usa la misma lógica
- **Respuesta del CFO (2026-04-17):** Se anualizan siempre que el tipo de producto en col U sea "SaaS". Misma lógica que el resto.
- **Implementación:** El campo `opportunity_type` no afecta al cálculo. Solo el `product_type` determina si es SaaS y se incluye.
- **Nota:** De los 1.103 line items de Variable Invoicing, 1.073 son SaaS (LMS: 904, Engage: 160, otros: 9) y 30 no son SaaS (excluidos).

### ~~Q-02~~ ✅ RESUELTA — Stripe manual en V1, API en V2
- **Respuesta del CFO (2026-04-17):** V1: campo en la UI para que el usuario introduzca el importe manualmente. V2: integración con API de Stripe.
- **Implementación:** Ver ADR-002 y requisito funcional F-07.

### ~~Q-03~~ ✅ RESUELTA — ARR desde close won (backlog approach)
- **Respuesta del CFO (2026-05-04):** Contar oportunidades desde que se marcan como ganadas (close date), no desde el inicio del servicio. Las columnas AC-AF del Excel deben usarse para un criterio "desde cierre" que coexista con el "desde inicio". El usuario del dashboard podrá alternar entre ambos criterios en la pestaña Resumen.
- **✅ IMPLEMENTADO (V-I A):** toggle global `from_start` / `from_close` en el sidebar, persistido en `localStorage` y aplicado a `/api/arr/summary`, `/by-account`, `/by-consultant`, `/gagero/bridge`, `/churn/monthly`, `/churn/monthly-trend` y la exportación Excel.
- **Regla exacta implementada:** el inicio se adelanta al mes de `close_date` **solo si** `opportunity_type == "nuevo negocio"` **y** existe `subscription_start_date` **y** `close_date < subscription_start_date`. `end_month_normalized` **no** se recalcula, por lo que en este modo el contrato abarca más meses. Ver [19 §5.3](./19_calculation_reference.md#53-los-dos-modos-from_start-y-from_close).
- **Derivada:** el gap entre ambos modos se ha convertido en el módulo *Committed vs Real* (V5-P1).

### ~~Q-04~~ ✅ RESUELTA — Todo en EUR
- **Respuesta del CFO (2026-04-17):** Todos los contratos están en EUR. No hay multi-currency.
- **Implementación:** Sistema opera en EUR. No se necesita lógica de conversión de moneda.

### ~~Q-05~~ ✅ RESUELTA — TaaS excluido del ARR SaaS
- **Respuesta del CFO (2026-05-04):** TaaS no se considera ARR SaaS. Confirmado por el SUMIF de la pestaña Resumen del Excel original.
- **Implementación:** Ya correcta si el filtro por `product_type` excluye TaaS. Verificar en validación cruzada.

### ~~Q-06~~ ✅ RESUELTA — Doble conteo en solapamientos: detectar + decidir línea a línea
- **Respuesta del CFO (2026-05-04):** El riesgo es real. La solución deseada: (i) alertar al usuario cuando se detecten solapamientos, (ii) permitir decidir línea a línea si incluir o excluir el contrato solapado en el ARR del dashboard. Flujo: usuario de dirección reporta con la exclusión elegida e informa al asistente para que lo arregle en SF a largo plazo.
- **🟡 IMPLEMENTADO PARCIALMENTE (V-I B):** alerta `OVERLAPPING_CONTRACTS` (dos por par solapado, una por línea, con el ARR expuesto), flag `excluded_from_arr` en `arr_line_items` editable vía `PATCH /api/arr/line-items/{id}`, y respeto de la exclusión en **todos** los endpoints analíticos.
- **⚠️ Deuda abierta:** la detección solo se invoca en la vía Salesforce (`snapshot_manager`). El importador de Excel —la vía operativa hoy— **no la llama**, por lo que en producción no se están generando estas alertas. Ver [19 INC-03](./19_calculation_reference.md#inc-03).

### ~~Q-07~~ ✅ RESUELTA — Sync diaria con diseño incremental inteligente
- **Respuesta del CFO (2026-05-04):** Preferencia por sync diaria si es viable. Preocupación válida sobre recálculo innecesario. Decisión pendiente de análisis técnico (ver conversación 2026-05-04).
- **✅ IMPLEMENTADO:** `POST /api/sync/cron/daily` protegido por `X-Cron-Secret` (env `CRON_SECRET`), programado en Railway, con deduplicación por `data_hash` (SHA-256 de los datos crudos): si el hash coincide con el del último snapshot `salesforce_full` completado, responde `status="skipped"` y no crea snapshot.
- **No implementado:** el delta sync por `LastModifiedDate` de Salesforce. Se descartó por innecesario dado que el hash ya evita el recálculo.

### Q-08 [MEDIA] ¿Cuál es la fecha de adopción de campos de suscripción en Salesforce?
- **Contexto:** Oportunidades antiguas no tienen fechas de suscripción → assumptions aplicados
  (AS-01: se usa `close_date`; AS-02: se asumen 365 días).
- **Impacto:** Define la fiabilidad del ARR histórico y el "cutoff" de datos de confianza.
- **Cómo medirlo hoy:** los flags `MISSING_START_DATE` / `MISSING_END_DATE` y las columnas
  `used_start_fallback` / `used_end_fallback` permiten contar exactamente cuántas líneas de cada
  mes dependen de un fallback. **Pendiente:** exponer ese porcentaje como indicador de
  fiabilidad por año en la UI.

### Q-09 [ALTA] Semántica del campo de Author Online (Stripe)
- **Contexto:** `snapshot_stripe_mrr.mrr` se trata como **ARR anual** en el dashboard, el churn y
  la UI, pero como **MRR mensual** en `arr_equivalent` (×12), en la tool del ARR Expert y en la
  rama `online anual / 12` del importador de Excel.
- **Impacto:** riesgo de comunicar el ARR de Author Online con un factor 12 de error según por
  dónde se consulte.
- **Necesario del negocio:** confirmar qué contiene exactamente la fila `Ending MRR` del Excel de
  Stripe y si el valor que se introduce a mano en `/stripe` es anual o mensual.
- Ver [19 INC-01](./19_calculation_reference.md#inc-01).

### Q-10 [ALTA] ¿Los importes del monitor de renovaciones deben ser anuales o mensuales?
- **Contexto:** `current_arr` y `renewal_arr` se calculan como `precio_diario × días del mes`
  (≈ ARR/12) pero se rotulan "ARR actual", "ARR en riesgo" y "ARR ya renovado". No son
  comparables con el dashboard, y el forecast de base instalada hereda esa unidad.
- **Decisión necesaria:** anualizar (coherencia con el resto de la app) o renombrar de forma
  explícita a "importe mensual".
- Ver [19 INC-02](./19_calculation_reference.md#inc-02).

### Q-11 [MEDIA] ¿Un cliente que migra de línea de negocio es churn?
- **Contexto:** la clave de movimiento es `(cliente_consolidado, línea_de_negocio)`. Un cliente
  que pasa de `SaaS LMS` a `SaaS AIO` genera **churn en LMS + new logo en AIO** simultáneamente.
- **Es intencionado** (permite leer churn por línea), pero infla ambas métricas a nivel compañía.
  Activar la agrupación LMS+AIO **no** lo resuelve, porque la clave sigue separando las líneas.
- **Decisión necesaria:** ¿se quiere una lectura adicional "churn de cliente" (clave solo
  `client_name`, sin dimensión de producto) para el comité?
- Ver [19 §8.1](./19_calculation_reference.md#81-clave-de-movimiento) y [§16](./19_calculation_reference.md#16-agrupación-de-líneas-de-negocio-lmsaio-author-total).

### Q-12 [MEDIA] ¿Meses sin dato de Stripe deben valer 0 o heredar el último valor?
- **Contexto:** F-07 especifica "último valor conocido con advertencia visual". El código no
  interpola: el mes vacío aporta 0 a Author Online, lo que produce una caída artificial del ARR
  total. Hay aviso en la UI, pero solo para el mes en curso.
- Ver [19 INC-04](./19_calculation_reference.md#inc-04).

### Q-13 [MEDIA] ¿Se corrige el off-by-one de `service_days` heredado del Excel?
- **Contexto:** `service_days = duración − 1`, por lo que un contrato anual se anualiza a
  `precio × 365/364` (+0,275 %). Es fiel al Excel (ADR-001) y consistente en toda la serie, así
  que no distorsiona tendencias, pero infla ligeramente los niveles absolutos.
- **Trade-off:** corregirlo rompe la comparabilidad con el histórico presentado al comité.
- Ver [19 INC-05](./19_calculation_reference.md#inc-05).

### Q-14 [BAJA] ¿El forecast debe componer las tasas a 12 meses?
- **Contexto:** la Base Instalada Predictiva aplica **una vez** tasas mensuales sobre el ARR
  inicial, pero rotula el resultado "Churn esperado 12M". La lectura correcta hoy es "el efecto
  de un mes típico proyectado sobre la base".
- **Decisión necesaria:** componer a 12 meses, o cambiar el rótulo.
- Ver [19 §13.4](./19_calculation_reference.md#134-modelo).

---

## Riesgos técnicos

### RT-01 [ALTA] Calidad de datos en Salesforce
- Los campos de suscripción pueden estar vacíos, con formato incorrecto o con valores incoherentes.
- **Mitigación:** Validaciones en la capa de ingestión + alertas de calidad de datos.

### RT-02 [ALTA] Tabla de clasificación de productos desactualizada
- Si se añade un nuevo producto en Salesforce sin actualizar la tabla maestra, su ARR queda sin clasificar.
- **Mitigación:** Detección automática de productos no clasificados post-sync.

### RT-03 [MEDIA] Stripe como fuente paralela no automatizada
- Si Stripe no se integra automáticamente, el ARR de Author Online quedará desactualizado.
- **Mitigación:** Definir proceso de importación periódica o automatizar.

### RT-04 [MEDIA] Excepciones no documentadas formalmente
- Hay excepciones conocidas documentadas solo en una hoja informal del Excel.
- Pueden existir más excepciones desconocidas.
- **Mitigación:** Revisión completa de BBDD--> con el CFO. Implementar flags de anomalías.

### RT-05 [MEDIA] Rendimiento con dataset creciente
- El dataset tiene ~14K filas ahora. Con más años crecerá.
- **Mitigación:** Indexar por (product_type, start_month, end_month) en la BD.

### RT-06 [ALTA] Acceso a API de Salesforce — **materializado**
- Puede requerir configuración de Connected App, permisos específicos, límites de API.
- **Estado 2026-09-03:** el riesgo se ha materializado. El extractor está implementado y testeado
  pero **sin credenciales**, así que la operación real depende de la carga manual del Excel.
- **Consecuencias vivas:** (i) los solapamientos no se detectan (RT-07), (ii) la sync diaria por
  cron no aporta valor hoy, (iii) los IDs de línea son sintéticos (RT-08).
- **Mitigación:** Ver `docs/specs/04_salesforce_integration_plan.md`.

### RT-07 [ALTA] Las dos vías de ingesta no son funcionalmente equivalentes
- La vía Excel resuelve `client_name` y detecta conflictos de cuenta padre, pero **no** detecta
  solapamientos ni calcula `data_hash`. La vía Salesforce hace lo contrario.
- **Impacto:** controles de calidad activos o no según la vía usada, sin que sea evidente en la UI.
- **Mitigación:** unificar el post-proceso de ambas vías (invocar `check_overlapping_contracts` y
  `assign_client_names` en las dos). Ver [19 §1.C](./19_calculation_reference.md#1c-diferencia-relevante-entre-ambas-vías) e [INC-03](./19_calculation_reference.md#inc-03).

### RT-08 [MEDIA] IDs sintéticos de la carga de Excel pueden colisionar
- `sf_line_item_id` se deriva de `(oportunidad, cuenta, fecha_cierre, producto, precio, cantidad)`.
  Dos filas idénticas en esos campos producen el mismo ID.
- **Impacto:** el ARR no se pierde, pero se colapsa la traza entre línea calculada y fila cruda, y
  el detalle del Revisor de Snapshot (que empareja por ese ID) fusiona duplicados exactos.
- **Mitigación:** incluir el número de fila del Excel en la clave.
  Ver [19 INC-06](./19_calculation_reference.md#inc-06).

### RT-09 [MEDIA] Cálculo analítico en memoria sobre el dataset completo
- Varios endpoints (`/arr/summary`, `/by-account`, el núcleo de movimientos de churn y gágero)
  cargan todas las líneas del snapshot y agregan en Python, y `/churn/rolling` repite ese cálculo
  una vez por mes de la serie.
- **Impacto:** el tiempo de respuesta crece linealmente con el histórico (~15 K filas hoy) y de
  forma cuadrática en `/rolling`.
- **Mitigación:** ya hay caché por mes en `/churned-accounts`; pendiente evaluar agregación en SQL
  o materialización por mes si el dataset se multiplica.

---

## Riesgos funcionales

### RF-01 [ALTA] La lógica del Excel puede diferir de la intención real del negocio
- Algunas fórmulas pueden ser workarounds históricos que ya no reflejan la realidad.
- **Mitigación:** Revisión explícita con el CFO de cada regla documentada.

### RF-02 [MEDIA] El cambio de Excel a app puede revelar discrepancias en cifras
- Al replicar la lógica, pueden aparecer diferencias pequeñas por redondeo, normalización o datos adicionales.
- **Mitigación:** Fase de validación cruzada: comparar output de la app con el Excel para un periodo conocido.

### RF-03 [MEDIA] Gestión de snapshots históricos para auditoría
- La app debe mantener versiones históricas del ARR para auditoría y comparativa.
- **Mitigación:** Diseño de snapshots inmutables. Ver `docs/specs/10_versioning_and_snapshots.md`.
