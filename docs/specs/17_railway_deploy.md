# Despliegue en Railway

Fecha: 2026-04-19

## Arquitectura recomendada

Desplegar como 3 servicios dentro del mismo proyecto Railway:

1. `postgres`
2. `backend-api`
3. `frontend-web`

## Importante para este repo

Este repositorio no encaja bien con un `Root Directory` de backend en `/app/backend`, porque los imports Python usan `app.backend...` desde la raiz del repo.

Por eso, para el backend conviene:

- mantener la raiz del servicio en `/`
- usar comandos de build/start explicitos
- limitar despliegues con `Watch Paths`

## Backend

### Source Repo

- GitHub repo actual
- Root Directory: `/`

### Watch Paths recomendados

- `/app/backend/**`
- `/scripts/**`
- `/tests/**`

### Variables

- `DATABASE_URL` como referencia desde Postgres
- `APP_ENV=production`
- `LOG_LEVEL=INFO`

Opcionales mientras Salesforce no este listo:

- no hace falta rellenar las variables `SF_*` para usar upload manual de Excel

### Build Command

```bash
pip install -r app/backend/requirements.txt
```

### Start Command

```bash
uvicorn app.backend.main:app --host 0.0.0.0 --port $PORT
```

### Pre-deploy Command

```bash
cd app/backend && alembic upgrade head
```

### Networking

- Generar dominio publico
- Ejemplo: `https://backend-api-production-xxxx.up.railway.app`

## Frontend

### Source Repo

- GitHub repo actual
- Root Directory: `/app/frontend`

### Variables

- `NEXT_PUBLIC_API_URL=https://<dominio-del-backend>`

### Build Command

Usar el detectado por Railway o forzar:

```bash
npm ci && npm run build
```

### Start Command

```bash
npm run start
```

## Postgres

- Crear servicio `PostgreSQL` desde Railway
- Referenciar `DATABASE_URL` en backend desde ese servicio

## Orden recomendado

1. Crear Postgres
2. Desplegar backend
3. Generar dominio del backend
4. Configurar `NEXT_PUBLIC_API_URL` en frontend con ese dominio
5. Desplegar frontend
6. Entrar en la UI y probar `Subir Excel`

## Smoke test recomendado

1. Abrir el frontend
2. Confirmar que carga sin error
3. Usar `Subir Excel`
4. Verificar que aparece snapshot en dashboard
5. Abrir `/alerts`
6. Abrir `/stripe`
7. Abrir `/consultants`
