# Next Steps
**Ultima actualizacion:** 2026-04-19

---

## Estado actual

Fase H esta casi cerrada:
- loading states y errores mas claros ya mejorados
- README y referencia de entorno cerrados
- scaffold e2e basico preparado con Playwright y mocks

Bloqueos que siguen abiertos:
- faltan credenciales reales de Salesforce en `.env`
- PostgreSQL local no responde en `localhost:5432`
- `npm.cmd run build` compila pero termina con `spawn EPERM` en este entorno Windows
- los e2e no se han ejecutado aun porque Playwright no esta instalado en `node_modules`

Desbloqueo ya disponible:
- el dashboard ya permite subir manualmente el `.xlsx` origen con `Subir Excel`
- ese upload crea un snapshot `excel_import` completo y visible en toda la UI

Verificaciones recientes:
- `pytest tests/test_api.py` -> **25/25 OK**
- `npx.cmd tsc --noEmit` -> **OK**

---

## FASE E - Integracion real con Salesforce

Pendiente para cerrarla de verdad:
- [ ] Levantar PostgreSQL local
- [ ] Importar Excel base si aun no existe snapshot `excel_import`
- [ ] Configurar credenciales reales en `.env`
- [ ] Ejecutar `python scripts/test_sf_connection.py --sample-size 5`
- [ ] Verificar y corregir API names reales:
  - `SF_OPPORTUNITY_CHANNEL_FIELD`
  - `SF_LINEITEM_START_DATE_FIELD`
  - `SF_LINEITEM_END_DATE_FIELD`
  - `SF_LINEITEM_LICENSE_MONTHS_FIELD`
  - `SF_LINEITEM_BUSINESS_LINE_FIELD`
- [ ] Lanzar una sync real contra Salesforce
- [ ] Ejecutar `python scripts/validate_vs_excel.py --snapshot-id <snapshot_id>`
- [ ] Confirmar desviacion < 1% frente al Excel
- [ ] Actualizar `docs/logs/salesforce_field_mapping.md` con nombres verificados

---

## FASE H - Endurecimiento y produccion

Siguiente objetivo recomendado:
- [x] loading states y errores mas claros
- [x] manejo base de errores de API para SF timeout / configuracion ausente
- [x] README de usuario final y variables de entorno documentadas
- [x] scaffold e2e basico con Playwright
- [x] fallback manual de Excel desde la UI para seguir desarrollando sin Salesforce
- [ ] ejecutar e2e basicos con Playwright
- [ ] runbook corto de despliegue o produccion

Comandos utiles:
```bash
pytest tests/test_api.py
npx.cmd tsc --noEmit
cd app/frontend
npm install
npx playwright install
npm run test:e2e
```

Notas:
- Los smoke tests e2e mockean `/api`, asi que no necesitan Salesforce real.
- Mientras no llegue Salesforce, se puede seguir usando el boton `Subir Excel` para pruebas funcionales y demos.
- La decision ahora es simple: o se instala Playwright para ejecutar la suite, o se vuelve a Salesforce real cuando haya credenciales.
