# Preguntas Abiertas y Riesgos
**Fecha de creación:** 2026-04-17
**Última actualización:** 2026-04-17

---

## Preguntas abiertas de negocio (requieren respuesta del CFO/negocio)

### Q-01 [BLOQUEANTE] ¿Cómo tratar "SAAS - Variable Invoicing"?
- **Contexto:** Existen 1.103 line items con tipo "SAAS - Variable Invoicing". No tienen lógica diferenciada en el Excel.
- **Opciones:** (a) Anualizarlos igual que contratos fijos. (b) Usar el importe real sin anualizar. (c) Excluirlos del ARR.
- **Impacto:** Afecta a ~7% de los line items.

### Q-02 [ALTA] ¿Stripe se automatiza o se gestiona manualmente?
- **Contexto:** El ARR de isEazy Author Online (SaaS self-service) viene de Stripe, no de Salesforce.
- **Opciones:** (a) API de Stripe automatizada. (b) Importación manual del CSV de Stripe. (c) Mantener como tabla estática en la app.
- **Impacto:** Afecta al alcance técnico de la integración.

### Q-03 [ALTA] ¿Cuándo y cómo implementar "ARR desde close won"?
- **Contexto:** El Excel tiene infraestructura preparada (columnas AC-AF) pero no está implementada en los resúmenes.
- **Pregunta:** ¿Cuál es la definición exacta de "inicio" en el modo close won? ¿Solo aplica a Nuevo Negocio?
- **Impacto:** Cambia significativamente cómo se reporta la cartera.

### Q-04 [ALTA] ¿Hay contratos en monedas distintas al EUR?
- **Contexto:** No hay columna de moneda en los datos. isEazy tiene presencia en LatAm.
- **Impacto:** Si hay contratos en otras monedas, el ARR mezcla monedas. Necesitaría conversión con tipo de cambio.

### Q-05 [MEDIA] ¿"TaaS" (Training as a Service) debe incluirse en el ARR SaaS?
- **Contexto:** Hay 20 line items con tipo "TaaS". No es un SaaS tradicional pero puede ser recurrente.
- **Impacto:** Pequeño volumen, pero afecta a la definición de ARR.

### Q-06 [MEDIA] ¿Existe riesgo de doble conteo en renovaciones?
- **Contexto:** Si un contrato original y su renovación se solapan en fechas, el ARR de esos días se contaría dos veces.
- **Pregunta:** ¿El Excel actual gestiona esto? ¿Se revisa manualmente?

### Q-07 [MEDIA] ¿Qué frecuencia de actualización se necesita?
- **Opciones:** Diaria automática / Semanal / On-demand con botón.
- **Impacto:** Afecta al diseño del scheduler y a los costes de API de Salesforce.

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
