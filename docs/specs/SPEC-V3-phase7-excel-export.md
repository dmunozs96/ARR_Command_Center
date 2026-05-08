# V3-P7 — Exportar Excel snapshot

**Estado:** Pendiente  
**Tipo:** Nueva funcionalidad  
**Orden de implementación:** 7

---

## Motivación

Cuando la integración con Salesforce esté activa, el CFO necesita poder llevarse los datos calculados a Excel para análisis ad hoc fuera de la web. La app calcula cosas complejas (ARR anualizado, agrupaciones por BL, etc.) que sería difícil replicar manualmente; exportarlas listas evita ese trabajo.

---

## Alcance

Un endpoint nuevo que devuelve un archivo `.xlsx` con todas las vistas calculadas del snapshot activo, descargable desde el dashboard.

---

## Spec de backend

### Nuevo endpoint

```
GET /api/exports/excel?snapshot_id={uuid}
```

- Devuelve un archivo `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Nombre del archivo: `arr-snapshot-{YYYY-MM-DD}.xlsx`
- Requiere que el snapshot exista y tenga estado `ready`.

### Pestañas del Excel

| Pestaña | Contenido | Fuente de datos |
|---|---|---|
| **Resumen mensual** | Mes, tipo de producto, ARR | `ARRMonthlySummary` |
| **Por cliente** | Cliente, mes, ARR, BL | `ARRLineItem` agrupado por account + mes |
| **Por consultor** | Consultor, mes, ARR, BL | `ARRLineItem` agrupado por consultor + mes |
| **Por país** | País, mes, ARR | `ARRLineItem` join `ConsultantCountry` agrupado por país + mes |
| **Líneas brutas** | Todos los campos de `ARRLineItem` (oportunidad, cuenta, fechas, valor calculado, excluido_de_arr) | `ARRLineItem` completo |

### Implementación

- Librería: `openpyxl` (ya en `requirements.txt`).
- Crear `app/backend/core/excel_exporter.py` con la función `build_snapshot_excel(snapshot_id, db) -> bytes`.
- Nueva ruta en `app/backend/api/routes/` — crear `exports.py` y registrar en `main.py`.
- Usar `StreamingResponse` de FastAPI para no cargar el archivo completo en memoria.

### Esquema de columnas — Resumen mensual

| month | product_type | arr_eur |
|---|---|---|
| 2026-01 | SaaS LMS | 1.234.567 |

### Esquema de columnas — Líneas brutas

| opportunity_id | account_name | product_name | product_type | consultant_name | start_date | end_date | real_price | service_days | annualized_value | excluded_from_arr |
|---|---|---|---|---|---|---|---|---|---|---|

---

## Spec de frontend

### Botón nuevo en el header del dashboard

En `app/frontend/app/page.tsx`, en la sección del header donde están "Subir Excel" y "Actualizar Salesforce", añadir un tercer botón:

```
[ Subir Excel ]  [ Actualizar Salesforce ]  [ Descargar Snapshot ]
```

- Label: **"Descargar Snapshot"**
- Icono: `Download` de `lucide-react`
- Al hacer clic: llama a `GET /api/exports/excel?snapshot_id={activeSnapshotId}` y dispara la descarga del navegador.
- Deshabilitado si no hay snapshot activo.
- Muestra un spinner mientras descarga (estado local).

### Función en `api.ts`

```typescript
export async function downloadSnapshotExcel(snapshotId: string): Promise<void> {
  const response = await axios.get(`/api/exports/excel`, {
    params: { snapshot_id: snapshotId },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `arr-snapshot-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}
```

---

## Archivos a crear / modificar

### Crear
- `app/backend/core/excel_exporter.py`
- `app/backend/api/routes/exports.py`

### Modificar
- `app/backend/main.py` — registrar el router de exports
- `app/frontend/app/page.tsx` — añadir botón
- `app/frontend/lib/api.ts` — añadir `downloadSnapshotExcel`

---

## Criterio de aceptación

- Al hacer clic en "Descargar Snapshot", el navegador descarga un archivo `.xlsx`.
- El archivo contiene las 5 pestañas con los datos correctos.
- Los valores numéricos están formateados como número (no como texto) en Excel.
- Si el snapshot no existe o no está listo, el endpoint devuelve 404 con mensaje claro.
- `pytest tests/` sin regresiones.
