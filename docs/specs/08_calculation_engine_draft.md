# Motor de Cálculo ARR — Especificación Funcional
**Versión:** 0.1 (derivada del análisis del Excel)
**Fecha:** 2026-04-17
**Estado:** BORRADOR — pendiente de validación con el negocio

---

## Propósito

Este documento traduce la lógica del Excel a reglas de negocio independientes del Excel, expresadas como algoritmos reproducibles en cualquier lenguaje de programación.

---

## Entidades del dominio

### OpportunityLineItem (línea de producto de una oportunidad)
Campos de entrada (de Salesforce):
```
opportunity_id          : string
opportunity_owner       : string        # Consultor
account_name            : string
opportunity_name        : string
opportunity_type        : enum[nuevo_negocio, negocio_existente, saas_variable_invoicing]
channel_type            : enum[KAM, inbound, outbound, partner, unknown]
close_date              : date          # Fecha de cierre (close won)
product_name            : string        # Nombre del producto SF
unit_price              : decimal       # Precio de venta unitario
quantity                : decimal
subscription_start_date : date | null   # Puede ser null
subscription_end_date   : date | null   # Puede ser null
licence_period_months   : int | null
business_line           : string        # Línea de negocio SF
```

### ProductClassification (tabla maestra de productos)
```
product_name     : string  # FK → OpportunityLineItem.product_name
product_type     : enum    # SaaS LMS | SaaS Author | SaaS Skills | SaaS Engage | SaaS AIO |
                           # Catálogo de Servicios | Implantación | Diseño Instruccional |
                           # Videos | Cursos | Plantillas | TaaS | Servicio de Formación
category         : string  # Software | Proyectos/Servicios | Servicios
subcategory      : string  # SAAS | SAAS/Tarifas planas | Addons | Setup | Servicios/No recurrentes | ...
business_line    : string
```

### ARRLineItem (resultado calculado por cada OpportunityLineItem)
```
...todos los campos de OpportunityLineItem...
product_type            : string        # Lookup desde ProductClassification
effective_start_date    : date          # Con fallback aplicado
effective_end_date      : date          # Con fallback aplicado
real_price              : decimal       # quantity * unit_price
start_month             : date          # Primer día del mes de start
end_month_normalized    : date          # fin del periodo normalizado al mes
service_days            : int           # end_month_normalized - start_month
daily_price             : decimal       # real_price / service_days
annualized_value        : decimal       # daily_price * 365  ← ARR del line item
consultant_country      : string        # Lookup desde ConsultantCountry
is_saas                 : boolean       # product_type starts with "SaaS"
```

---

## Algoritmo de cálculo por línea de producto

```python
def calculate_arr_line_item(line_item, product_classifications, consultant_countries):
    
    # 1. Clasificar el producto
    product_type = product_classifications.get(line_item.product_name)
    if product_type is None:
        return ARRLineItem(error="PRODUCT_NOT_FOUND", ...)
    
    is_saas = product_type.startswith("SaaS")
    
    # 2. Resolver fechas efectivas
    # AS-01: Sin fecha inicio → usar fecha de cierre
    if line_item.subscription_start_date is None:
        effective_start = line_item.close_date
    else:
        effective_start = line_item.subscription_start_date
    
    # AS-02: Sin fecha fin → asumir 365 días desde inicio
    if line_item.subscription_end_date is None:
        effective_end = effective_start + timedelta(days=365)
    else:
        effective_end = line_item.subscription_end_date
    
    # 3. Calcular precio real
    real_price = line_item.quantity * line_item.unit_price
    
    # 4. Normalizar al mes
    start_month = effective_start.replace(day=1)
    raw_days = (effective_end - effective_start).days   # AB en Excel
    
    # EC-05: Si duración es 0, fallback a 30 días
    if raw_days <= 0:
        raw_days = 30
    
    # Fin del periodo normalizado (anclado desde start_month)
    end_month_normalized = start_month + timedelta(days=raw_days - 1)
    
    # 5. Calcular ARR del line item
    service_days = (end_month_normalized - start_month).days  # AH en Excel
    
    if service_days <= 0:
        service_days = 30  # fallback de seguridad
    
    daily_price = real_price / service_days
    annualized_value = daily_price * 365
    
    # 6. País del consultor
    country = consultant_countries.get(line_item.opportunity_owner, "Unknown")
    
    return ARRLineItem(
        ...line_item fields...,
        product_type=product_type,
        is_saas=is_saas,
        effective_start_date=effective_start,
        effective_end_date=effective_end,
        real_price=real_price,
        start_month=start_month,
        end_month_normalized=end_month_normalized,
        service_days=service_days,
        daily_price=daily_price,
        annualized_value=annualized_value,
        consultant_country=country
    )
```

---

## Algoritmo de ARR mensual (snapshot por mes)

### Modo A: ARR desde fecha de inicio de servicio (implementado actualmente en Excel)

```python
def get_arr_snapshot(
    arr_line_items: List[ARRLineItem],
    target_month_start: date,   # ej: 2024-01-01
    target_month_end: date,     # ej: 2024-01-31
    product_type_filter: str = None,   # None = todos los SaaS
    consultant_filter: str = None,
    channel_filter: str = None
) -> Decimal:
    """
    Para el mes objetivo, suma el annualized_value de todos los line items
    donde el servicio estaba activo durante ese mes.
    
    Un line item está activo en el mes si:
      start_month <= target_month_end  AND  end_month_normalized >= target_month_start
    """
    total = 0
    for item in arr_line_items:
        # Solo SaaS
        if not item.is_saas:
            continue
        
        # Filtros opcionales
        if product_type_filter and item.product_type != product_type_filter:
            continue
        if consultant_filter and item.opportunity_owner != consultant_filter:
            continue
        if channel_filter and item.channel_type != channel_filter:
            continue
        
        # Solapamiento con el mes objetivo
        if item.start_month <= target_month_end and item.end_month_normalized >= target_month_start:
            total += item.annualized_value
    
    return total
```

### Modo B: ARR desde fecha de close won (NO implementado en Excel, pero preparado)

```python
def get_arr_snapshot_close_won(
    arr_line_items: List[ARRLineItem],
    target_month_start: date,
    target_month_end: date,
    ...
) -> Decimal:
    """
    Variante que usa fecha de cierre (close_won_month) como inicio del periodo
    en lugar de start_month. Solo aplica a Nuevo Negocio.
    
    Para cada line item:
      - Si opportunity_type == "Nuevo Negocio":
          effective_start_for_arr = min(start_month, close_won_month)
      - Else:
          effective_start_for_arr = start_month
    
    El criterio de solapamiento se evalúa con effective_start_for_arr
    en lugar de start_month.
    
    NOTA: end_month_normalized se recalcularía desde el nuevo inicio.
    """
    # ... implementación pendiente de validación de negocio
```

---

## Definición de SaaS ARR total

```
ARR_total(mes) = 
  ARR_SaaS_LMS(mes)
  + ARR_SaaS_Author_Offline(mes)   # de Salesforce
  + ARR_SaaS_Author_Online(mes)    # de Stripe (MRR × 12)
  + ARR_SaaS_Skills(mes)
  + ARR_SaaS_Engage(mes)
  + ARR_SaaS_AIO(mes)
```

**ATENCIÓN:** isEazy Author Online requiere una fuente de datos adicional (Stripe). La app debe soportar dos fuentes de datos o aceptar input manual del MRR de Stripe.

---

## Dimensiones de análisis

El motor debe soportar filtrado y agrupación por:

| Dimensión | Fuente | Notas |
|-----------|--------|-------|
| Mes | Calculado | target_month_start/end |
| Tipo de producto | ProductClassification.product_type | Solo SaaS para ARR |
| Línea de negocio | ProductClassification.business_line | isEazy LMS, Author, etc. |
| Consultor | OpportunityLineItem.opportunity_owner | |
| País del consultor | ConsultantCountry lookup | Spain, LatAm, etc. |
| Tipo de oportunidad | OpportunityLineItem.opportunity_type | Nuevo negocio / Negocio existente |
| Canal | OpportunityLineItem.channel_type | KAM / Inbound / Outbound / Partner |
| Cliente | OpportunityLineItem.account_name | |

---

## Métricas derivadas del ARR

Además del ARR stock mensual, se deben calcular:

### MoM (Month-over-Month)
```
MoM_abs(mes) = ARR(mes) - ARR(mes-1)
MoM_pct(mes) = ARR(mes) / ARR(mes-1) - 1
```

### YoY (Year-over-Year)
```
YoY_abs(mes) = ARR(mes) - ARR(mismo_mes_año_anterior)
YoY_pct(mes) = ARR(mes) / ARR(mismo_mes_año_anterior) - 1
```

### Nuevos contratos incorporados (New ARR)
```
New_ARR(mes) = suma de annualized_value de line items cuyo start_month = target_month_start
```

### Contratos perdidos (Churned ARR)
```
Churned_ARR(mes) = suma de annualized_value de line items cuyo end_month_normalized = target_month_end - 1 día
```

### Net ARR Movement
```
Net_movement(mes) = New_ARR(mes) - Churned_ARR(mes) + Expansion_ARR(mes)
```

---

## Validaciones que debe implementar el motor

| Validación | Acción si falla |
|------------|-----------------|
| product_type desconocido | Marcar como UNCLASSIFIED, no incluir en ARR, alertar |
| service_days <= 0 | Usar fallback 30 días, registrar warning |
| annualized_value > 1.000.000 (por line item) | Flag para revisión manual |
| service_duration > 730 días (>2 años) | Flag para revisión manual |
| service_duration < 15 días | Flag para revisión manual |
| start_date > end_date | Marcar como error, excluir |
| real_price < 0 | Marcar como error, excluir |
| consultant sin país | País = "Unknown", alertar |

---

## Preguntas abiertas de negocio (que afectan al motor)

1. **"SAAS - Variable Invoicing":** ¿Debe anualizarse igual que contratos fijos? ¿O usar el importe real sin anualización?
2. **Doble conteo por renovaciones:** ¿Hay lógica para evitar que un contrato original y su renovación se cuenten simultáneamente?
3. **Stripe en la app:** ¿Se automatiza la ingesta de Stripe? ¿O se acepta como input manual?
4. **TaaS como SaaS:** ¿"TaaS" (Training as a Service) debería incluirse en el ARR SaaS?
5. **ARR desde close won:** ¿Cuándo se implementa? ¿Con qué definición exacta de "inicio" para cada tipo de oportunidad?
6. **Monedas:** ¿Hay contratos en monedas distintas al EUR? ¿Deben convertirse?
