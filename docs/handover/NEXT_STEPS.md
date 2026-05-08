# Next Steps
**Ultima actualizacion:** 2026-05-08

---

## Estado actual

Fases A-H + I-A + I-B + V2 + V3-P1 a P8 completas.
V3 bugfix final aplicado tras `docs/v3_bug_report.md`.
Sesion 23 corrige la semantica de ARR: no hay YTD acumulado; las comparativas son punto a punto contra mismo mes del ano anterior y diciembre anterior movil.
Tests: 63/63 OK. Frontend lint/build OK. E2E: 3/3 OK.

**V3 completamente cerrada y revalidada. Informes relevantes:**
- `docs/v3_bug_report.md` — bugs V3 reparados en sesion 22
- `docs/logs/V3-P8-audit-report.md` — auditoria/refactors propuestos de sesion 21

Nota funcional importante:
- ARR es anualizado. No sumar meses para calcular YTD.
- En dashboard y desglose por linea, comparar el mes seleccionado contra mismo mes del ano anterior y diciembre anterior movil (`n-1`).
- Dashboard ya incluye filtro de cliente para validar tendencias intermensuales de cuentas concretas.

Refactors mayores pendientes de aprobacion (no implementados):
- Separar logica de negocio de la capa HTTP en `arr.py` (propuesta A en informe)
- Consolidar logica de agregacion mensual duplicada en `arr.py` / `expert.py` (propuesta B)
- Ver informe completo para propuestas C-F

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
