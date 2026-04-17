# Versionado y Snapshots
**Versión:** 1.0
**Fecha:** 2026-04-17

---

## Concepto

Cada vez que se ejecuta una sincronización con Salesforce, la app crea un **snapshot**: una fotografía inmutable del estado del ARR en ese momento.

Los snapshots permiten:
- **Auditoría:** saber exactamente qué datos se usaron para calcular el ARR en una fecha concreta.
- **Comparativa:** ver qué cambió entre dos sincronizaciones.
- **Reproducibilidad:** recalcular el ARR de cualquier momento pasado.
- **Control de calidad:** detectar si una sincronización introdujo datos erróneos.

---

## Estructura de un snapshot

```
Snapshot
  id: UUID
  created_at: timestamp
  sync_type: "manual" | "scheduled"
  triggered_by: "button" | "scheduler" | "api"
  status: "success" | "failed" | "partial"
  
  # Metadatos de la sincronización
  sf_records_fetched: int
  sf_records_processed: int
  unclassified_products: int
  alerts_count: int
  duration_seconds: float
  
  # Datos de Stripe usados (input manual)
  stripe_mrr_data: {
    "2026-01": 12500.00,
    "2026-02": 12800.00,
    ...
  }
  
  # Raw data (de Salesforce)
  raw_line_items: [OpportunityLineItem, ...]  # dataset completo
  
  # Calculated data
  arr_line_items: [ARRLineItem, ...]  # con todos los campos calculados
  
  # Resumen ARR por mes y tipo de producto
  arr_summary: {
    "2026-01": {
      "SaaS LMS": 1234567.89,
      "SaaS Author Offline": 456789.01,
      "SaaS Author Online": 98765.43,  # de Stripe
      "SaaS Skills": 789012.34,
      "SaaS Engage": 345678.90,
      "SaaS AIO": 0.00,
      "total": 2924813.57
    },
    ...
  }
  
  # Alertas generadas
  alerts: [Alert, ...]
```

---

## Modelo de datos en base de datos

```sql
-- Tabla principal de snapshots
CREATE TABLE snapshots (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    sync_type VARCHAR(20),
    status VARCHAR(20),
    sf_records_fetched INT,
    sf_records_processed INT,
    unclassified_count INT,
    alerts_count INT,
    duration_seconds FLOAT,
    notes TEXT
);

-- Datos de Stripe por snapshot
CREATE TABLE snapshot_stripe_mrr (
    snapshot_id UUID REFERENCES snapshots(id),
    month DATE,  -- primer día del mes
    mrr DECIMAL(15,2),
    PRIMARY KEY (snapshot_id, month)
);

-- Raw line items de SF (por snapshot)
CREATE TABLE raw_opportunity_line_items (
    id UUID PRIMARY KEY,
    snapshot_id UUID REFERENCES snapshots(id),
    sf_opportunity_id VARCHAR(18),
    sf_line_item_id VARCHAR(18),
    opportunity_name TEXT,
    account_name TEXT,
    opportunity_owner TEXT,
    opportunity_type VARCHAR(100),
    channel_type VARCHAR(50),
    close_date DATE,
    product_name TEXT,
    unit_price DECIMAL(15,2),
    quantity DECIMAL(10,2),
    subscription_start_raw DATE,
    subscription_end_raw DATE,
    business_line TEXT,
    created_at_sf TIMESTAMP
);

-- Líneas calculadas de ARR (por snapshot)
CREATE TABLE arr_line_items (
    id UUID PRIMARY KEY,
    snapshot_id UUID REFERENCES snapshots(id),
    raw_line_item_id UUID REFERENCES raw_opportunity_line_items(id),
    product_type VARCHAR(100),
    is_saas BOOLEAN,
    effective_start_date DATE,
    effective_end_date DATE,
    real_price DECIMAL(15,2),
    start_month DATE,
    end_month_normalized DATE,
    service_days INT,
    daily_price DECIMAL(20,8),
    annualized_value DECIMAL(15,2),
    consultant_country VARCHAR(50),
    data_quality_flags JSONB  -- flags de alertas aplicadas
);

-- Resumen ARR mensual (por snapshot, precalculado para el dashboard)
CREATE TABLE arr_monthly_summary (
    snapshot_id UUID REFERENCES snapshots(id),
    month DATE,
    product_type VARCHAR(100),
    arr_value DECIMAL(15,2),
    PRIMARY KEY (snapshot_id, month, product_type)
);

-- Alertas generadas por snapshot
CREATE TABLE snapshot_alerts (
    id UUID PRIMARY KEY,
    snapshot_id UUID REFERENCES snapshots(id),
    alert_type VARCHAR(50),
    severity VARCHAR(20),
    opportunity_name TEXT,
    account_name TEXT,
    product_name TEXT,
    description TEXT,
    reviewed BOOLEAN DEFAULT FALSE,
    review_note TEXT,
    reviewed_at TIMESTAMP,
    reviewed_by TEXT
);
```

---

## Política de retención

- **MVP:** Mantener todos los snapshots indefinidamente.
- **V2:** Configurar política de retención (ej: máximo 365 snapshots, o purgar los anteriores a 3 años).
- Los snapshots nunca se modifican. Solo se crean o (en el futuro) se purgan.

---

## Flujo de comparativa entre snapshots

```
snapshot_A (ej: 2026-03-01)
snapshot_B (ej: 2026-04-01)

diff = {
  "total_arr_change": B.total_arr - A.total_arr,
  "new_line_items": [items en B que no están en A por sf_line_item_id],
  "removed_line_items": [items en A que no están en B],
  "modified_line_items": [items donde mismo sf_line_item_id tiene valor diferente],
  "arr_by_product_type": {
    "SaaS LMS": {"A": x, "B": y, "diff": y-x, "diff_pct": (y-x)/x}
    ...
  }
}
```
