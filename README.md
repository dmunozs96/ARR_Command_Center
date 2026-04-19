# ARR Command Center

Aplicacion para calcular, versionar y visualizar el ARR de isEazy a partir de datos de Salesforce, snapshots historicos y el proceso heredado del Excel.

## Estado

Situacion actual del proyecto:
- Fases A, B, C, D, F y G completadas
- Fase H avanzada en UX y manejo de errores
- Fase E implementada a nivel de codigo, pero pendiente de ejecucion real por credenciales de Salesforce y PostgreSQL local

Leer primero:
- `docs/handover/CURRENT_STATE.md`
- `docs/handover/NEXT_STEPS.md`
- `docs/handover/SESSION_LOG.md`

## Que hace la app

- Calcula ARR mensual y versionado por snapshot
- Muestra dashboard historico por linea de negocio
- Permite revisar alertas de calidad de datos
- Permite introducir MRR manual de Stripe para Author Online
- Permite revisar ARR por consultor y exportarlo a CSV
- Permite subir manualmente el Excel origen desde la UI para generar snapshots
- Prepara una sync real desde Salesforce

## Stack

- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Frontend: Next.js + React + React Query
- Integracion: Salesforce REST/SOQL

## Arranque rapido

### 1. Requisitos

- Python 3.11+
- Node.js 18+
- Docker Desktop

### 2. Variables de entorno

Backend:

```bash
copy .env.example .env
```

Frontend:

```bash
copy app\\frontend\\.env.local.example app\\frontend\\.env.local
```

Referencia completa:
- `docs/specs/14_runtime_and_env_reference.md`

### 3. Base de datos

```bash
docker compose up -d db
```

### 4. Dependencias backend

```bash
pip install -r app/backend/requirements.txt
```

### 5. Importacion del Excel base

```bash
python scripts/import_excel_data.py
```

Alternativa desde la UI:
- Arranca backend y frontend
- En el dashboard usa el boton `Subir Excel`
- La app creara un snapshot `excel_import` completo sin depender de Salesforce

### 6. Backend

```bash
uvicorn app.backend.main:app --reload --port 8000
```

### 7. Frontend

```bash
cd app/frontend
npm install
npm run dev
```

Frontend:
- `http://localhost:3000`

Backend docs:
- `http://localhost:8000/docs`

## Comandos utiles

Tests backend:

```bash
pytest tests/
```

Chequeo frontend:

```bash
cd app/frontend
npx.cmd tsc --noEmit
```

Smoke e2e:

```bash
cd app/frontend
npm run test:e2e
```

Nota:
- Antes de ejecutar los e2e hay que instalar `@playwright/test` y los navegadores con `npx playwright install`.

Prueba de conexion Salesforce:

```bash
python scripts/test_sf_connection.py --sample-size 5
```

Validacion contra Excel:

```bash
python scripts/validate_vs_excel.py --snapshot-id <snapshot_id>
```

## Limitaciones conocidas

- La sync real de Salesforce no se puede completar sin credenciales validas en `.env`
- El entorno local actual no tiene PostgreSQL levantado por defecto
- `npm.cmd run build` compila, pero en este Windows el proceso final cae con `spawn EPERM`

## Documentacion clave

- `docs/specs/04_salesforce_integration_plan.md`
- `docs/specs/10_versioning_and_snapshots.md`
- `docs/specs/11_build_from_zero_guide.md`
- `docs/specs/14_runtime_and_env_reference.md`
- `docs/specs/15_release_and_smoke_checklist.md`

## Proximo paso recomendado

Si seguimos sin acceso real a Salesforce:
- usar el boton `Subir Excel` para seguir validando calculos y UI
- ejecutar o rematar la capa e2e basica preparada en `app/frontend/tests/e2e`

Si ya hay credenciales y PostgreSQL:
- cerrar Fase E con `test_sf_connection`, `/api/sync` y `validate_vs_excel`
