# Current State
**Última actualización:** 2026-04-17
**Agente:** Claude Code (sesión 4)

---

## Objetivo del proyecto

Construir una aplicación web (**ARR Command Center**) para calcular, visualizar y auditar el ARR (Annual Recurring Revenue) de isEazy.

- Sustituye al proceso manual: exportación de Salesforce → Excel → cálculo manual.
- Replica fielmente la lógica del Excel en el MVP.
- Se conecta a Salesforce para extraer oportunidades ganadas.
- Guarda snapshots históricos para auditoría.
- Muestra dashboards por línea de negocio, consultor, canal.

---

## Estado actual: FASE A COMPLETADA

La Fase A de implementación está completa y todos los tests pasan (17/17).

### Fases de documentación completadas

| Fase | Contenido | Estado |
|------|-----------|--------|
| Fase 0 | Bootstrap del repositorio y metodología | ✅ |
| Fase 1 | Análisis exhaustivo del Excel | ✅ |
| Fase 2 | Requisitos funcionales y no funcionales | ✅ |
| Fase 3 | Plan de integración con Salesforce | ✅ |
| Fase 4 | Arquitectura, stack, modelo de datos | ✅ |
| Fase 5 | Guía de construcción desde cero | ✅ |
| Fase 6 | Roadmap de implementación (Fases A–H) | ✅ |

### Fases de implementación completadas

| Fase | Contenido | Estado |
|------|-----------|--------|
| Fase A | Motor de cálculo + estructura base + BD + scripts | ✅ |

---

## Decisiones confirmadas (inamovibles para el MVP)

| Decisión | Valor | Fuente |
|----------|-------|--------|
| Cálculo ARR | `(precio_real / días_periodo_normalizado) × 365` | Excel + CFO |
| Fidelidad al Excel | Replicar exactamente, con flags para mejoras | ADR-001 |
| Fuente principal | Salesforce API (OAuth2 + SOQL) | ADR-002 |
| Fuente secundaria | Stripe = input manual en UI (V1) | ADR-002 + CFO |
| Variable Invoicing | Misma lógica SaaS si `Tipo de Producto Correcto` es SaaS | CFO |
| Moneda | Todo EUR, sin conversión | CFO |
| Stack | Python/FastAPI + PostgreSQL + React/Next.js | ADR-003 |
| Clasificación SaaS | Via tabla maestra `product_classifications` | ADR-001 |

---

## Hallazgos clave del Excel (leer antes de implementar)

1. **Fórmula core:** `ARR_line = (cantidad × precio_unitario) / (fin_mes_normalizado - inicio_mes) × 365`
2. **Solapamiento mensual:** Un line item está activo en mes M si `inicio_mes ≤ fin_mes_objetivo AND fin_mes_normalizado ≥ inicio_mes_objetivo`
3. **Fallback sin fecha inicio:** usa `close_date` como proxy
4. **Fallback sin fecha fin:** asume `start + 365 días`
5. **Normalización:** `inicio_mes = primer día del mes de inicio`, `fin_mes = inicio_mes + días_brutos - 1`
6. **Dos fuentes:** Salesforce (todo menos Author Online) + Stripe (Author Online, MRR × 12)
7. **ARR desde close won NO implementado** en el Excel (columnas AC–AF preparadas pero no usadas en SUMIFS)
8. **Excepciones manuales conocidas:** Virto (5 años con importes de 1 año), contrato 9-meses/12-meses
9. **1 producto con #N/A** en clasificación (no encontrado en tabla maestra)

---

## Archivos creados en Fase A

```
app/backend/
  config/settings.py          ← carga .env
  db/connection.py            ← SQLAlchemy engine + SessionLocal
  db/models.py                ← todos los modelos ORM
  db/migrations/              ← Alembic configurado
  db/migrations/versions/
    0001_initial_schema.py    ← primera migración completa
  core/arr_calculator.py      ← motor de cálculo ARR (replica Excel AJ)
  core/alert_checker.py       ← resumen de calidad de datos
  requirements.txt

scripts/
  import_excel_data.py        ← carga el Excel en la BD (snapshot excel_import)
  validate_vs_excel.py        ← valida paridad app vs Excel (<0.01€ por línea)

tests/
  test_arr_calculator.py      ← 17 tests unitarios (todos pasan)

docker-compose.yml            ← PostgreSQL en puerto 5432 (arruser/arrpass/arrdb)
.env.example                  ← plantilla de variables
```

---

## Cómo arrancar el proyecto (desde cero)

```bash
# 1. Levantar la base de datos
docker-compose up -d

# 2. Instalar dependencias Python
pip install -r app/backend/requirements.txt

# 3. Copiar y editar variables de entorno
cp .env.example .env

# 4. Crear el schema en la BD
cd app/backend
alembic upgrade head

# 5. Importar datos del Excel
cd ../..
python scripts/import_excel_data.py

# 6. Validar paridad con Excel
python scripts/validate_vs_excel.py

# 7. Ejecutar tests unitarios
pytest tests/
```

---

## Archivos imprescindibles para el siguiente agente

### Antes de implementar Fase B, leer en este orden:
1. **`docs/handover/NEXT_STEPS.md`** — checklist de la Fase B
2. **`docs/specs/09_dashboard_and_reporting_draft.md`** — endpoints API y wireframes
3. **`app/backend/core/arr_calculator.py`** — domain objects disponibles para la API

---

## Riesgos abiertos (no bloqueantes para Fase B)

| Riesgo | Severidad | Estado |
|--------|-----------|--------|
| Q-03: "ARR desde close won" — definición exacta | MEDIA | Pendiente (post-MVP) |
| Q-05: ¿TaaS en ARR SaaS? | BAJA | Pendiente validación CFO |
| Q-06: Doble conteo en renovaciones | MEDIA | Pendiente validación CFO |
| RT-01: Calidad datos SF (campos vacíos) | ALTA | Mitigado con fallbacks y alertas |
| RT-02: Tabla de productos desactualizada | ALTA | Mitigado con alertas automáticas |
| Excepciones Virto / 9-12 meses | MEDIA | Detectadas por flag DURATION_HIGH |
| Mapeo exacto campos SF | ALTA | Verificar con admin SF antes de Fase E |

---

## Próximo paso: FASE B de implementación

**El siguiente agente debe implementar la Fase B (Backend API FastAPI).**  
Ver `docs/handover/NEXT_STEPS.md` para el checklist detallado.
