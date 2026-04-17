# Modelo de Datos — Borrador
**Versión:** 1.0
**Fecha:** 2026-04-17
**Base de datos:** PostgreSQL

---

## Diagrama de entidades (simplificado)

```
product_classifications ──(lookup)── arr_line_items
consultant_countries    ──(lookup)── arr_line_items

snapshots ──(1:N)──> raw_opportunity_line_items
          ──(1:N)──> arr_line_items
          ──(1:N)──> arr_monthly_summary
          ──(1:N)──> snapshot_alerts
          ──(1:N)──> snapshot_stripe_mrr

arr_line_items ──(N:1)──> raw_opportunity_line_items
```

---

## Schema SQL completo

```sql
-- ================================================================
-- TABLAS MAESTRAS (independientes de sincronizaciones)
-- ================================================================

CREATE TABLE product_classifications (
    id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL UNIQUE,
    product_code TEXT,
    product_type VARCHAR(100) NOT NULL,
    -- SaaS LMS | SaaS Author | SaaS Skills | SaaS Engage | SaaS AIO |
    -- Catálogo de Servicios | Implantación | Diseño Instruccional |
    -- Videos | Cursos | Plantillas | TaaS | Servicio de Formación | UNCLASSIFIED
    is_saas BOOLEAN NOT NULL GENERATED ALWAYS AS (product_type LIKE 'SaaS%') STORED,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    business_line VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE consultant_countries (
    id SERIAL PRIMARY KEY,
    consultant_name TEXT NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    -- Spain | LatAm | etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- SNAPSHOTS
-- ================================================================

CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sync_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    -- manual | scheduled
    triggered_by VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending | running | success | failed | partial
    sf_records_fetched INT,
    sf_records_processed INT,
    unclassified_products_count INT DEFAULT 0,
    alerts_count INT DEFAULT 0,
    duration_seconds FLOAT,
    error_message TEXT,
    notes TEXT
);

-- ================================================================
-- DATOS RAW DE SALESFORCE (por snapshot)
-- ================================================================

CREATE TABLE raw_opportunity_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    
    -- Identificadores SF
    sf_opportunity_id VARCHAR(18) NOT NULL,
    sf_line_item_id VARCHAR(18) NOT NULL,
    
    -- Campos de la Opportunity
    opportunity_name TEXT,
    account_name TEXT,
    opportunity_owner TEXT,
    opportunity_type VARCHAR(100),
    -- nuevo_negocio | negocio_existente | saas_variable_invoicing
    channel_type VARCHAR(50),
    -- KAM | inbound | outbound | partner | unknown
    opportunity_amount DECIMAL(15,2),
    close_date DATE NOT NULL,
    created_date_sf TIMESTAMP,
    
    -- Campos del LineItem
    product_name TEXT NOT NULL,
    product_code TEXT,
    unit_price DECIMAL(15,2) NOT NULL,
    quantity DECIMAL(10,4) NOT NULL DEFAULT 1,
    subscription_start_date DATE,
    -- NULL si no está en SF
    subscription_end_date DATE,
    -- NULL si no está en SF
    licence_period_months INT,
    business_line TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_raw_oli_snapshot ON raw_opportunity_line_items(snapshot_id);
CREATE INDEX idx_raw_oli_sf_ids ON raw_opportunity_line_items(sf_opportunity_id, sf_line_item_id);

-- ================================================================
-- LÍNEAS ARR CALCULADAS (por snapshot)
-- ================================================================

CREATE TABLE arr_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    raw_line_item_id UUID NOT NULL REFERENCES raw_opportunity_line_items(id),
    
    -- Clasificación del producto
    product_type VARCHAR(100),
    is_saas BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Fechas efectivas (con fallbacks aplicados)
    effective_start_date DATE NOT NULL,
    effective_end_date DATE NOT NULL,
    used_start_fallback BOOLEAN DEFAULT FALSE,
    -- TRUE si se usó close_date como start
    used_end_fallback BOOLEAN DEFAULT FALSE,
    -- TRUE si se usó start+365 como end
    
    -- Normalización mensual
    start_month DATE NOT NULL,
    -- = DATE_TRUNC('month', effective_start_date)
    end_month_normalized DATE NOT NULL,
    -- = start_month + raw_days - 1
    service_days INT NOT NULL,
    -- = end_month_normalized - start_month
    
    -- Cálculo de precios
    real_price DECIMAL(15,2) NOT NULL,
    -- = quantity * unit_price
    daily_price DECIMAL(20,8) NOT NULL,
    -- = real_price / service_days
    annualized_value DECIMAL(15,4) NOT NULL,
    -- = daily_price * 365 ← EL ARR DEL LINE ITEM
    
    -- Contexto geográfico
    consultant_country VARCHAR(100),
    
    -- Flags de calidad de datos
    data_quality_flags JSONB DEFAULT '[]',
    -- ["DURATION_ANOMALY_HIGH", "NO_START_DATE", "UNCLASSIFIED_PRODUCT", ...]
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_arr_li_snapshot ON arr_line_items(snapshot_id);
CREATE INDEX idx_arr_li_month ON arr_line_items(start_month, end_month_normalized);
CREATE INDEX idx_arr_li_product_type ON arr_line_items(product_type, is_saas);
CREATE INDEX idx_arr_li_owner ON arr_line_items(snapshot_id, consultant_country);

-- ================================================================
-- RESUMEN ARR MENSUAL (precalculado, por snapshot)
-- ================================================================

CREATE TABLE arr_monthly_summary (
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    -- primer día del mes
    product_type VARCHAR(100) NOT NULL,
    arr_value DECIMAL(15,2) NOT NULL,
    line_items_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (snapshot_id, month, product_type)
);

-- Incluye también las filas de Stripe
-- product_type = 'SaaS Author Online' viene de snapshot_stripe_mrr

-- ================================================================
-- MRR DE STRIPE (input manual, por snapshot)
-- ================================================================

CREATE TABLE snapshot_stripe_mrr (
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    -- primer día del mes
    mrr DECIMAL(15,2) NOT NULL,
    -- MRR en EUR
    arr_equivalent DECIMAL(15,2) GENERATED ALWAYS AS (mrr * 12) STORED,
    entered_by TEXT,
    entered_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (snapshot_id, month)
);

-- ================================================================
-- ALERTAS DE CALIDAD DE DATOS (por snapshot)
-- ================================================================

CREATE TABLE snapshot_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    -- UNCLASSIFIED_PRODUCT | DURATION_HIGH | DURATION_LOW |
    -- MISSING_START_DATE | MISSING_END_DATE | INVALID_DATES |
    -- NEGATIVE_PRICE | MISSING_COUNTRY
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    -- info | warning | error
    sf_opportunity_id VARCHAR(18),
    opportunity_name TEXT,
    account_name TEXT,
    product_name TEXT,
    description TEXT NOT NULL,
    reviewed BOOLEAN DEFAULT FALSE,
    review_note TEXT,
    reviewed_at TIMESTAMP,
    reviewed_by TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_snapshot ON snapshot_alerts(snapshot_id, reviewed);

-- ================================================================
-- LOGS DE SINCRONIZACIÓN
-- ================================================================

CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    snapshot_id UUID REFERENCES snapshots(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    level VARCHAR(10),
    -- INFO | WARN | ERROR
    message TEXT,
    context JSONB
);
```

---

## Notas de diseño

1. **Inmutabilidad:** `raw_opportunity_line_items` y `arr_line_items` nunca se modifican una vez creadas. Si hay cambios en SF, se crea un nuevo snapshot.

2. **Snapshot como unidad de consistencia:** Todos los cálculos dentro de un snapshot son coherentes entre sí. El ARR de un snapshot siempre se puede recalcular a partir de sus raw_line_items.

3. **`arr_monthly_summary` es redundante pero crítica para rendimiento:** Permite que el dashboard cargue en milisegundos sin recalcular sobre miles de line items.

4. **Las tablas maestras son globales:** `product_classifications` y `consultant_countries` no están versionadas por snapshot. Si se modifican, afectan a los cálculos futuros pero no retroactivamente (las tablas de arr_line_items ya tienen los valores calculados).
