# Current State
**Ultima actualizacion:** 2026-04-19
**Agente:** Codex (sesion 16)

---

## Objetivo del proyecto

Construir una aplicacion web (**ARR Command Center**) que sustituya el proceso manual:
> Salesforce -> Excel -> calculo manual del CFO

La app calcula, visualiza y audita el ARR de isEazy.

**Usuarios finales:** CFO + equipo de finanzas  
**Stack:** Python/FastAPI + PostgreSQL + React/Next.js

---

## Estado actual

| Fase | Nombre | Estado | Verificacion |
|------|--------|--------|--------------|
| A | Motor de calculo + infraestructura | completa | 17/17 |
| B | Backend API FastAPI | completa | parte de `pytest tests/` |
| C | Frontend Next.js | completa | TypeScript OK |
| D | Historial de snapshots en UI | completa | TypeScript OK |
| E | Integracion real con Salesforce | en progreso | extractor + sync real implementados; ejecucion real bloqueada por credenciales y PostgreSQL local |
| F | Panel de alertas completo | completa | `pytest tests/test_api.py` OK + `npx.cmd tsc --noEmit` OK |
| G | Stripe UI completa + consultores exportables | completa | `pytest tests/test_api.py` OK + `npx.cmd tsc --noEmit` OK |
| H | Endurecimiento, e2e y UX final | en progreso | UX/error handling y scaffold e2e preparados; ejecucion real e2e pendiente de instalar Playwright |

**Tests backend:** `pytest tests/` -> **44/44 OK**  
**Frontend:** `npx.cmd tsc --noEmit` OK. `npm.cmd run build` compila, pero el proceso termina con `spawn EPERM` del entorno Windows durante el paso final de Next.

---

## Lo implementado hasta la sesion 16

### Fases E, F y G
- Salesforce real preparado pero bloqueado por secretos e infraestructura
- Alertas UX completa
- Stripe del mes actual y export CSV de consultores resueltos

### Fase H avanzada
- Helper comun de errores API en frontend
- Sync con feedback de exito/error mas util
- Estados vacios y errores visibles en dashboard, Stripe, alertas y consultores
- README, referencia de variables y checklist de smoke/release listos
- Import manual de Excel desde la UI y via API para desbloquear trabajo sin Salesforce

### Fallback manual Excel preparado en esta sesion
- Nuevo endpoint backend `POST /api/imports/excel`
- Nuevo pipeline compartido `app/backend/core/excel_importer.py`
- `scripts/import_excel_data.py` simplificado para reutilizar el mismo importador
- Nuevo boton `Subir Excel` en dashboard para generar snapshots `excel_import`
- El import manual ahora deja snapshots en estado `completed`, visibles para dashboard, alertas y Stripe

### Base e2e preparada en esta sesion
- `app/frontend/playwright.config.ts`
- `app/frontend/tests/e2e/dashboard.spec.ts`
- `app/frontend/tests/e2e/alerts.spec.ts`
- `app/frontend/tests/e2e/stripe-and-consultants.spec.ts`
- `app/frontend/tests/e2e/helpers/mock-api.ts`
- `app/frontend/tsconfig.playwright.json`
- `app/frontend/package.json`
  - script `test:e2e`
  - devDependency declarada para `@playwright/test`

Notas:
- Los smoke tests usan mocks de `/api`, asi que no dependen de Salesforce real.
- No se ejecutaron todavia porque `@playwright/test` no estaba instalado en `node_modules` del entorno actual.
- Se separo el tipado de Playwright para no romper `npx.cmd tsc --noEmit` del frontend principal.

### Verificaciones ejecutadas en la sesion 16
- `pytest tests/test_api.py` -> **25/25 OK**
- `npx.cmd tsc --noEmit` -> **OK**

---

## Lo que sigue pendiente en Fase E

1. Levantar PostgreSQL local y cargar el snapshot base Excel si aun no existe.
2. Configurar credenciales reales y permisos en Salesforce.
3. Ejecutar `python scripts/test_sf_connection.py --sample-size 5`.
4. Confirmar API names reales de:
   - campo canal comercial
   - fecha fin de suscripcion
   - licencia en meses
   - linea de negocio
5. Ajustar `.env` con esos nombres reales.
6. Ejecutar una sync real via API y guardar `snapshot_id`.
7. Ejecutar `python scripts/validate_vs_excel.py --snapshot-id <snapshot_id>` para medir desviacion.
8. Actualizar `docs/logs/salesforce_field_mapping.md` con nombres verificados, no solo defaults.

---

## Riesgos abiertos

| ID | Riesgo | Severidad | Estado |
|----|--------|-----------|--------|
| RT-01 | Nombres reales de campos Salesforce aun no verificados en la instancia de isEazy | ALTA | abierto |
| RT-02 | Tabla de productos local puede no coincidir exactamente con nombres de SF | ALTA | abierto |
| RT-03 | `validate_vs_excel.py` no ejecutado aun contra snapshot Salesforce real | MEDIA | abierto |
| RT-04 | La comparativa de snapshots hace diff en cliente; si escala, mover a backend | MEDIA | abierto |
| RT-05 | `POST /api/sync` ya usa Salesforce real y fallara sin credenciales configuradas | MEDIA | esperado |
| RT-06 | PostgreSQL local no esta levantado; no se pueden persistir snapshots reales en esta sesion | MEDIA | abierto |
| RT-07 | `npm.cmd run build` termina con `spawn EPERM` en este entorno Windows pese a compilar correctamente | BAJA | abierto |
| RT-08 | Los e2e estan preparados pero requieren instalar `@playwright/test` y navegadores para ejecutarse | BAJA | abierto |

---

## Archivos clave para el siguiente agente

- `app/backend/core/excel_importer.py`
- `app/backend/api/routes/imports.py`
- `app/frontend/components/ExcelUploadButton.tsx`
- `app/frontend/playwright.config.ts`
- `app/frontend/tests/e2e/`
- `app/frontend/tsconfig.playwright.json`
- `docs/specs/15_release_and_smoke_checklist.md`
- `README.md`
- `.env`
- `scripts/test_sf_connection.py`
- `scripts/validate_vs_excel.py`

---

## Proximo paso recomendado

**Seguir con Fase H o volver a Fase E**

Si seguimos sin Salesforce real:
1. Usar `Subir Excel` en dashboard para seguir validando calculo, alertas y UX.
2. Ejecutar la capa e2e en cuanto se instale Playwright y navegadores.
3. Si no se quiere instalar nada hoy, dejar Fase H practicamente cerrada.

Si ya hay credenciales y PostgreSQL:
1. Volver a Fase E y cerrar `test_sf_connection`, `/api/sync` y `validate_vs_excel`.
