# V3-P6 â€” Consultores â€” nivel 2 (clientes por BL)

**Estado:** Pendiente  
**Tipo:** Nueva funcionalidad  
**Orden de implementaciÃ³n:** 6

---

## MotivaciÃ³n

El Ã¡rbol de consultores actualmente tiene dos niveles:
1. Consultor
2. LÃ­nea de negocio (LMS, Skills, Author, Engageâ€¦)

El CFO quiere un tercer nivel: al expandir una lÃ­nea de negocio dentro de un consultor, ver quÃ© clientes concretos generan ese ARR.

---

## Estructura del Ã¡rbol resultante

```
â–¶ Ana GarcÃ­a          â†’ 450.000 â‚¬
  â–¶ SaaS LMS          â†’ 280.000 â‚¬
      Carrefour         â†’ 120.000 â‚¬
      TelefÃ³nica        â†’  95.000 â‚¬
      Iberdrola         â†’  65.000 â‚¬
      â€¦(top 10)
      Otros clientes    â†’ (suma del resto)
  â–¶ SaaS Skills        â†’ 170.000 â‚¬
      â€¦
```

---

## Spec de backend

### OpciÃ³n elegida: filtro en endpoint existente

AÃ±adir parÃ¡metros opcionales al endpoint `/api/arr/by-account`:

```
GET /api/arr/by-account?snapshot_id=X&consultant=Ana+GarcÃ­a&product_type=SaaS+LMS
```

- `consultant` (opcional): filtra `arr_line_items` por el campo `consultant_name`.
- `product_type` (opcional): filtra por `product_type`.
- Cuando ambos estÃ¡n presentes, devuelve los clientes de ese consultor en esa BL, agregados por mes.
- La respuesta es la misma estructura que el endpoint actual (lista de cuentas con ARR por mes).

**Archivo a modificar:** `app/backend/api/routes/arr.py` â€” funciÃ³n que maneja `/by-account`.

### LÃ³gica de "Otros clientes"

El backend devuelve todos los clientes. El frontend toma los **Top 10 por ARR total** y agrupa el resto en una fila "Otros clientes" (no expandible).

---

## Spec de frontend

### CuÃ¡ndo cargar el nivel 2

El tercer nivel es **lazy**: solo se carga cuando el usuario expande una fila de BL dentro de un consultor. Usar React Query con una query key dinÃ¡mica:

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
- Una fila final "Otros clientes" con la suma del resto (si hay mÃ¡s de 10).
- La fila "Otros clientes" no tiene icono de expansiÃ³n.
- Las celdas de cada mes muestran el ARR de ese cliente en ese mes (mismo formato que el nivel 2).

### Columnas del tercer nivel

IdÃ©nticas a las del segundo nivel (meses del periodo seleccionado + ARR ACTUAL en negrita).

---

## Archivos a modificar

- `app/backend/api/routes/arr.py` â€” aÃ±adir params `consultant` y `product_type` al endpoint by-account
- `app/backend/api/schemas.py` â€” si hace falta, aÃ±adir params al schema de query
- `app/frontend/app/consultants/page.tsx` â€” lÃ³gica de Ã¡rbol de tres niveles
- `app/frontend/lib/api.ts` â€” actualizar la funciÃ³n `getAccountARR` para aceptar los nuevos params
- `app/frontend/lib/types.ts` â€” si hace falta aÃ±adir tipos para el tercer nivel

---

## Criterio de aceptaciÃ³n

- Al expandir una BL dentro de un consultor, aparece una lista de hasta 10 clientes + fila "Otros clientes".
- Los valores por mes de cada cliente suman correctamente el total de la BL del consultor.
- La carga es lazy (no se hace la peticiÃ³n hasta que el usuario expande).
- Con datos escasos (un consultor con 1 solo cliente en una BL), no aparece la fila "Otros clientes".
- `npx tsc --noEmit` sin errores.

