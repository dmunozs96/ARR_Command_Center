# Next Steps
**Ultima actualizacion:** 2026-05-08

---

## Estado actual

Fases A-H + I-A + I-B + V2 + V3-P1 a P7 completas.  
Tests: 57/57 OK. TypeScript: 0 errores. E2E: 3/3 OK.

**Siguiente trabajo: V3-P8 — Revision y optimizacion de codigo.**

---

## V3-P8 — Revision y optimizacion de codigo (EMPEZAR AQUI)

Ver spec completa: `docs/specs/SPEC-V3-phase8-code-review.md`

### Frontend
- [ ] Auditar props no usadas en componentes (especialmente `ARRBreakdownTable` — ya no recibe `prev`)
- [ ] Revisar `utils.ts`: `formatMoM` sigue siendo necesaria (se usa en KPICards para YoY); confirmar
- [ ] Limpiar imports huerfanos (`formatMoM` en consultants/page.tsx fue eliminado; verificar que no hay otros)
- [ ] Revisar `types.ts`: `ConsultantARR.mom_change` y `.mom_pct` ya no se usan en UI — decidir si limpiar
- [ ] `npx tsc --noEmit` en verde

### Backend
- [ ] Verificar que `ARRMonthlySummary` se puebla correctamente en cada snapshot (lo usa `excel_exporter.py`)
- [ ] Revisar endpoint `/arr/by-account` — la combinacion de filtros `product_types` (CSV) y `product_type` (single) puede ser confusa; unificar si es posible
- [ ] Auditar queries N+1 en `excel_exporter.py` (el sheet "Lineas brutas" carga todas las filas a memoria)
- [ ] `pytest tests/` sin regresiones

### Prueba manual del Excel export
- [ ] Subir un snapshot real y hacer clic en "Descargar Snapshot"
- [ ] Verificar que el .xlsx tiene las 5 pestañas con datos correctos
- [ ] Verificar que los numeros son tipo numero en Excel (no texto)

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

# Descargar Excel (con PG local + snapshot activo)
curl "http://localhost:8000/api/exports/excel?snapshot_id=<UUID>" -o snapshot.xlsx
```
