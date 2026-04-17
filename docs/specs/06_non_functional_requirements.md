# Requisitos No Funcionales
**Versión:** 1.0
**Fecha:** 2026-04-17

---

## NF-01 Reproducibilidad del cálculo

El ARR calculado por la app debe producir resultados idénticos al Excel para el mismo dataset de entrada. Se verificará con un test de validación cruzada antes de dar el MVP por válido.

**Criterio de aceptación:** Diferencia máxima permitida: ±0.01€ por línea (solo por redondeo de coma flotante).

---

## NF-02 Rendimiento

Con el volumen actual (~14.000 line items), las operaciones deben completarse en:
- Cálculo ARR completo: < 5 segundos.
- Carga del dashboard: < 2 segundos.
- Sincronización con Salesforce: < 5 minutos.

El sistema debe mantener el rendimiento con hasta 50.000 line items (proyección 5 años).

---

## NF-03 Trazabilidad y auditoría

Cada cifra del ARR debe ser trazable hasta su origen:
- Qué oportunidad la generó.
- Qué regla de cálculo se aplicó.
- Qué snapshot se usó.
- Qué versión de las tablas maestras estaba activa.

---

## NF-04 Inmutabilidad de snapshots

Los snapshots históricos son de solo lectura. Una vez creados, no se pueden modificar. Solo se pueden añadir nuevos snapshots.

---

## NF-05 Recuperabilidad

Si la sincronización con Salesforce falla a mitad, los datos anteriores deben mantenerse intactos. No debe haber estados parciales.

---

## NF-06 Operabilidad local

El MVP debe poder ejecutarse localmente en el ordenador del CFO sin necesidad de despliegue en servidor. Esto es compatible con el objetivo de construcción asistida por IA paso a paso.

---

## NF-07 Despliegue simple

El despliegue en producción (si llega a necesitarse) debe ser posible con comandos simples documentados, sin conocimientos de DevOps avanzados.

---

## NF-08 Mantenibilidad

El código debe estar organizado de forma que cualquier desarrollador (humano o IA) pueda:
- Entender la estructura en menos de 30 minutos leyendo el repo.
- Añadir una nueva regla de cálculo sin tocar más de 2 ficheros.
- Añadir un nuevo filtro sin tocar la lógica de cálculo.

---

## NF-09 Seguridad básica

- Las credenciales de Salesforce (client_id, client_secret, token) nunca se almacenan en el código fuente ni en el repo.
- Se usan variables de entorno o fichero `.env` (en .gitignore).
- En V2: autenticación de usuarios para acceder a la app.

---

## NF-10 Moneda única

Todo el sistema opera en EUR. No hay lógica de conversión de moneda en el MVP.

---

## NF-11 Timezone

Todas las fechas se tratan como fechas sin hora (solo year-month-day). No hay lógica de timezone en el MVP.

---

## NF-12 Continuidad entre agentes IA

El código y la documentación deben estar escritos de forma que Claude Code y Codex puedan continuar el trabajo sin contexto de conversación previo. Solo leyendo el repo.

Esto implica:
- CURRENT_STATE.md siempre actualizado.
- Cada módulo tiene un comentario de propósito claro.
- Las decisiones de diseño tienen ADRs correspondientes.
