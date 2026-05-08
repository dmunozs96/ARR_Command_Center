# V3-P6 — Consultores — nivel 2 (clientes por BL)

**Estado:** Pendiente  
**Tipo:** Nueva funcionalidad  
**Orden de implementación:** 6

---

## Motivación

El árbol de consultores actualmente tiene dos niveles:
1. Consultor
2. Línea de negocio (LMS, Skills, Author, Engage…)

El CFO quiere un tercer nivel: al expandir una línea de negocio dentro de un consultor, ver qué clientes concretos generan ese ARR.

---

## Estructura del árbol resultante

```
▶ Ana García          → 450.000 €
  ▶ SaaS LMS          → 280.000 €
      Carrefour         → 120.000 €
      Telefónica        →  95.000 €
      Iberdrola         →  65.000 €
      …(top 10)
      Otros clientes    → (suma del resto)
  ▶ SaaS Skills        → 170.000 €
      …
```

---

## Spec de backend

### Opción elegida: filtro en endpoint existente

Añadir parámetros opcionales al endpoint `/api/arr/by-account`:

```
GET /api/arr/by-account?snapshot_id=X&consultant=Ana+García&product_type=SaaS+LMS
```

- `consultant` (opcional): filtra `arr_line_items` por el campo `consultant_name`.
- `product_type` (opcional): filtra por `product_type`.
- Cuando ambos están presentes, devuelve los clientes de ese consultor en esa BL, agregados por mes.
- La respuesta es la misma estructura que el endpoint actual (lista de cuentas con ARR por mes).

**Archivo a modificar:** `app/backend/api/routes/arr.py` — función que maneja `/by-account`.

### Lógica de "Otros clientes"

El backend devuelve todos los clientes. El frontend toma los **Top 10 por ARR total** y agrupa el resto en una fila "Otros clientes" (no expandible).

---

## Spec de frontend

### Cuándo cargar el nivel 2

El tercer nivel es **lazy**: solo se carga cuando el usuario expande una fila de BL dentro de un consultor. Usar React Query con una query key dinámica:

```typescript
const { data } = useQuery({
  queryKey: ['consultant-bl-clients', snapshotId, consultant, productType],
  queryFn: () => api.getAccountARR({ snapshotId, consultant, productType }),
  enabled: isExpanded,  // solo cuando el usuario abre esa fila
});
```

### Renderizado del tercer nivel

- Mostrar un spinner mientras carga.
- Top 10 clientes individuales, ordenados por ARR total descendente.
- Una fila final "Otros clientes" con la suma del resto (si hay más de 10).
- La fila "Otros clientes" no tiene icono de expansión.
- Las celdas de cada mes muestran el ARR de ese cliente en ese mes (mismo formato que el nivel 2).

### Columnas del tercer nivel

Idénticas a las del segundo nivel (meses del periodo seleccionado + ARR ACTUAL en negrita).

---

## Archivos a modificar

- `app/backend/api/routes/arr.py` — añadir params `consultant` y `product_type` al endpoint by-account
- `app/backend/api/schemas.py` — si hace falta, añadir params al schema de query
- `app/frontend/app/consultants/page.tsx` — lógica de árbol de tres niveles
- `app/frontend/lib/api.ts` — actualizar la función `getAccountARR` para aceptar los nuevos params
- `app/frontend/lib/types.ts` — si hace falta añadir tipos para el tercer nivel

---

## Criterio de aceptación

- Al expandir una BL dentro de un consultor, aparece una lista de hasta 10 clientes + fila "Otros clientes".
- Los valores por mes de cada cliente suman correctamente el total de la BL del consultor.
- La carga es lazy (no se hace la petición hasta que el usuario expande).
- Con datos escasos (un consultor con 1 solo cliente en una BL), no aparece la fila "Otros clientes".
- `npx tsc --noEmit` sin errores.
