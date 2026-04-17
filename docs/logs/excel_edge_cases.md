# Edge Cases y Excepciones del Excel ARR
**Fecha de análisis:** 2026-04-17

Estos son casos especiales detectados en el análisis que la aplicación debe manejar explícitamente.

---

## EC-01: Contrato con duración anómala (Virto - 5 años)
**Detectado en:** Hoja `BBDD-->` (nota manual)  
**Descripción:** Cliente Virto. Contrato firmado por 5 años. Al segundo año pidió baja. En Salesforce se pusieron importes de 1 año con fechas de 5 años.  
**Impacto en Excel:** La duración del servicio es ~1.825 días → precio_diario = precio_real/1825 → servicio_anualizado ≈ precio_real/5. ARR subestimado por factor 5.  
**Cómo debería tratarse:** El ARR debería ser precio_anual_real = precio_real (si es el precio de un año) o precio_real/5 (si es el precio de 5 años). **Ambigüedad que requiere clarificación.**  
**Recomendación app:** Flag automático para oportunidades con duración > 24 meses o < 15 días para revisión manual.

---

## EC-02: Contrato nombrado como 9 meses pero facturado a 12
**Detectado en:** Hoja `BBDD-->` (nota manual)  
**Descripción:** Oportunidad con fechas de 9 meses pero la facturación real fue de 12 meses.  
**Impacto en Excel:** ARR calculado como si fuera 9 meses → precio_diario_alto → ARR sobrestimado.  
**Cómo debería tratarse:** Ajustar las fechas en SF para reflejar los 12 meses reales.  
**Recomendación app:** Alertar cuando `Licence period (months)` no coincide con `fecha_fin - fecha_inicio` en meses.

---

## EC-03: Producto no encontrado en tabla de clasificación (#N/A)
**Detectado en:** Análisis de col U (Tipo de Producto Correcto)  
**Descripción:** 1 línea de producto tiene #N/A porque su nombre no existe en `Productos SF SAAS`.  
**Impacto en Excel:** Ese line item no se incluye en ningún SUMIFS del ARR (el criterio no hace match).  
**Cómo debería tratarse:** Alerta inmediata. Cada producto sin clasificar es ARR perdido o mal categorizado.  
**Recomendación app:** Proceso de validación post-sync: listar todos los productos sin clasificar.

---

## EC-04: Oportunidad sin fecha de inicio Y sin fecha de fin
**Detectado en:** Fórmulas V y W  
**Descripción:** Si los dos campos de suscripción están vacíos, el Excel asume start = close_date, end = start + 365.  
**Impacto:** Para oportunidades muy antiguas (pre-2020 principalmente), las fechas de suscripción estaban vacías → el ARR se calcula con la fecha de cierre como proxy.  
**Riesgo:** El ARR de oportunidades antiguas puede estar mal fechado por años.

---

## EC-05: Duración de servicio = 0 días
**Detectado en:** Fórmula de col Z y col AI  
**Descripción:** Si `fecha_fin = fecha_inicio`, entonces `AB (Columna3) = 0` y el fallback en col Z usa `inicio_mes + 30`. Además, `precio_diario = precio_real / 0` sería división por cero.  
**Como lo resuelve el Excel:** El IF en col Z previene que fin_mes = inicio_mes cuando AB=0 (usa +30). Pero si fin_mes=inicio_mes, precio_diario seguiría siendo problemático.  
**Recomendación app:** Validar duración > 0 antes de calcular. Asignar duración mínima de 30 días o marcar como inválido.

---

## EC-06: Múltiples line items de SaaS en la misma oportunidad
**Detectado en:** Datos (varias filas con mismo nombre de oportunidad pero distintos productos)  
**Descripción:** Una oportunidad puede tener tanto productos SaaS como no SaaS. El Excel los trata por separado correctamente.  
**Riesgo específico:** Si una oportunidad tiene dos line items del mismo tipo SaaS (ej: dos líneas de "SaaS LMS"), ambas se sumarán. ¿Es correcto o hay duplicación?

---

## EC-07: Consultor sin país en la tabla País Consultor
**Detectado en:** Fórmula col AG  
**Descripción:** Si un consultor no está en la tabla `País Consultor`, el VLOOKUP devuelve #N/A.  
**Impacto en Excel:** El campo `país del consultor` queda con error. Los resúmenes por país no contabilizarán ese consultor correctamente.

---

## EC-08: Tipo "SAAS - Variable Invoicing"
**Detectado en:** Col D, 1.103 ocurrencias  
**Descripción:** Existe un tipo de oportunidad específico para facturación variable de SaaS. No hay lógica diferenciada para él en el Excel.  
**Preguntas abiertas:**
- ¿Estos contratos son verdaderamente recurrentes o son one-shot variables?
- ¿Deberían anualizarse de la misma forma que contratos fijos?
- ¿El ARR de facturación variable es fiable?

---

## EC-09: isEazy Author Online (Stripe) vs Author Offline (Salesforce)
**Detectado en:** Resumen fila 11 vs fila 10  
**Descripción:** El ARR de Author Online viene de Stripe (hoja `Mtricas_de_suscripciones_mensua`) mientras que Author Offline viene de Salesforce. La suma de ambos da el ARR total de "isEazy Author".  
**Riesgo:** Si un cliente aparece en ambas fuentes (Stripe y Salesforce como oportunidad), se contará dos veces.  
**Recomendación app:** Investigar si existe deduplicación lógica. Documentar explícitamente qué clientes están en Stripe y cuáles en SF.

---

## EC-10: Oportunidades "Negocio existente" con mismo periodo que el original
**Detectado en:** Lógica de negocio  
**Descripción:** Cuando un cliente renueva, se crea una nueva oportunidad "Negocio existente" con fechas similares o solapadas al contrato anterior.  
**Riesgo:** Si el contrato original y la renovación se solapan en fechas, el ARR de ese cliente se contará doble durante el solapamiento.  
**Recomendación app:** Lógica de deduplicación por `(account_id, product_type, mes)` para detectar posibles dobles conteos.

---

## EC-11: Oportunidades pre-2019 con datos muy incompletos
**Detectado en:** Análisis de primeras filas (datos desde 2019)  
**Descripción:** Las oportunidades más antiguas tienen campos de suscripción vacíos y se basan en assumptions.  
**Implicación:** El ARR histórico anterior a ~2020 puede tener poca fiabilidad.  
**Recomendación app:** Documentar el "vintage" de los datos y mostrar advertencia para datos anteriores a la fecha de adopción de campos de suscripción en SF.
