# Next Steps
**Ultima actualizacion:** 2026-05-08

---

## Estado actual

Fases A-H + I-A + I-B + V2 completas. Tests: 57/57 OK. TypeScript OK. E2E: 3/3 OK.

**Siguiente trabajo: V3 — implementar en orden P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8.**

Specs completas en `docs/specs/SPEC-V3-*.md`.

---

## V3 — Orden de implementacion

### V3-P1 — Correccion matematica BL grouping (EMPEZAR AQUI)

Ver spec completa: `docs/specs/SPEC-V3-phase1-bl-math-fix.md`

- [ ] Leer `bl-grouping-context.tsx` y `utils.ts` para identificar la funcion de suma de series
- [ ] Reescribir la suma usando join por clave de mes (`YYYY-MM`), rellenando con `0` los meses faltantes
- [ ] Verificar que `Author (Total)[mes] === SaaS Author[mes] + Author Online[mes]` para todos los meses
- [ ] `npx tsc --noEmit` sin errores

---

### V3-P2 — Limpieza de NaN global

Ver spec completa: `docs/specs/SPEC-V3-phase2-nan-fix.md`

- [ ] Hacer formatter defensivo en `utils.ts`: `formatEUR(null|undefined|NaN)` → `'—'`
- [ ] Anadir guard en calculos de delta/porcentaje: si denominador es 0, devolver `null`
- [ ] Corregir NaN en widget de paises
- [ ] Corregir NaN en columna Δ de tabla de clientes
- [ ] Corregir NaN en ARR AGREGADO de consultores
- [ ] `npx tsc --noEmit` sin errores

---

### V3-P3 — MoM → YTD comparativo

Ver spec completa: `docs/specs/SPEC-V3-phase3-ytd-metrics.md`

- [ ] Crear helper `calcYTD()` en `utils.ts`
- [ ] Reemplazar columnas MoM en `ARRBreakdownTable.tsx` por YTD actual / YTD anterior / Δ YTD %
- [ ] Reemplazar MoM en tabla de consultores
- [ ] Actualizar `KPICards.tsx` — KPI de variacion muestra YTD vs YTD anterior
- [ ] Verificar que Δ YTD % muestra `—` cuando no hay datos del año anterior

---

### V3-P4 — Top 20 sin "Otros"

Ver spec completa: `docs/specs/SPEC-V3-phase4-top20-cleanup.md`

- [ ] En `TopAccountsBarsChart.tsx`: filtrar segmento "Otros" antes de pasar datos a Recharts
- [ ] En `TopAccountsLinesChart.tsx`: mismo filtro
- [ ] Verificar que la nota descriptiva bajo el titulo es precisa en ambos graficos

---

### V3-P5 — Tabla de clientes corregida

Ver spec completa: `docs/specs/SPEC-V3-phase5-client-table.md`

- [ ] Renombrar columna TOTAL → ARR ACTUAL, mostrar ultimo mes en negrita
- [ ] Columna Δ: anadir segunda linea con porcentaje de cambio
- [ ] Guard: si primer mes es 0 o null, mostrar `—` en el porcentaje
- [ ] Adaptar cabecera del CSV exportado

---

### V3-P6 — Consultores — nivel 2 (clientes por BL)

Ver spec completa: `docs/specs/SPEC-V3-phase6-consultants-level2.md`

- [ ] Anadir params `consultant` y `product_type` al endpoint `/api/arr/by-account`
- [ ] Actualizar `api.ts` para pasar los nuevos params
- [ ] Implementar tercer nivel en `consultants/page.tsx` con carga lazy
- [ ] Top 10 clientes + fila "Otros clientes" por cada BL de cada consultor
- [ ] `pytest tests/` sin regresiones
- [ ] `npx tsc --noEmit` sin errores

---

### V3-P7 — Exportar Excel snapshot

Ver spec completa: `docs/specs/SPEC-V3-phase7-excel-export.md`

- [ ] Crear `app/backend/core/excel_exporter.py` con funcion `build_snapshot_excel()`
- [ ] Crear `app/backend/api/routes/exports.py` con endpoint `GET /api/exports/excel`
- [ ] Registrar el router en `main.py`
- [ ] Anadir boton "Descargar Snapshot" en el header del dashboard (`app/page.tsx`)
- [ ] Anadir `downloadSnapshotExcel()` en `api.ts`
- [ ] Verificar que el `.xlsx` tiene las 5 pestañas con datos correctos
- [ ] `pytest tests/` sin regresiones

---

### V3-P8 — Revision y optimizacion de codigo (ULTIMA)

Ver spec completa: `docs/specs/SPEC-V3-phase8-code-review.md`

- [ ] Auditar frontend: props no usadas, estados duplicados, imports huerfanos
- [ ] Auditar `utils.ts` y `types.ts`: funciones/interfaces obsoletas
- [ ] Auditar backend: queries N+1, endpoints demasiado gordos, schemas obsoletos
- [ ] Producir informe de hallazgos
- [ ] Aplicar simplificaciones aprobadas por el CFO
- [ ] `pytest tests/` + `npx tsc --noEmit` en verde

---

## Fase E — Integracion real con Salesforce (bloqueada)

Sigue bloqueada por falta de credenciales. Cuando esten disponibles:

- [ ] Configurar en `.env`: `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN`, `SF_DOMAIN`
- [ ] Ejecutar `python scripts/test_sf_connection.py --sample-size 5`
- [ ] Verificar API names reales de campos SF en `docs/logs/salesforce_field_mapping.md`
- [ ] Lanzar sync real y ejecutar `python scripts/validate_vs_excel.py`
- [ ] Confirmar desviacion < 1% frente al Excel
- [ ] Activar cron en Railway (ver `docs/specs/18_daily_sync_cron.md`)

---

## Pendientes de negocio menores

### Comportamiento exclusion entre snapshots

Las exclusiones de solapamientos no se transfieren al snapshot siguiente. Dos opciones:
- **Opcion A (actual):** CFO re-revisa en cada snapshot nuevo.
- **Opcion B:** copiar flags del snapshot anterior para los mismos `sf_line_item_id`.

Pendiente: confirmar con el CFO.

---

## Comandos utiles

```bash
# Backend
pytest tests/

# Frontend
cd app/frontend
npx tsc --noEmit
npm run test:e2e

# Migraciones (con PG local)
alembic upgrade head

# Sync manual
curl -X POST http://localhost:8000/api/sync -H "Content-Type: application/json"
```
