# Release And Smoke Checklist
**Fecha:** 2026-04-19
**Objetivo:** Checklist corta para validar la app antes de una demo, despliegue o handoff.

---

## 1. Backend

- Levantar PostgreSQL
- Comprobar que `DATABASE_URL` apunta al entorno correcto
- Ejecutar:

```bash
pytest tests/test_api.py
```

- Si hay Salesforce real disponible:

```bash
python scripts/test_sf_connection.py --sample-size 5
```

---

## 2. Frontend

- Verificar tipado:

```bash
cd app/frontend
npx.cmd tsc --noEmit
```

- Arrancar frontend:

```bash
npm run dev
```

- Revisar manualmente:
  - Dashboard
  - Alertas
  - Stripe
  - Consultores
  - Snapshots

---

## 3. Smoke e2e

Configuracion preparada en:
- `app/frontend/playwright.config.ts`
- `app/frontend/tests/e2e/`

Antes de ejecutar por primera vez:

```bash
cd app/frontend
npm install
npx playwright install
```

Ejecucion:

```bash
npm run test:e2e
```

Cobertura actual del smoke:
- Dashboard con mocks de `/api`
- Alertas con filtro y revision
- Stripe y consultores con mocks

Nota:
- Los smoke tests no dependen de Salesforce real.
- Estan pensados para validar la UI con respuestas mockeadas.

---

## 4. Checklist funcional minima

- Hay snapshot activo o estado vacio claro
- Sync muestra feedback de error o exito entendible
- Alertas muestran lista, filtro y flujo de revision
- Stripe avisa si falta el mes actual
- Consultores exporta CSV

---

## 5. Riesgos conocidos antes de release

- Salesforce real sigue pendiente hasta validar credenciales y API names
- `npm.cmd run build` puede terminar con `spawn EPERM` en este Windows aunque compile correctamente
- Los e2e preparados requieren instalar Playwright en el entorno local
