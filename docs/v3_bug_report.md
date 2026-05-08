# V3 Bug Report & Estrategia de Reparación

Fecha: 2026-05-08  
Estado: Diagnóstico completo. **Implementación delegada a Codex.**

## Nota de handover

Este documento fue generado por Claude Code (sesión 22) tras análisis exhaustivo del código.  
La implementación de los fixes la llevará a cabo **Codex** en la siguiente sesión.

**Qué hacer con este documento:**  
Pasárselo a Codex con la instrucción: *"Implementa las 5 fases de la sección 'ESTRATEGIA DE REPARACIÓN V3' en orden, verifica en browser después de cada fase, y ejecuta los tests al final."*

**Contexto importante para Codex:**
- La causa raíz está en `app/backend/api/schemas.py` — Pydantic v2 serializa `Decimal` como string
- El fix del backend (Fase 1) desbloquea automáticamente 5 de los 8 bugs
- Los tests existentes están en `tests/` y pasan al 100% (61/61) — no romper eso
- El fichero de referencia numérica es `data_samples/expected_outputs/Experimento_Claude_ARR.xlsx`

---

---

## DIAGNÓSTICO EJECUTIVO

Casi todos los bugs reportados tienen **una única causa raíz**: Pydantic v2 serializa los campos `Decimal` del backend como **strings JSON** (`"7469379.00"`) en lugar de números (`7469379`). El frontend TypeScript declara esos campos como `number`, pero en runtime recibe strings. Esto provoca que:

- `Number.isFinite("1234567.89")` → `false` → `formatEUR` devuelve `"—"` siempre
- `0 + "1234567.89"` → `"01234567.89"` (concatenación de strings, no suma) → `calcYTD` devuelve basura
- `"2263373.00" + "413613.00"` → `"2263373.00413613.00"` → `applyBLGrouping` rompe los combinados

Arreglar este bug en el backend (3 líneas de config) repara automáticamente: YTDs, Desglose por línea, ARR por país, ARR por cuenta, consultores y Author combinado.

---

## BUGS CONFIRMADOS

### BUG-01 — YTD 2026 y YTD 2025 muestran "—" [CRÍTICO]

**Síntoma:** Las dos tarjetas YTD muestran "—" en lugar de cifras.

**Causa raíz:** `utils.ts:41` — `calcYTD` acumula `p.total_arr` sin castear a Number:
```javascript
.reduce((sum, p) => sum + (p.total_arr ?? 0), 0)
// p.total_arr = "7469379.00" (string Decimal)
// 0 + "7469379.00" = "07469379.00"  ← string concatenation, no suma
```
El resultado es un string basura. `formatEUR` recibe ese string, llama `Number.isFinite("07469379...")` = `false`, devuelve `"—"`.

**Ficheros:** `app/backend/api/schemas.py:41` (field type), `app/frontend/lib/utils.ts:41`

**Fix:** Ver Solución 1 (serialización Decimal) + añadir `Number()` en calcYTD como seguridad extra.

---

### BUG-02 — Desglose por línea: columnas YTD vacías [CRÍTICO]

**Síntoma:** La tabla "Mix de negocio / Desglose por linea" muestra "—" en ARR actual, YTD 2026, YTD 2025. El peso % aparece (NaN% para LMS & AIO combined).

**Causa raíz (doble):**
1. `formatEUR(arr)` donde `arr` = string Decimal → siempre devuelve "—"
2. `applyBLGrouping` en `utils.ts:129-132` suma strings con `+`:
   ```javascript
   const lms = result["SaaS LMS"] ?? 0;   // = "2333594.00" (string)
   const aio = result["SaaS AIO"] ?? 0;   // = "413613.00"  (string)
   result["LMS & AIO"] = lms + aio;       // = "2333594.00413613.00"  ← ROTO
   ```
   Esto explica el NaN% de LMS & AIO.

**Ficheros:** `app/backend/api/schemas.py:42`, `app/frontend/lib/utils.ts:129-132`, `app/frontend/components/ARRBreakdownTable.tsx`

---

### BUG-03 — ARR por país: todos 0 € [CRÍTICO]

**Síntoma:** Spain, Mexico, Colombia, Brazil muestran 0 €.

**Causa raíz:** `page.tsx:113-114`:
```javascript
const val = Number.isFinite(consultant.arr_total) ? consultant.arr_total : 0;
// consultant.arr_total = "7469379.00" (string Decimal)
// Number.isFinite("7469379.00") = false  ← strings no son números finitos
// val = 0  → todos los países suman 0
```

**Ficheros:** `app/backend/api/schemas.py:59`, `app/frontend/app/page.tsx:113`

---

### BUG-04 — ARR por cuenta: todas las celdas "—" [CRÍTICO]

**Síntoma:** La tabla de top clientes muestra "—" en todas las columnas de meses y ARR Actual. Los deltas (9882€, +7.7%) sí aparecen correctos.

**Causa raíz:** `ClientARRTable.tsx:122`:
```javascript
const val = acct.by_month[m] ?? 0;  // = "1234567.89" (string Decimal)
{val > 0 ? formatEUR(val) : <span>—</span>}
// "1234567.89" > 0 = true (coerción JS)
// formatEUR("1234567.89") → Number.isFinite("1234567.89") = false → "—"
```
Los deltas funcionan porque usan `-` aritmético que sí coerciona strings a números.

**Ficheros:** `app/backend/api/schemas.py:254`, `app/frontend/components/ClientARRTable.tsx:80-81, 122-126, 130`

---

### BUG-05 — Análisis por consultores: ranking vacío/incorrecto [CRÍTICO]

**Síntoma:** El ranking de consultores en el sidebar y la página de consultores no muestra cifras correctas.

**Causa raíz:** Mismo que BUG-03 — `arr_total` es string Decimal.

**Ficheros:** `app/backend/api/schemas.py:59`, `app/frontend/app/page.tsx:106`, `app/frontend/app/consultants/page.tsx`

---

### BUG-06 — Author combinado rompe el gráfico de líneas [ALTO]

**Síntoma:** Cuando se activa "combinar Author", la línea "Author (Total)" no se pinta correctamente.

**Causa raíz:** `applyBLGrouping` suma strings con `+` (concatenación en lugar de suma aritmética):
```javascript
const author = result["SaaS Author"] ?? 0;   // = "2263373.00"
const online = result["Author Online"] ?? 0;  // = "0" o 0
result["Author (Total)"] = author + online;   // = "2263373.000" o "2263373.000"
```
Recharts intenta renderizar "2263373.000" como valor Y — el parsing accidental puede dar valores erróneos.

**Ficheros:** `app/frontend/lib/utils.ts:135-141`

---

### BUG-07 — LMS & AIO desaparece en Feb 2025 [ALTO]

**Síntoma:** La línea LMS & AIO del gráfico de área cae a 0 alrededor de Feb 2025.

**Causa raíz (combinada):**
1. `applyBLGrouping` produce `"2333594.00413613.00"` (string basura) para LMS & AIO → Recharts no puede renderizar → cae a 0
2. Posible causa secundaria de datos: renovaciones/reclasificaciones en ese período

**Ficheros:** `app/frontend/lib/utils.ts:127-133`, `app/frontend/components/ARRChart.tsx:46-54`

---

### BUG-08 — Sin filtro encima de gráficas de distribución por cliente [MEDIO]

**Síntoma:** Las dos gráficas de distribución de clientes (barras apiladas y líneas) no tienen selector de línea de negocio. El filtro de la FilterBar no las afecta.

**Causa raíz:** Feature no implementada. La `accountQuery` en `page.tsx:76-87` no incluye `productType` en su queryKey ni en los parámetros de la llamada API. No hay UI de filtro.

**Ficheros:** `app/frontend/app/page.tsx:76-87, 285-286`

---

### BUG-09 — `ARRByAccountResponse.months` retorna `List[date]` en lugar de `List[str]` [MEDIO]

**Síntoma:** El backend retorna la lista de meses como objetos `date` (que Pydantic serializa como `"YYYY-MM-DD"` — esto SÍ funciona). Pero el tipo del schema es `List[date]` mientras el frontend espera `string[]`. No causa crash visible pero es una inconsistencia que puede romper en edge cases.

**Ficheros:** `app/backend/api/routes/arr.py:392`, `app/backend/api/schemas.py:262`

---

## CAUSA RAÍZ MAESTRA

**Localización:** `app/backend/api/schemas.py`

**Todos los modelos con campos `Decimal` necesitan configuración de serialización:**

| Schema | Campos Decimal afectados |
|--------|--------------------------|
| `ARRMonthPoint` | `total_arr`, `by_product_type` values, `mom_change` |
| `ConsultantARR` | `arr_total`, `by_product_type` values, `mom_change` |
| `AccountARR` | `total_arr`, `by_month` values, `first_month_arr`, `last_month_arr`, `delta` |
| `ARRByAccountResponse` | `total_arr` |

**Por qué funciona ARR Actual pero no los YTDs:** La tarjeta ARR Actual hace `formatEUR(Number(arr))` — explícitamente castea con `Number()`. El resto del código asume que el valor ya es number, lo que era cierto en Pydantic v1 pero no en v2.

---

## ESTRATEGIA DE REPARACIÓN V3

### Principio: Cirugía, no reescritura

Hay 2 bugs reales (el Decimal y el filtro de clientes) y no hay que tocar la arquitectura.

### Fase 1 — Fix Decimal en backend (1 fichero, 15 minutos)

**Fichero:** `app/backend/api/schemas.py`

Añadir `model_config` con serialización Decimal → float a todos los modelos afectados:

```python
from pydantic import ConfigDict

class ARRMonthPoint(BaseModel):
    model_config = ConfigDict(json_encoders={Decimal: float})
    month: date
    total_arr: Decimal
    # ...

class ConsultantARR(BaseModel):
    model_config = ConfigDict(json_encoders={Decimal: float})
    # ...

class AccountARR(BaseModel):
    model_config = ConfigDict(json_encoders={Decimal: float})
    # ...

class ARRByAccountResponse(BaseModel):
    model_config = ConfigDict(json_encoders={Decimal: float})
    # ...
```

Esto soluciona: BUG-01, BUG-02 (parcial), BUG-03, BUG-04, BUG-05, BUG-07 (parcial)

### Fase 2 — Fix applyBLGrouping en frontend (1 función, 5 minutos)

**Fichero:** `app/frontend/lib/utils.ts:121-143`

Añadir `Number()` al leer valores del diccionario:

```javascript
export function applyBLGrouping(
  byProductType: Record<string, number>,
  opts: { combineLmsAio: boolean; combineAuthor: boolean },
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(byProductType)) {
    result[k] = Number(v);  // ← casteo defensivo
  }

  if (opts.combineLmsAio) {
    const lms = result["SaaS LMS"] ?? 0;
    const aio = result["SaaS AIO"] ?? 0;
    delete result["SaaS LMS"];
    delete result["SaaS AIO"];
    result["LMS & AIO"] = lms + aio;  // ahora son numbers garantizados
  }
  // igual para combineAuthor
}
```

Esto soluciona: BUG-02 (completo), BUG-06, BUG-07

### Fase 3 — Fix calcYTD defensivo (1 función, 2 minutos)

**Fichero:** `app/frontend/lib/utils.ts:31-55`

```javascript
.reduce((sum, p) => sum + Number(p.total_arr ?? 0), 0)
// y en calcYTDByProductType:
.reduce((sum, p) => sum + Number(((p.by_product_type as Record<string, number>)[productType] ?? 0)), 0)
```

Esto soluciona: BUG-01 (extra seguridad aunque Fase 1 ya lo arregla)

### Fase 4 — Fix countryMix (2 líneas, 2 minutos)

**Fichero:** `app/frontend/app/page.tsx:113-114`

```javascript
const val = Number(consultant.arr_total);  // ← reemplaza la guarda con isFinite
totals.set(key, (totals.get(key) ?? 0) + (Number.isFinite(val) ? val : 0));
```

Esto soluciona: BUG-03 (extra seguridad aunque Fase 1 ya lo arregla)

### Fase 5 — Filtro por línea de negocio en gráficas de clientes (30 minutos)

**Fichero:** `app/frontend/app/page.tsx`

1. Añadir estado: `const [accountProductType, setAccountProductType] = useState("")`
2. Añadir `accountProductType` al queryKey de `accountQuery`
3. Añadir `product_type: accountProductType || undefined` al llamar `api.getARRByAccount`
4. Añadir un `<select>` o componente de filtro encima de las dos gráficas de distribución

---

## ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **Fase 1** (backend Decimal) → desbloquea todos los demás
2. **Fase 2** (applyBLGrouping) → arregla gráfico de líneas y desglose
3. **Fase 3 + 4** (calcYTD + countryMix) → defensa extra, rápido
4. Verificar en browser todos los bugs reportados
5. **Fase 5** (filtro clientes) → feature nueva, después de validar los fixes

---

## BUGS FUERA DE SCOPE V3 (baja prioridad)

- BUG-09: inconsistencia `List[date]` vs `List[str]` en schema (funciona pero es tech debt)
- Metodología "Fecha de Cierre" pendiente para `arr_by_consultant` (no usa esa lógica)
- Stripe MRR warning puede mostrar false positive si `currentMonth` ≠ formato en BD

---

## TESTS A EJECUTAR DESPUÉS DEL FIX

```bash
# Backend: unit tests
cd app && python -m pytest tests/ -v

# Frontend: verificar visualmente en browser
# 1. YTD 2026 y YTD 2025 muestran cifras (no "—")
# 2. Desglose por línea muestra ARR, YTD, % correctos  
# 3. ARR por país muestra valores > 0
# 4. Tabla ARR por cuenta muestra cifras en todas las celdas
# 5. Ranking consultores muestra cifras correctas
# 6. Gráfico líneas: LMS & AIO no cae a 0
# 7. Author combinado se pinta correctamente
```
