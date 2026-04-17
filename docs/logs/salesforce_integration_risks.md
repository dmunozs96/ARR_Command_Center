# Riesgos de la Integración con Salesforce
**Fecha:** 2026-04-17

---

## R-SF-01 [ALTA] Campos personalizados desconocidos
**Descripción:** Los campos de Salesforce usados en el Excel (especialmente EndDate de line items, Licence Period) pueden ser campos personalizados creados por el admin de isEazy, con nombres de API distintos a los estándar.
**Impacto:** Si no se mapean correctamente, los datos de suscripción llegan vacíos y se aplican todos los fallbacks.
**Mitigación:** Sesión de verificación con el admin de SF antes de implementar. Ver `docs/logs/salesforce_field_mapping.md`.

## R-SF-02 [ALTA] Límites de API de Salesforce
**Descripción:** Salesforce limita el número de llamadas API diarias. La versión gratuita/estándar permite 15.000/día; la versión Enterprise/Unlimited más.
**Impacto:** Si se hacen demasiadas sincronizaciones diarias, se puede alcanzar el límite.
**Mitigación:** Para el MVP, usar sincronización manual (un botón). Una full sync son ~10-20 llamadas SOQL paginadas, muy por debajo del límite.

## R-SF-03 [ALTA] Calidad de los datos históricos
**Descripción:** Los datos anteriores a ~2020 pueden tener campos de suscripción vacíos o mal rellenados.
**Impacto:** El ARR histórico dependerá de fallbacks (close_date como inicio, +365 como fin).
**Mitigación:** Documentar y comunicar la "fecha de confianza" de los datos.

## R-SF-04 [MEDIA] Cambios en la estructura de SF
**Descripción:** Si el admin de SF renombra un campo o cambia una picklist, la integración puede romperse silenciosamente.
**Mitigación:** Tests de validación post-sync que verifican que los campos clave no están vacíos de forma masiva.

## R-SF-05 [MEDIA] Necesidad de admin de SF para configurar Connected App
**Descripción:** Crear una Connected App requiere acceso de administrador a Salesforce.
**Impacto:** Si no hay admin disponible o hay restricciones corporativas, puede retrasarse la integración.
**Mitigación:** Tener listo el proceso de exportación CSV como alternativa temporal.

## R-SF-06 [BAJA] Oportunidades modificadas retroactivamente
**Descripción:** Si alguien modifica en SF una oportunidad antigua (cambio de fechas, precio, etc.), la re-sincronización mostrará diferencias con snapshots anteriores.
**Impacto:** Los snapshots históricos preservarán el estado anterior; el nuevo snapshot reflejará el cambio.
**Mitigación:** El sistema de snapshots maneja esto por diseño (cada sync es un snapshot nuevo).
