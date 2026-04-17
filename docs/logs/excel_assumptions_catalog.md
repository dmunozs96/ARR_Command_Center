# Catálogo de Assumptions del Excel ARR
**Fecha de análisis:** 2026-04-17
**Estado:** Extraídos del análisis de fórmulas. Pendientes de confirmación explícita.

Los assumptions son supuestos implícitos en el Excel que no están documentados formalmente.
Se ordenan por impacto estimado en el cálculo del ARR.

---

## AS-01 [ALTO] Sin fecha de inicio → el servicio empieza en la fecha de cierre

**Dónde:** Col V (`fecha inicio`), fórmula `IF(S="", EDATE(G, 0), S)`  
**Assumption:** Si Salesforce no tiene fecha de inicio de suscripción, se supone que el contrato empieza el mismo día que se cierra la oportunidad.  
**Volumen estimado:** Afecta a todas las oportunidades antiguas (pre-adopción de campos de suscripción en SF) y a las que se crearon sin estos campos.  
**Validez:** Posiblemente correcta para nuevas ventas, pero puede ser inexacta en renovaciones, contratos retroactivos o acuerdos firmados con antelación.  
**Riesgo:** Puede adelantar o atrasar el ARR incorrectamente.

---

## AS-02 [ALTO] Sin fecha de fin → el contrato dura 1 año (365 días)

**Dónde:** Col W (`fecha fin`), fórmula `IF(T="", V+365, T)`  
**Assumption:** Si Salesforce no tiene fecha de fin, se asume que la suscripción dura exactamente 365 días.  
**Volumen estimado:** Afecta a contratos históricos sin campo de fin.  
**Validez:** Razonable para contratos anuales estándar; incorrecto para contratos mensuales o multianuales.  
**Riesgo:** Contratos mensuales se inflarán como anuales. Contratos de 3 años se recortarán a 1 año.

---

## AS-03 [ALTO] El servicio anualizado se calcula multiplicando el precio diario × 365

**Dónde:** Col AJ (`servicio anualizado`), fórmula `precio_diario * 365`  
**Assumption:** Todos los contratos son anuales en cuanto a valor. El ARR es el precio que se pagaría si el contrato durara exactamente un año.  
**Implicación matemática:** Un contrato de 6 meses con precio 5.000€ tiene ARR = 5.000/183*365 ≈ 9.973€.  
**Validez:** Es la definición estándar de ARR (Annual Run Rate).  
**Riesgo:** Para contratos "one-shot" que no son recurrentes, este cálculo infla el ARR irresponsablemente.

---

## AS-04 [MEDIO] El periodo se normaliza al mes, no al día exacto

**Dónde:** Cols Y (`inicio mes`) y Z (`fin mes`).  
**Assumption:** Lo relevante para el ARR es el mes, no el día exacto. Un contrato activo cualquier día del mes se considera activo todo el mes.  
**Implicación:** No hay prorrateo a nivel de días dentro de un mes para la suma ARR mensual.  
**Validez:** Estándar en reporting ARR SaaS.

---

## AS-05 [MEDIO] El ARR de "isEazy Author Online" es el MRR de Stripe × 12

**Dónde:** Fila 11 del Resumen, referencia a `Mtricas_de_suscripciones_mensua`.  
**Assumption:** El ARR de la línea de suscripciones self-service (Stripe) se calcula como MRR * 12.  
**Implicación:** Se asume que el MRR de Stripe es estable durante el año. Si hay churn o expansión, el ARR no lo captura dinámicamente.

---

## AS-06 [MEDIO] Solo se anualizan productos SaaS

**Dónde:** Criterio `$U:$U` en los SUMIFS.  
**Assumption:** Solo los productos clasificados como SaaS son recurrentes y merecen ser anualizados. Los servicios (Implantación, Catálogo, etc.) son one-shot y no se incluyen en el ARR.  
**Validez:** Correcto según la definición de ARR. Un servicio de implantación no es recurrente.  
**Riesgo:** Algunos servicios como "TaaS" (Training as a Service) o "Catálogo de Servicios" podrían tener componentes recurrentes no capturados.

---

## AS-07 [MEDIO] Las oportunidades de tipo "Negocio existente" son renovaciones reales

**Dónde:** Col D (`Tipo`), con valor "Negocio existente".  
**Assumption:** Se asume que estas oportunidades representan renovaciones de clientes existentes, y se tratan igual que nuevas oportunidades a efectos de ARR.  
**Riesgo:** Si un cliente renueva con el mismo periodo de inicio, el ARR podría contarse dos veces (ARR del contrato original solapado con el renovado).

---

## AS-08 [BAJO] La tabla de clasificación de productos está siempre actualizada

**Dónde:** `Productos SF SAAS`, usada en col U.  
**Assumption:** Cuando se añade un nuevo producto en Salesforce, se actualiza esta tabla.  
**Riesgo:** Si se olvida actualizar, ese producto no se clasifica (→ #N/A) y su ARR no se contabiliza.

---

## AS-09 [BAJO] La tabla País Consultor está siempre actualizada

**Dónde:** `País Consultor`, usada en col AG.  
**Assumption:** Cuando se añade un nuevo consultor, se registra su país en esta tabla.  
**Riesgo:** Si no se actualiza, la columna AG dará error para ese consultor y los SUMIFS con criterio de país/consultor podrían fallar.

---

## AS-10 [BAJO] No hay contratos en múltiples monedas

**Dónde:** Implícito. No hay columna de moneda en "Opos con Productos".  
**Assumption:** Todos los contratos están en EUR.  
**Riesgo:** Si isEazy tiene contratos en USD, GBP u otras monedas, el ARR mezcla monedas sin conversión.  
**Estado:** Pendiente de validar con el negocio (presencia en LatAm puede implicar contratos en USD o moneda local).
