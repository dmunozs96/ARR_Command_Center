# Preguntas Abiertas y Riesgos
**Fecha de creación:** 2026-04-17
**Última actualización:** 2026-05-04

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
- **Implementación pendiente:** Toggle en el dashboard entre `arr_from_start` y `arr_from_close`. El motor de cálculo necesita campo `close_date` de SF y columna calculada alternativa. Ver Fase I (nueva).

### ~~Q-04~~ ✅ RESUELTA — Todo en EUR
- **Respuesta del CFO (2026-04-17):** Todos los contratos están en EUR. No hay multi-currency.
- **Implementación:** Sistema opera en EUR. No se necesita lógica de conversión de moneda.

### ~~Q-05~~ ✅ RESUELTA — TaaS excluido del ARR SaaS
- **Respuesta del CFO (2026-05-04):** TaaS no se considera ARR SaaS. Confirmado por el SUMIF de la pestaña Resumen del Excel original.
- **Implementación:** Ya correcta si el filtro por `product_type` excluye TaaS. Verificar en validación cruzada.

### ~~Q-06~~ ✅ RESUELTA — Doble conteo en solapamientos: detectar + decidir línea a línea
- **Respuesta del CFO (2026-05-04):** El riesgo es real. La solución deseada: (i) alertar al usuario cuando se detecten solapamientos, (ii) permitir decidir línea a línea si incluir o excluir el contrato solapado en el ARR del dashboard. Flujo: usuario de dirección reporta con la exclusión elegida e informa al asistente para que lo arregle en SF a largo plazo.
- **Implementación pendiente:** Nueva alerta `OVERLAPPING_CONTRACTS` + flag `excluded_from_arr` por line_item + toggle en la UI de alertas. Ver Fase I (nueva).

### ~~Q-07~~ ✅ RESUELTA — Sync diaria con diseño incremental inteligente
- **Respuesta del CFO (2026-05-04):** Preferencia por sync diaria si es viable. Preocupación válida sobre recálculo innecesario. Decisión pendiente de análisis técnico (ver conversación 2026-05-04).
- **Implementación pendiente:** Railway cron diario + hash de snapshot para skip si no hay cambios + opción de delta sync por LastModifiedDate de SF. Ver Fase I (nueva).

### Q-08 [BAJA] ¿Cuál es la fecha de adopción de campos de suscripción en Salesforce?
- **Contexto:** Oportunidades antiguas no tienen fechas de suscripción → assumptions aplicados.
- **Impacto:** Define la fiabilidad del ARR histórico y el "cutoff" de datos de confianza.

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

### RT-06 [BAJA] Acceso a API de Salesforce
- Puede requerir configuración de Connected App, permisos específicos, límites de API.
- **Mitigación:** Ver `docs/specs/04_salesforce_integration_plan.md`.

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
