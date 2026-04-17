# Catálogo de Reglas de Negocio del Excel ARR
**Fecha de análisis:** 2026-04-17
**Estado:** Derivado del análisis del Excel. Pendiente de validación con el negocio.

Para cada regla se clasifica su tipo:
- **RN** = Regla de negocio real (intencional, debe replicarse)
- **WA** = Workaround histórico (solución técnica que compensa una limitación)
- **PM** = Parche manual (ajuste puntual, no automático)
- **DD** = Deuda funcional (lógica que debería revisarse)

---

## RN-01: Solo se incluyen oportunidades en etapa "Ganada"
**Tipo:** RN  
**Descripción:** El dataset de "Opos con Productos" solo contiene líneas donde `Etapa = Ganada`. Las oportunidades en otras etapas (pipeline, perdidas) están excluidas.  
**Implicación para la app:** El filtro de Salesforce debe incluir solo `StageName = 'Closed Won'`.

---

## RN-02: El ARR se calcula a nivel de línea de producto, no de oportunidad
**Tipo:** RN  
**Descripción:** Una oportunidad puede tener múltiples productos. Cada uno tiene su propio precio, fechas y clasificación. El ARR se calcula por cada line item por separado.  
**Implicación:** La unidad mínima de cálculo es `OpportunityLineItem` de Salesforce, no `Opportunity`.

---

## RN-03: Anualización del precio por días
**Tipo:** RN  
**Descripción:** El ARR se obtiene anualizando el precio diario del servicio:
```
ARR = (precio_real / días_periodo_normalizado) * 365
```
donde `precio_real = cantidad * precio_unitario` y `días_periodo_normalizado = fin_mes - inicio_mes`.  
**Implicación:** No se usa una división directa por meses (no se multiplica por 12). Se trabaja en días/365.

---

## RN-04: Normalización del periodo al primer día del mes
**Tipo:** RN  
**Descripción:** Las fechas de inicio y fin se normalizan al primer día del mes correspondiente. El fin del periodo se calcula como `inicio_mes + días_brutos - 1`.  
**Propósito:** Permitir que los SUMIFS por mes funcionen de forma consistente.  
**Implicación:** Un contrato de 12 meses exactos que empieza el 16 de mayo termina el 30 de abril del año siguiente (fin_mes = 1-may + 364 = 30-abr).

---

## RN-05: Clasificación de productos SaaS vs no SaaS
**Tipo:** RN  
**Descripción:** Los productos se clasifican en tipos mediante un VLOOKUP a la tabla `Productos SF SAAS`. Los tipos SaaS son:
- `SaaS LMS` (isEazy LMS)
- `SaaS Author` (isEazy Author Offline)
- `SaaS Skills` (isEazy Skills)
- `SaaS Engage` (isEazy Engage)
- `SaaS AIO` (All in One)

Los tipos no SaaS (excluidos del ARR): `Catálogo de Servicios`, `Implantación`, `Diseño Instruccional`, `Videos`, `Cursos`, `Plantillas`, `TaaS`, `Servicio de Formación`.

**Implicación:** Solo los line items con tipo SaaS contribuyen al ARR. Los demás se ignoran en los SUMIFS.

---

## RN-06: isEazy Author Online viene de Stripe, no de Salesforce
**Tipo:** RN  
**Descripción:** El ARR de "isEazy Author Online" (SaaS self-service) no viene de oportunidades de Salesforce sino de los datos de MRR de Stripe, importados manualmente en la hoja `Mtricas_de_suscripciones_mensua`.  
**Implicación:** La app necesita una segunda fuente de datos (Stripe API o exportación manual) para este componente del ARR.

---

## RN-07: ARR está basado en fecha de inicio de servicio
**Tipo:** RN  
**Descripción:** Los SUMIFS usan `inicio_mes` (Y) y `fin_mes` (Z) para determinar en qué meses está activo un contrato. Esto significa que el ARR se reconoce desde que empieza el servicio.  
**Alternativa no implementada:** Existe infraestructura para "ARR desde close won" (columnas AC–AF) pero ninguna hoja de resumen la utiliza actualmente.

---

## RN-08: El ARR se reporta como un stock mensual, no como un flujo
**Tipo:** RN  
**Descripción:** Para cada mes M, el ARR = suma del `servicio_anualizado` de todos los contratos activos durante ese mes. Es un valor puntual (snapshot), no una acumulación.

---

## WA-01: Fechas de Salesforce se almacenan como texto
**Tipo:** WA  
**Descripción:** Los campos `Subscription Start Date` y `Subscription End Date` y `Fecha de cierre` provienen de Salesforce como texto (formato "dd/mm/yyyy"). Se necesitan columnas S y T para convertirlos a fecha con `DATEVALUE()`.  
**Causa probable:** La exportación SF a Excel no formatea las fechas como fechas Excel nativas.  
**Recomendación para la app:** Usar la API de Salesforce que devuelve fechas en ISO 8601 (yyyy-mm-dd), eliminando este problema.

---

## WA-02: Fallback cuando no hay fecha de inicio
**Tipo:** WA  
**Descripción:** Si `Subscription Start Date` está vacío en SF, se usa la `Fecha de cierre` como fecha de inicio del servicio.  
**Fórmula:** `fecha_inicio = IF(S="", EDATE(G, 0), S)`  
**Implicación:** Oportunidades sin fechas de suscripción se tratan como si el servicio empezara en la fecha de cierre. Esto puede ser incorrecto para contratos retroactivos.

---

## WA-03: Fallback cuando no hay fecha de fin
**Tipo:** WA  
**Descripción:** Si `Subscription End Date` está vacío en SF, se asume una duración de 365 días desde la fecha de inicio.  
**Fórmula:** `fecha_fin = IF(T="", fecha_inicio + 365, T)`  
**Implicación:** Contratos sin fecha de fin se tratan como anuales. No distingue entre contratos mensuales, multianuales, etc.

---

## WA-04: fin_mes anclado a inicio_mes, no a fecha_fin real
**Tipo:** WA  
**Descripción:** El `fin_mes` no es el primer día del mes de la fecha de fin real, sino `inicio_mes + días_brutos - 1`. Esto provoca que el periodo se calcule siempre desde el mismo día del mes de inicio.  
**Ejemplo:** Contrato 16-may → 15-may siguiente (364 días). inicio_mes = 1-may, fin_mes = 1-may + 363 = 29-abr.  
**Implicación:** El periodo normalizado puede diferir ligeramente del periodo real en días según cómo caen los meses.

---

## WA-05: Columna "AM - Prueba" como diagnóstico de fecha
**Tipo:** WA  
**Descripción:** La columna AM = `Fecha_de_cierre / 1` existe solo para verificar que la fecha de cierre (texto) se interprete como número. Es una columna diagnóstica sin uso en cálculos.  
**Recomendación:** Eliminar de la app, no tiene valor funcional.

---

## PM-01: Excepción Virto (5 años con importes de 1 año)
**Tipo:** PM  
**Descripción:** Documentado en BBDD-->: "Virto se firmó el contrato por 5 años y al segundo el cliente pidió baja, en salesforce se pusieron los importes de un año y las fechas por 5 años."  
**Impacto:** La anualización del Excel calcula precio_diario sobre 5 años → ARR muy bajo. Corrección manual necesaria.  
**Estado:** No está automatizado. Se maneja como excepción conocida.  
**Recomendación para la app:** Flag de oportunidades con duración anómala (>2 años o <1 mes) para revisión manual.

---

## PM-02: Excepción 9 meses / 12 meses de facturación
**Tipo:** PM  
**Descripción:** Documentado en BBDD-->: "esta oportunidad tiene el nombre y todo por 9 meses, pero se facturaron 12 meses."  
**Impacto:** Las fechas en SF no reflejan la realidad de facturación. El ARR calculado puede estar subestimado o sobreestimado.  
**Estado:** No está automatizado. Conocimiento informal.

---

## DD-01: "ARR desde close won" no implementado en resúmenes
**Tipo:** DD  
**Descripción:** Existen columnas preparadas para calcular el ARR desde la fecha de cierre (AC, AD, AE, AF) pero ninguna hoja de resumen las usa. El código Excel sugiere que hubo intención de implementarlo.  
**Recomendación:** La app debería implementar ambas vistas (service start y close won) como parámetro conmutable.

---

## DD-02: Columnas con nombres genéricos (Columna2, Columna3, Columna4, Columna5)
**Tipo:** DD  
**Descripción:** Columnas AA, AB, AD, AF tienen nombres de columna genéricos ("Columna2", "Columna3"...) en lugar de nombres descriptivos.  
**Implicación:** Dificulta la legibilidad y el mantenimiento del Excel.

---

## DD-03: Duplicación de lógica entre AA y AH
**Tipo:** DD  
**Descripción:** `Columna2` (AA) y `Duración de servicio` (AH) tienen exactamente la misma fórmula (`fin_mes - inicio_mes`). Redundancia sin propósito claro.

---

## DD-04: La tabla `Productos SF SAAS` se mantiene manualmente
**Tipo:** DD  
**Descripción:** La clasificación de productos (SaaS vs no SaaS) depende de una tabla en Excel que debe actualizarse manualmente cuando Salesforce añade nuevos productos.  
**Riesgo:** Si un nuevo producto de SF no está en la tabla → `#N/A` en `Tipo de Producto Correcto` → ese ARR no se contabiliza.  
**Recomendación:** La app debe tener un módulo de mantenimiento de la tabla de clasificación de productos.

---

## DD-05: Tipo "SAAS - Variable Invoicing" sin lógica diferenciada
**Tipo:** DD  
**Descripción:** Existe un tipo de oportunidad "SAAS - Variable Invoicing" (1.103 line items). No hay lógica diferenciada en las fórmulas del Excel para este tipo; se trata igual que el resto.  
**Riesgo:** Puede que estos contratos deberían tener una lógica de anualización diferente (si la facturación es variable no tiene sentido anualizarla igual).  
**Estado:** Pendiente de aclaración con negocio.
