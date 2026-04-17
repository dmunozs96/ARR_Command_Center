# ARR Command Center — Visión General del Proyecto
**Versión:** 1.0
**Fecha:** 2026-04-17

---

## Qué es este proyecto

El **ARR Command Center** es una aplicación web para calcular, visualizar y gestionar el ARR (Annual Recurring Revenue) de isEazy.

Actualmente, el ARR se calcula manualmente en un Excel complejo que se alimenta de exportaciones de Salesforce. Este proyecto construye una aplicación que:
1. Se conecta directamente a Salesforce para extraer datos de oportunidades.
2. Replica la lógica de cálculo del Excel de forma reproducible y auditable.
3. Muestra dashboards con el ARR por línea de negocio, consultor, canal y otros ejes.
4. Guarda historial de versiones para auditoría y comparativa.

---

## Arquitectura recomendada

### Stack tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Backend / API | Python + FastAPI | Python tiene excelente soporte para cálculos numéricos; FastAPI es moderno, rápido de desarrollar y muy bien documentado |
| Motor de cálculo | Python puro | La lógica de ARR es cálculo sobre datos, sin dependencias especiales |
| Base de datos | PostgreSQL | Relacional (los datos son relacionales), JSONB para datos flexibles, gratis y ampliamente soportado |
| ORM | SQLAlchemy | Estándar de facto en Python |
| Migrations BD | Alembic | Herramienta estándar para gestionar versiones del schema |
| Frontend | React + Next.js | Moderno, gran ecosistema, buen soporte para dashboards |
| Gráficos | Recharts (o Chart.js) | Ligero, React-native, fácil de usar |
| Conexión SF | simple-salesforce (Python) | Librería madura para SF API |
| Autenticación (V2) | NextAuth.js | Simple de integrar con Next.js |
| Despliegue local | Docker Compose | Levanta backend + BD + frontend con un comando |

### Alternativas descartadas
- **Django:** Más pesado que FastAPI para una API, curva de aprendizaje mayor.
- **Node.js/Express:** Python tiene mejor ecosistema para cálculos numéricos/pandas.
- **SQLite:** No apto para producción; PostgreSQL es más robusto.
- **Vue/Angular:** React tiene mayor comunidad y más soporte en herramientas IA.
- **Streamlit:** Rápido de hacer pero limitado para dashboards productivos complejos.

---

## Estructura de carpetas del proyecto

```
ARR_Command_Center/
├── app/
│   ├── backend/
│   │   ├── api/              # Endpoints FastAPI
│   │   │   ├── routes/
│   │   │   │   ├── sync.py       # /api/sync (trigger sync)
│   │   │   │   ├── arr.py        # /api/arr (queries ARR)
│   │   │   │   ├── snapshots.py  # /api/snapshots
│   │   │   │   └── config.py     # /api/config (tablas maestras)
│   │   ├── core/             # Lógica de negocio
│   │   │   ├── arr_calculator.py    # Motor de cálculo ARR
│   │   │   ├── sf_extractor.py      # Extracción desde Salesforce
│   │   │   ├── snapshot_manager.py  # Gestión de snapshots
│   │   │   └── alert_checker.py     # Validaciones y alertas
│   │   ├── db/               # Base de datos
│   │   │   ├── models.py        # Modelos SQLAlchemy
│   │   │   ├── migrations/      # Alembic migrations
│   │   │   └── connection.py    # Conexión a PostgreSQL
│   │   ├── config/           # Configuración
│   │   │   ├── settings.py      # Variables de entorno
│   │   │   └── product_types.py # Tipos de producto SaaS
│   │   ├── main.py           # Entry point FastAPI
│   │   └── requirements.txt
│   │
│   └── frontend/
│       ├── pages/            # Next.js pages
│       │   ├── index.tsx        # Dashboard principal
│       │   ├── consultants.tsx  # Vista por consultor
│       │   ├── config.tsx       # Configuración (tablas maestras)
│       │   └── snapshots.tsx    # Historial de snapshots
│       ├── components/       # Componentes reutilizables
│       │   ├── ARRChart.tsx     # Gráfico de línea ARR
│       │   ├── ARRTable.tsx     # Tabla de ARR por dimensión
│       │   ├── AlertsPanel.tsx  # Panel de alertas
│       │   ├── FilterBar.tsx    # Barra de filtros
│       │   └── SyncButton.tsx   # Botón de sincronización
│       ├── lib/              # Helpers y API client
│       └── package.json
│
├── data_samples/
│   ├── raw_excel/            # Excel original
│   ├── exports_salesforce_mock/  # Mock de datos SF para desarrollo
│   └── expected_outputs/     # Outputs esperados para validación
│
├── docs/                     # Toda la documentación
├── tests/                    # Tests
│   ├── test_arr_calculator.py   # Tests del motor de cálculo
│   ├── test_sf_extractor.py     # Tests del extractor
│   └── test_api.py              # Tests de endpoints
│
├── scripts/
│   ├── seed_product_classifications.py  # Seed inicial de productos
│   ├── import_excel_data.py             # Importar datos del Excel para validación
│   └── validate_vs_excel.py            # Comparar output app vs Excel
│
├── docker-compose.yml
├── .env.example              # Plantilla de variables de entorno
└── README.md
```

---

## Flujo de datos extremo a extremo

```
Salesforce
  → [SF Extractor] consulta SOQL → raw_opportunity_line_items
  → [ARR Calculator] aplica reglas → arr_line_items
  → [Snapshot Manager] crea snapshot → snapshots + arr_monthly_summary
  → [Alert Checker] detecta anomalías → snapshot_alerts
  
Usuario
  → [Frontend] solicita ARR por mes/filtros
  → [FastAPI] consulta arr_monthly_summary + arr_line_items
  → [Frontend] renderiza dashboard con gráficos y tablas

Usuario
  → [Frontend] introduce MRR Stripe mensual
  → [FastAPI] actualiza snapshot_stripe_mrr
  → ARR de Author Online se recalcula

Usuario
  → [Frontend] edita tabla de clasificación de productos
  → [FastAPI] actualiza product_classifications
  → Al próximo sync, los productos se reclasifican
```

---

## Modelo de datos simplificado (entidades principales)

```
snapshots (1) → (N) raw_opportunity_line_items
snapshots (1) → (N) arr_line_items
snapshots (1) → (N) arr_monthly_summary
snapshots (1) → (N) snapshot_alerts
snapshots (1) → (N) snapshot_stripe_mrr

arr_line_items (N) → (1) raw_opportunity_line_items

# Tablas maestras (independientes de snapshots)
product_classifications  (producto → tipo → is_saas)
consultant_countries     (consultor → país)
```

Ver `docs/specs/07_data_model_draft.md` para el esquema SQL completo.

---

## Cómo testear

1. **Tests unitarios del motor de cálculo:**  
   Entrada: line item con datos conocidos → verificar que `annualized_value` coincide con el Excel.

2. **Tests de integración:**  
   Mock de Salesforce → sincronización completa → verificar snapshot generado.

3. **Validación cruzada con Excel:**  
   Script `scripts/validate_vs_excel.py` compara el output de la app con el Excel para el mismo dataset.  
   Criterio de paso: diferencia < 0.01€ por línea.

4. **Tests de regresión:**  
   Cada nueva versión debe pasar los mismos tests de validación cruzada.

---

## ADR relacionados

- [ADR-001](../decisions/ADR-001_arr_calculation_base.md) — Replicar Excel fielmente en MVP
- [ADR-002](../decisions/ADR-002_dual_data_source.md) — Salesforce + Stripe manual en V1
- [ADR-003](../decisions/ADR-003_tech_stack.md) — Stack: Python/FastAPI + PostgreSQL + React/Next.js
