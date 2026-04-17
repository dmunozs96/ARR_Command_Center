# Excel Formula Logic
**Hoja analizada:** `Opos con Productos` (hoja principal de cálculo)
**Fecha de análisis:** 2026-04-17

---

## Estructura de columnas

### BLOQUE A: Input de Salesforce (columnas A–R)

| Col | Nombre | Tipo | Descripción |
|-----|--------|------|-------------|
| A | Propietario de oportunidad | Texto | Nombre del consultor owner de la oportunidad |
| B | Nombre de la cuenta | Texto | Nombre del cliente |
| C | Nombre de la oportunidad | Texto | Nombre de la oportunidad en SF |
| D | Tipo | Texto | Tipo de negocio: `Nuevo negocio` / `Negocio existente` / `SAAS - Variable Invoicing` |
| E | Tipo de oportunidad | Texto | Canal: `KAM` / `Inbound` / `Outbound` / `Partner` / vacío |
| F | Importe | Numérico | Importe total de la oportunidad (no del line item) |
| G | Fecha de cierre | Texto | Fecha close won en formato "dd/mm/yyyy" (texto, no fecha) |
| H | Fecha de creación | Texto | Fecha de creación de la oportunidad |
| I | Etapa | Texto | Siempre "Ganada" en este dataset |
| J | Nombre del producto | Texto | Nombre del product line item en SF |
| K | Precio de venta | Numérico | Precio unitario del product line item |
| L | Subscription Start Date | Texto | Fecha inicio suscripción del line item (texto, puede ser vacío) |
| M | Subscription End Date | Texto | Fecha fin suscripción del line item (texto, puede ser vacío) |
| N | Licence period (months) | Numérico | Duración en meses (campo de SF, no siempre presente) |
| O | Línea de negocio | Texto | Línea de negocio del producto (de SF) |
| P | Cantidad | Numérico | Cantidad de unidades del line item |
| Q | Product | Texto | Código de producto SF (mayormente vacío en datos históricos) |
| R | Creado por | Texto | Usuario que creó la oportunidad |

---

### BLOQUE B: Columnas calculadas (columnas S–AM)

#### S — f.inicio convertida a fecha
```excel
=IFERROR(DATEVALUE(L), "")
```
- Convierte el campo `Subscription Start Date` (texto) a fecha Excel.
- Si la conversión falla (campo vacío o formato incorrecto) → devuelve "".
- **Implicación:** La entrada de SF es texto; hay que convertir.

#### T — f.fin convertida a fecha
```excel
=IFERROR(DATEVALUE(M), "")
```
- Mismo patrón para `Subscription End Date`.

#### U — Tipo de Producto Correcto
```excel
=VLOOKUP(J, 'Productos SF SAAS'!$B:$H, 7, FALSE)
```
- Busca el nombre del producto (col J) en la tabla maestra `Productos SF SAAS`.
- Devuelve la col H = "Producto real" (clasificación para ARR).
- Valores posibles: `SaaS LMS`, `SaaS Author`, `SaaS Skills`, `SaaS Engage`, `SaaS AIO`, `Catálogo de Servicios`, `Implantación`, `Diseño Instruccional`, `Videos`, `Cursos`, `Plantillas`, `TaaS`, `Servicio de Formación`, y tipos IA nuevos.
- **Si el producto no existe en la tabla → devuelve #N/A** (detectado 1 caso).

#### V — fecha inicio
```excel
=IF(S="", EDATE(G, 0), S)
```
- Si no hay fecha de inicio en SF → usa la fecha de cierre (`G`) como sustituto.
- Si hay fecha de inicio convertida → la usa directamente.
- `EDATE(G, 0)` añade 0 meses a la fecha de cierre (conversión de texto a fecha).
- **Regla de negocio:** cuando no hay fecha de inicio, se asume que el servicio empieza en la fecha de cierre.

#### W — fecha fin
```excel
=IF(T="", V+365, T)
```
- Si no hay fecha de fin → fecha_inicio + 365 días.
- Si hay fecha de fin → la usa directamente.
- **Regla de negocio:** cuando no hay fecha de fin, se asume renovación anual de 365 días.

#### X — precio real
```excel
=P * K
```
- Precio del line item = Cantidad × Precio de venta unitario.

#### Y — inicio mes
```excel
=DATE(YEAR(V), MONTH(V), 1)
```
- Normaliza la fecha de inicio al primer día del mes.
- **Propósito:** permite hacer SUMIFS por mes completo sin problemas de días específicos.

#### Z — fin mes
```excel
=IF(AB=0, inicio_mes+30, inicio_mes+AB-1)
```
donde `AB = fecha_fin - fecha_inicio` (días brutos)
- Si el periodo bruto es 0 días → fin_mes = inicio_mes + 30 (fallback).
- Si hay periodo → fin_mes = inicio_mes + días_brutos - 1.
- **Importante:** fin_mes está anclado desde inicio_mes, no desde la fecha fin real. Esto normaliza al primer día del mes de inicio.

#### AA — Columna2
```excel
=fin_mes - inicio_mes
```
- Días del periodo normalizado (fin_mes anclado - inicio_mes).

#### AB — Columna3
```excel
=fecha_fin - fecha_inicio
```
- Días brutos del servicio (sin normalización de mes).

#### AC — fecha de cierre inicial
```excel
=DATE(YEAR(G), MONTH(G), 1)
```
- Primer día del mes de cierre de la oportunidad.
- **Uso potencial:** base para el cálculo de "ARR desde close won" (NO implementado en los resúmenes actuales).

#### AD — Columna4
```excel
=fin_mes - fecha_cierre_inicial
```
- Diferencia en días entre el fin del servicio normalizado y el inicio del mes de cierre.

#### AE — f.inicial si es NN
```excel
=IF(D="Nuevo Negocio",
    IF(inicio_mes < fecha_cierre_inicial, inicio_mes, fecha_cierre_inicial),
    inicio_mes)
```
- Para "Nuevo Negocio": toma el más temprano entre inicio_mes y fecha_cierre_inicial.
- Para otros tipos: usa inicio_mes directamente.
- **Propósito:** En oportunidades de Nuevo Negocio, el ARR empezaría a contar desde el cierre si el servicio aún no ha comenzado, o desde el inicio real del servicio si ya había empezado.
- **NOTA:** Esta columna existe pero NO se usa en ningún SUMIFS de los resúmenes actuales.

#### AF — Columna5
```excel
=inicio_mes - f.inicial_si_es_NN
```
- Diferencia entre inicio de servicio y inicio efectivo (close won).
- Si son iguales → 0 (la mayoría de los casos).

#### AG — país del consultor
```excel
=VLOOKUP(A, 'País Consultor'!$C:$D, 2, FALSE)
```
- Busca el consultor y devuelve su país.

#### AH — Duración de servicio
```excel
=fin_mes - inicio_mes
```
- **Igual que AA (Columna2).** Parece ser una duplicación para legibilidad.

#### AI — precio diario de servicio
```excel
=precio_real / Duración_de_servicio
```
- Precio diario = precio_real / días del periodo normalizado.
- **RIESGO:** Si Duración_de_servicio = 0 → división por cero (el fallback de Z=inicio_mes+30 lo previene).

#### AJ — servicio anualizado ⭐ COLUMNA CLAVE PARA ARR
```excel
=precio_diario_de_servicio * 365
```
- Anualiza el precio diario multiplicando por 365.
- **Esta es la columna que suman todos los SUMIFS de ARR en las hojas de resumen.**
- Fórmula completa expandida:
  ```
  servicio_anualizado = (precio_real / (fin_mes - inicio_mes)) * 365
                      = (Cantidad * Precio_de_venta / días_periodo_normalizado) * 365
  ```

#### AK — Diferencia
```excel
=servicio_anualizado - precio_real
```
- Diferencia entre el valor anualizado y el precio real del contrato.
- Diagnóstico: contratos exactamente anuales tendrán diferencia ≈ 0; contratos más cortos o más largos tendrán diferencia positiva o negativa.

#### AL — Línea de Negocio 2.0
- Array formula (no se pudo leer completamente con openpyxl).
- **Hipótesis:** recalcula o normaliza la línea de negocio con lógica más actualizada que la columna O.
- Valores observados: isEazy Factory, isEazy Author, isEazy LMS, isEazy Skills, isEazy Engage, All In One, #N/A.

#### AM — Prueba
```excel
=fecha_cierre / 1
```
- Columna de diagnóstico. Divide la fecha de cierre por 1 para forzar conversión a número de serie Excel.
- **Workaround histórico** para verificar que el campo Fecha de cierre (col G, texto) sea reconocido correctamente.

---

## Fórmula ARR en hojas de resumen

```excel
=SUMIFS(
  'Opos con Productos'!$AJ:$AJ,          ← suma: servicio anualizado
  'Opos con Productos'!$Y:$Y, "<=" & fin_mes,    ← donde inicio_mes <= fin del mes objetivo
  'Opos con Productos'!$Z:$Z, ">=" & inicio_mes, ← Y fin_mes >= inicio del mes objetivo
  'Opos con Productos'!$U:$U, tipo_producto       ← Y tipo de producto = categoría SaaS
)
```

**Interpretación:**  
Para cada mes M, el ARR de un tipo de producto T = suma del `servicio_anualizado` de todos los line items donde:
1. El servicio estaba activo durante el mes M (periodo solapado).
2. El tipo de producto coincide con T.

En las hojas de consultor se añade un criterio adicional:
```excel
'Opos con Productos'!$A:$A, nombre_consultor
```

---

## Cálculo del Total ARR (Resumen, fila 17)

```excel
=SUM(filas_8_a_16) - fila9 - fila14
```

Donde:
- Fila 8: SaaS AIO (= 0 en los meses analizados)
- Fila 9: isEazy Author On & Off = fila10 + fila11 (suma de autor offline + autor online)
- Fila 10: isEazy Author Offline (de Salesforce)
- Fila 11: isEazy Author Online (de Stripe → `Mtricas_de_suscripciones_mensua`)
- Fila 12: isEazy Engage (de Salesforce)
- Fila 13: isEazy LMS (de Salesforce)
- Fila 14: isEazy LMS con AIO (= mismos valores que fila 13, duplicado funcional)
- Fila 15: isEazy Skills (de Salesforce)

Total = AIO + Author_Offline + Author_Online + Engage + LMS + Skills

**Se restan fila9 y fila14 para evitar doble conteo.**

---

## Fuentes de datos

| Fuente | Datos | Notas |
|--------|-------|-------|
| Salesforce | Oportunidades + line items + fechas + productos | Exportación manual/periódica |
| Stripe | MRR de isEazy Author Online | Importado en `Mtricas_de_suscripciones_mensua` |
| Manual (Excel) | Tabla `Productos SF SAAS` | Clasificación de productos mantenida manualmente |
| Manual (Excel) | Tabla `País Consultor` | Lookup consultor→país mantenido manualmente |
