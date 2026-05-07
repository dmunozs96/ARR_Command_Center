# SPEC-V2 Fase 3 — Agrupación de Líneas de Negocio

**Fase:** 3 de 4  
**Prioridad:** Media (recomendado implementar antes que P1 y P4 para que los filtros sean coherentes)  
**Dependencias:** Ninguna  
**Páginas afectadas:** Todas (`/`, `/clients`, `/expert`)  
**Componentes afectados:** `FilterBar.tsx`, todos los gráficos de ARR, `ARRBreakdownTable.tsx`

---

## 1. Descripción funcional

Los usuarios de isEazy frecuentemente analizan dos agrupaciones de líneas de negocio:

| Agrupación | Líneas incluidas | Nombre visualizado |
|------------|-----------------|-------------------|
| LMS + AIO | SaaS LMS + SaaS AIO | "LMS & AIO" |
| Author completo | SaaS Author + Author Online (Stripe) | "Author (Total)" |

Se añaden dos controles globales que, cuando están activados, **fusionan** las líneas correspondientes en todos los gráficos, tablas y filtros de la aplicación. Los controles son persistentes durante la sesión del usuario (localStorage).

---

## 2. Diseño de los controles

### Ubicación
Los controles se añaden al `FilterBar.tsx` existente, como una subsección llamada "Agrupaciones" o se muestran como chips toggleables en la barra de filtros.

**Diseño recomendado:** dos `<Switch>` (toggle) con etiqueta a la derecha:

```
┌─────────────────────────────────────────────────────────────┐
│  Agrupaciones:                                               │
│  ○────● Combinar LMS + AIO         ○──── Combinar Author    │
│        [activo]                          [inactivo]         │
└─────────────────────────────────────────────────────────────┘
```

### Control 1: "Combinar LMS + AIO"
- Tipo: `<Switch>` toggle (off por defecto)
- Cuando **activado**: SaaS LMS y SaaS AIO se suman y se muestran como una única línea "LMS & AIO"
- Cuando **desactivado**: SaaS LMS y SaaS AIO se muestran por separado (comportamiento actual)

### Control 2: "Combinar Author"
- Tipo: `<Switch>` toggle (off por defecto)
- Cuando **activado**: SaaS Author y Author Online (Stripe) se suman y se muestran como "Author (Total)"
- Cuando **desactivado**: SaaS Author y Author Online se muestran por separado (comportamiento actual)

---

## 3. Implementación mediante React Context

La agrupación es un estado global de UI. Se implementa con un nuevo Context.

### Nuevo archivo: `app/frontend/lib/bl-grouping-context.tsx`

```typescript
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface BLGroupingState {
  combineLmsAio: boolean;
  setCombineLmsAio: (v: boolean) => void;
  combineAuthor: boolean;
  setCombineAuthor: (v: boolean) => void;
}

const BLGroupingContext = createContext<BLGroupingState>({
  combineLmsAio: false,
  setCombineLmsAio: () => {},
  combineAuthor: false,
  setCombineAuthor: () => {},
});

export function BLGroupingProvider({ children }: { children: ReactNode }) {
  const [combineLmsAio, setCombineLmsAioState] = useState(false);
  const [combineAuthor, setCombineAuthorState] = useState(false);

  // Persistencia en localStorage
  useEffect(() => {
    const stored = localStorage.getItem("bl-grouping");
    if (stored) {
      const parsed = JSON.parse(stored);
      setCombineLmsAioState(parsed.combineLmsAio ?? false);
      setCombineAuthorState(parsed.combineAuthor ?? false);
    }
  }, []);

  const setCombineLmsAio = (v: boolean) => {
    setCombineLmsAioState(v);
    const current = JSON.parse(localStorage.getItem("bl-grouping") ?? "{}");
    localStorage.setItem("bl-grouping", JSON.stringify({ ...current, combineLmsAio: v }));
  };

  const setCombineAuthor = (v: boolean) => {
    setCombineAuthorState(v);
    const current = JSON.parse(localStorage.getItem("bl-grouping") ?? "{}");
    localStorage.setItem("bl-grouping", JSON.stringify({ ...current, combineAuthor: v }));
  };

  return (
    <BLGroupingContext.Provider value={{ combineLmsAio, setCombineLmsAio, combineAuthor, setCombineAuthor }}>
      {children}
    </BLGroupingContext.Provider>
  );
}

export const useBLGrouping = () => useContext(BLGroupingContext);
```

Registrar el provider en `app/frontend/lib/providers.tsx` (o equivalente), envolviendo toda la app.

---

## 4. Función de transformación de datos

Crear una función utilitaria que transforma los datos de ARR aplicando las agrupaciones activas:

### Nuevo archivo o añadir en `app/frontend/lib/utils.ts`:

```typescript
/**
 * Aplica agrupaciones de líneas de negocio a un diccionario by_product_type.
 * Fusiona SaaS LMS + SaaS AIO en "LMS & AIO" si combineLmsAio es true.
 * Fusiona SaaS Author + Author Online en "Author (Total)" si combineAuthor es true.
 */
export function applyBLGrouping(
  byProductType: Record<string, number>,
  opts: { combineLmsAio: boolean; combineAuthor: boolean }
): Record<string, number> {
  const result = { ...byProductType };

  if (opts.combineLmsAio) {
    const lms = result["SaaS LMS"] ?? 0;
    const aio = result["SaaS AIO"] ?? 0;
    delete result["SaaS LMS"];
    delete result["SaaS AIO"];
    if (lms + aio > 0) result["LMS & AIO"] = lms + aio;
  }

  if (opts.combineAuthor) {
    const author = result["SaaS Author"] ?? 0;
    const online = result["Author Online"] ?? 0;
    delete result["SaaS Author"];
    delete result["Author Online"];
    if (author + online > 0) result["Author (Total)"] = author + online;
  }

  return result;
}

/**
 * Mismo para un array de ARRMonthPoint — transforma el by_product_type de cada punto.
 */
export function applyBLGroupingToMonths(
  months: ARRMonthPoint[],
  opts: { combineLmsAio: boolean; combineAuthor: boolean }
): ARRMonthPoint[] {
  return months.map(m => ({
    ...m,
    by_product_type: applyBLGrouping(m.by_product_type, opts),
  }));
}
```

---

## 5. Impacto en componentes existentes

### `ARRChart.tsx` (gráfico de líneas por producto)
- Importar `useBLGrouping`
- Antes de construir las series del gráfico, llamar a `applyBLGroupingToMonths(months, { combineLmsAio, combineAuthor })`
- Las series del gráfico se calculan dinámicamente a partir de las claves de `by_product_type` → la agrupación modifica esas claves automáticamente

### `ARRYearBarsChart.tsx` (barras por año/producto)
- Misma lógica: aplicar transformación antes de construir `chartData`

### `ARRBreakdownTable.tsx` (tabla de desglose por producto)
- Aplicar transformación a los datos antes de renderizar las columnas
- Los encabezados de columna deben reflejar los nombres agrupados ("LMS & AIO" en lugar de "SaaS LMS" y "SaaS AIO")

### `KPICards.tsx`
- Las KPI cards muestran el ARR total (sin desglose por producto) → **no requieren cambios**
- Si en alguna KPI se muestra el desglose por producto, aplicar la misma transformación

### `FilterBar.tsx` (filtro de tipo de producto)
- El selector de "Tipo de producto" debe actualizar sus opciones según el estado de agrupación:
  - Si `combineLmsAio=true`: eliminar "SaaS LMS" y "SaaS AIO" del selector, añadir "LMS & AIO"
  - Si `combineAuthor=true`: eliminar "SaaS Author" y "Author Online" del selector, añadir "Author (Total)"

---

## 6. Impacto en la nueva página de Clientes (P1)

El filtro "Línea de negocio" de `/clients` debe también respetar las agrupaciones:
- Si `combineLmsAio=true`: la opción "SaaS LMS" y "SaaS AIO" desaparecen, aparece "LMS & AIO"
  - Al seleccionar "LMS & AIO", la query a `/api/arr/by-account` pasa `product_types=SaaS LMS,SaaS AIO`
  - Los datos del endpoint se devuelven separados, y la transformación `applyBLGrouping` los fusiona en el frontend
- Si `combineAuthor=true`: mismo patrón con "Author (Total)"

---

## 7. Impacto en ARR Expert (P4)

El ARR Expert recibirá como contexto el estado de agrupación activo (ver SPEC-V2-phase4). Si el usuario tiene activado "Combinar LMS + AIO", el experto debe responder siempre con "LMS & AIO" como unidad, no por separado.

---

## 8. Mapa de colores para nombres agrupados

Añadir en `app/frontend/lib/constants.ts` (donde ya deben existir los colores de producto):

```typescript
export const PRODUCT_TYPE_COLORS: Record<string, string> = {
  "SaaS LMS":       "#6d35ff",
  "SaaS AIO":       "#a855f7",
  "LMS & AIO":      "#6d35ff",  // mismo que LMS (dominante)
  "SaaS Author":    "#f59e0b",
  "Author Online":  "#fbbf24",
  "Author (Total)": "#f59e0b",  // mismo que Author offline (dominante)
  "SaaS Engage":    "#10b981",
  "SaaS Skills":    "#3b82f6",
};
```

---

## 9. Criterios de aceptación

- [ ] Los dos toggles aparecen en el FilterBar y son visibles en todas las páginas que usan ese componente
- [ ] Al activar "Combinar LMS + AIO", todos los gráficos de la app muestran "LMS & AIO" en lugar de dos líneas/barras separadas
- [ ] Al activar "Combinar Author", todos los gráficos muestran "Author (Total)" fusionando Stripe + Salesforce
- [ ] La suma de "LMS & AIO" es exactamente igual a SaaS LMS + SaaS AIO del mismo mes
- [ ] La suma de "Author (Total)" es exactamente igual a SaaS Author + Author Online del mismo mes
- [ ] El estado de los toggles persiste al recargar la página (localStorage)
- [ ] Al desactivar un toggle, los datos vuelven a mostrarse separados inmediatamente
- [ ] El selector de "Tipo de producto" en el FilterBar actualiza sus opciones según el estado de los toggles
- [ ] En la página de Clientes, el filtro de línea de negocio también refleja los toggles
