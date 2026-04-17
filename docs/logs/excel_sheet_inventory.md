# Excel Sheet Inventory
**Archivo analizado:** `data_samples/raw_excel/ARR Oportunidad.xlsx`
**Fecha de análisis:** 2026-04-17
**Analista:** Claude Code (Fase 1 - Análisis del Excel)

---

## Resumen de hojas

| Nº | Nombre | Filas | Cols | Rol | Criticidad |
|----|--------|-------|------|-----|------------|
| 1 | Opos con Productos | 14.096 | 39 | Base de datos principal | CRÍTICA |
| 2 | Resumen | 160 | 123 | Dashboard ARR compañía por mes | CRÍTICA |
| 3 | Resumen País Consultor | 490 | 122 | ARR por país+consultor por mes | ALTA |
| 4 | Consultor Activos + Línea | 1.719 | 122 | ARR por consultor activo + línea de negocio | ALTA |
| 5 | Consultores Todos + Línea | 3.309 | 122 | ARR por todos los consultores + línea | ALTA |
| 6 | Partner + Línea | 554 | 122 | ARR por partner + línea | MEDIA |
| 7 | FY26B - ARR por consultor | 88 | 10 | Budget FY26 vs ARR real por consultor | ALTA |
| 8 | Resumen Tipo de Opo | 296 | 122 | ARR por tipo de oportunidad (KAM/Inbound/Outbound/Partner) | MEDIA |
| 9 | BBDD--> | 38 | 6 | Notas, links a Salesforce y alertas manuales | ALTA (documentación) |
| 10 | País Consultor | 35 | 5 | Lookup: Consultor → País | MEDIA |
| 11 | Mtricas_de_suscripciones_mensua | 27 | 88 | MRR Stripe para isEazy Author Online | ALTA |
| 12 | Partners | 88 | 21 | Listado de partners | BAJA |
| 13 | Productos SF SAAS | 656 | 9 | Lookup: Producto SF → Clasificación/Tipo | CRÍTICA |
| 14 | Hoja3 | 14 | 1 | Auxiliar/scratch | BAJA |
| 15 | Hoja2 | 1.073 | 10 | Auxiliar/scratch | BAJA |
| 16 | Hoja1 | 271 | 2 | Auxiliar/scratch | BAJA |

---

## Descripción detallada de cada hoja

### 1. Opos con Productos (CRÍTICA)
- **Rol:** Tabla de datos base. Cada fila es una línea de producto de una oportunidad ganada en Salesforce.
- **Origen:** Exportación desde Salesforce + columnas calculadas añadidas manualmente en Excel.
- **Filas reales de datos:** ~14.095 (excluyendo cabecera).
- **Estructura:** 18 columnas de input (A–R) + 21 columnas calculadas (S–AM).
- **Columna clave para ARR:** AJ (`servicio anualizado`).
- **Filtro implícito:** Todas las filas tienen Etapa = "Ganada" (no hay otra etapa en este dataset).

### 2. Resumen (CRÍTICA)
- **Rol:** Dashboard principal. Muestra ARR por producto y por mes en una tabla cronológica.
- **Estructura temporal:** Columnas = meses (jan-2021 hasta presente). Filas = líneas de negocio SaaS.
- **Fórmula principal:** `SUMIFS` sobre la columna AJ de "Opos con Productos", filtrando por tipo de producto y rango de fechas mensual.
- **IMPORTANTE:** La fila 11 (isEazy Author Online) viene de la hoja `Mtricas_de_suscripciones_mensua`, NO de Salesforce.
- **Total ARR (fila 17):** `SUM(filas 8–16) - fila9 - fila14` para evitar doble conteo.

### 3–6. Hojas de resumen por dimensión
- Misma estructura temporal (meses en columnas).
- Usan exactamente la misma fórmula SUMIFS pero añaden criterios adicionales (propietario de oportunidad, tipo de oportunidad, partner).
- Las hojas "Activos" filtran solo consultores con cartera activa.

### 7. FY26B - ARR por consultor
- **Rol:** Comparativa budget vs actuals para FY26.
- **Estructura:** Consultor | Facturación FY25A | Objetivo FY26B | % cumplimiento | ARR diciembre | objetivo ARR | % ARR.
- **Dato importante:** Los valores de facturación y ARR objetivo están hardcodeados (no son fórmulas vivas sobre Salesforce).

### 9. BBDD--> (Notas críticas)
- **Rol:** Bitácora de excepciones y alertas de calidad de datos.
- **Contenido relevante detectado:**
  - Enlace al informe de Salesforce usado como fuente.
  - Enlace al dashboard de Stripe (fuente para Author Online).
  - Alerta manual: "guardar una copia antes de actualizar y poner tipo 12-25".
  - **Excepción Virto:** contrato por 5 años en SF con importes de 1 año y fechas de 5 → anualizacion incorrecta en Excel.
  - **Excepción 9-meses/12-meses:** oportunidad con nombre y fechas a 9 meses pero facturación a 12.
- **RIESGO:** Este conocimiento es completamente informal y no se aplica automáticamente al cálculo.

### 10. País Consultor
- **Rol:** Lookup table. Consultor → País (Spain, LatAm, etc.).
- **Uso:** Columna AG en "Opos con Productos" = `VLOOKUP(consultor, País_Consultor!$C:$D, 2, FALSE)`.

### 11. Mtricas_de_suscripciones_mensua (ALTA)
- **Rol:** Datos de Stripe (MRR mensual para isEazy Author Online / SaaS de pago recurrente por Stripe).
- **Estructura:** Filas = métricas (Beginning MRR, New MRR, Reactivated MRR, Expansion MRR, Contraction MRR, etc.) | Columnas = meses (2021-01 en adelante).
- **Uso en Resumen:** Fila 11 del Resumen (`isEazy Author Online`) = `Mtricas_de_suscripciones_mensua!C11 * 12` (MRR → ARR).
- **IMPORTANTE:** Este es el único componente del ARR total que NO viene de Salesforce.

### 13. Productos SF SAAS (CRÍTICA)
- **Rol:** Tabla maestra de clasificación de productos.
- **Columnas clave:**
  - B: Nombre del Producto (FK desde "Opos con Productos" col J)
  - E: Línea de Negocio2
  - F: Categoría (Software / Proyectos/Servicios / Servicios)
  - G: Subcategoría (SAAS / SAAS/Tarifas planas / Servicios/No recurrentes / Addons / Setup / etc.)
  - H: Producto real (SaaS LMS / SaaS Author / SaaS Skills / SaaS Engage / SaaS AIO / Catálogo de Servicios / Implantación / etc.) → **Esta es la clasificación que usa el ARR**
- **VLOOKUP:** `Tipo de Producto Correcto` (col U en Opos) = `VLOOKUP(Nombre_Producto, Productos_SF_SAAS!$B:$H, 7, FALSE)` → devuelve columna H.
- **1 fila con #N/A:** Un producto no se encuentra en la tabla.
