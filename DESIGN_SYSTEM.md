# Design System — isEazy Financial Dashboards

Spec de diseño extraído del ARR Command Center. Úsalo como base para cualquier nuevo proyecto de visualización de datos en el mismo entorno visual.

---

## 1. Identidad visual

El sistema está construido sobre una identidad **purple-first**: el morado es el color dominante de la marca, con acentos funcionales en verde menta, coral y ámbar. El tono general es **limpio, moderno y de alta densidad de información** — datos densos presentados con mucho espacio en blanco y sin ornamentos superfluos.

---

## 2. Paleta de colores

### Colores base

| Token | Hex | Uso |
|---|---|---|
| Brand Primary | `#6d35ff` | Botones, activos, accentos, iconos primarios |
| Brand Dark | `#2f185f` | Sidebar, footer de tablas, texto fuerte |
| Brand Soft | `#efe9ff` | Hover, fondos secundarios |
| Background | `#f7f5fb` | Fondo de página |
| Surface | `#ffffff` | Fondo de tarjetas y contenido |
| Surface Tint | `#fbfaff` | Superficies alternativas, inputs |
| Surface Accent | `#f4f0fb` | Iconos inactivos, superficies terciarias |

### Texto

| Token | Hex | Uso |
|---|---|---|
| Foreground | `#151229` | Texto principal, headings |
| Muted | `#6f6a80` | Texto secundario, ayuda |
| Muted Light | `#837a9f` | Labels, captions, hints |
| Disabled | `#d1cde8` | Texto deshabilitado |

### Bordes y líneas

| Token | Hex | Uso |
|---|---|---|
| Border | `#e7e1f2` | Bordes de tarjetas, separadores |
| Border Light | `#eee8f8` | Divisores internos en tarjetas |
| Divider Body | `#f0ebf8` | Separadores entre filas de tabla |

### Semánticos / funcionales

| Token | Hex | Uso |
|---|---|---|
| Positive | `#20c7a8` | Valores positivos, KPIs buenos |
| Negative | `#ff5f57` | Valores negativos, alertas |
| Warning | `#ffb020` | Advertencias, highlights |
| Success Text | `#0c8f76` | Texto en estado success |
| Error Text | `#d03932` | Texto en estado error |

### Estados de alerta (fondo + borde + texto)

| Estado | Fondo | Borde | Texto |
|---|---|---|---|
| Success | `#e9fbf7` | `#bfefe4` | `#0c8f76` |
| Warning | `#fff7e7` | `#ffe2a8` | `#946300` |
| Error | `#fff0ef` | `#ffd0cd` | `#b82f2a` |
| Info | `#eefaff` | `#cbeeff` | `#006f94` |

### Paleta de gráficas (productos / series)

```
#6d35ff  →  SaaS LMS / primario
#00a7d8  →  SaaS AIO / cian
#ff5f57  →  SaaS Author / rojo
#ffb020  →  Author Online / ámbar
#c83cff  →  SaaS Engage / magenta
#20c7a8  →  SaaS Skills / menta
#3557ff  →  TaaS / azul
#837a9f  →  Implementación / gris-morado
#6f6a80  →  Otros / neutro
```

### Paleta extendida (top cuentas / multi-entidad, 20 colores)

```
#6d35ff  #f59e0b  #10b981  #ef4444  #3b82f6
#8b5cf6  #f97316  #06b6d4  #84cc16  #ec4899
#14b8a6  #a855f7  #eab308  #22c55e  #0ea5e9
#f43f5e  #64748b  #78716c  #6b7280  #9ca3af
```

---

## 3. Tipografía

### Familia

- **Principal:** `"Inter"`, `"Segoe UI"`, `"Helvetica Neue"`, Arial, sans-serif
- **Monoespaciada:** `"Cascadia Code"`, `"Consolas"`, monospace

### Pesos y usos

| Peso | Tailwind | Uso |
|---|---|---|
| 900 (Black) | `font-black` | KPI values, labels uppercase, headers de tabla, footers |
| 700 (Bold) | `font-bold` | Subheadings, datos de tabla |
| 600 (Semibold) | `font-semibold` | Texto de cuerpo, navegación |
| 500 (Medium) | `font-medium` | Texto de soporte |

### Tamaños

| Clase Tailwind | px | Uso típico |
|---|---|---|
| `text-xs` | 12px | Labels, captions, headers de tabla |
| `text-sm` | 14px | Cuerpo secundario, celdas de tabla |
| `text-base` | 16px | Cuerpo estándar |
| `text-lg` | 18px | Títulos de sección |
| `text-xl` | 20px | Subtítulos de módulo |
| `text-2xl` | 24px | Valores KPI secundarios |
| `text-3xl` | 30px | Valores KPI principales |

### Letter-spacing para labels uppercase

```
tracking-[0.16em]   →  labels de KPI cards
tracking-[0.12em]   →  headers de tabla
tracking-[0.18em]   →  labels de sidebar
tracking-tight      →  headings grandes (reduce spacing)
```

**Regla:** Los labels en uppercase siempre llevan `font-black` + `tracking-[0.16em]` + `text-xs`.

---

## 4. Espaciado

### Gaps entre elementos

| Clase | Uso |
|---|---|
| `gap-2` | Mínimo (iconos, inline) |
| `gap-3` | Estándar entre ítems de mismo nivel |
| `gap-4` | Grids de tarjetas |
| `gap-6` | Separación entre secciones mayores |

### Padding interno de contenedores

| Clase | Uso |
|---|---|
| `p-3` | Compacto (filtros secundarios) |
| `p-4` | Barras de filtro, formularios |
| `p-5` | Tarjetas estándar ✓ más común |
| `p-6` | Headers de tabla, contenido grande |

### Celdas de tabla

- Compacta: `px-4 py-3`
- Estándar: `px-5 py-4`

---

## 5. Bordes y esquinas

| Clase | Radio | Uso |
|---|---|---|
| `rounded-full` | 9999px | Badges pill, estados circulares |
| `rounded-lg` | 8px | Inputs pequeños |
| `rounded-xl` | 12px | Ítems de navegación, toggles |
| `rounded-2xl` | 16px | Botones, alertas pequeñas, header sidebar |
| `rounded-3xl` | 24px | **Tarjetas principales** — el radio estándar del sistema |

> **Regla de oro:** Toda tarjeta/panel usa `rounded-3xl`. Solo los elementos dentro de las tarjetas usan radios menores.

---

## 6. Sombras

| Token | Valor CSS | Uso |
|---|---|---|
| Card Standard | `0 18px 50px rgba(49,24,95,0.06)` | Tarjetas normales |
| Card Hover | `0 24px 60px rgba(49,24,95,0.12)` | Hover de tarjetas interactivas |
| Sidebar | `8px 0 30px rgba(49,24,95,0.06)` | Panel lateral |
| Brand Badge | `shadow-lg shadow-[#6d35ff]/15` | Elementos de marca |
| Subtle | `shadow-sm` | Elementos pequeños |

El color base de la sombra es siempre `rgba(49, 24, 95, ...)` — el tono del Brand Dark. Esto unifica el sistema aunque el fondo sea blanco.

---

## 7. Componentes

### KPI Card

```
Container:  rounded-3xl border border-[#e7e1f2] bg-white p-5
            shadow-[0_18px_50px_rgba(49,24,95,0.08)]
            transition hover:-translate-y-0.5
            hover:shadow-[0_24px_60px_rgba(49,24,95,0.12)]

Label:      text-xs font-black uppercase tracking-[0.16em] text-[#837a9f]
Value:      text-3xl font-black tracking-tight text-[#151229]
Detail:     text-sm leading-5 text-[#6f6a80]
Icon box:   h-11 w-11 rounded-2xl text-white [bg = accent color]
```

Grid: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`

### Panel / Sección

```
Container:  rounded-3xl border border-[#e7e1f2] bg-white
            shadow-[0_18px_50px_rgba(49,24,95,0.06)]

Header:     border-b border-[#eee8f8] px-5 py-4
  Label:    text-xs font-black uppercase tracking-[0.16em] text-[#6d35ff]
  Title:    text-xl font-black tracking-tight text-[#151229]

Body:       p-5 o p-6
```

### Tabla

```
Container:  overflow-hidden rounded-3xl border border-[#e7e1f2] bg-white
            shadow-[0_18px_50px_rgba(49,24,95,0.06)]

Header row: bg-[#fbfaff]
  Cell:     text-xs font-black uppercase tracking-[0.12em] text-[#837a9f]
            px-5 py-4

Body rows:  divide-y divide-[#f0ebf8]
  Row:      transition hover:bg-[#fbfaff]
  Cell:     px-5 py-3 text-sm

Footer row: bg-[#2f185f] text-white font-black
```

### Botón estándar

```
rounded-2xl border border-[#e7e1f2] bg-[#fbfaff] px-4 py-2
text-sm font-black text-[#2f185f]
transition hover:border-[#6d35ff]
inline-flex items-center justify-center gap-2 h-10
```

### Input / Select

```
Estándar:  h-12 rounded-2xl px-4 border border-[#e7e1f2] bg-[#fbfaff]
           text-sm font-semibold text-[#151229]
           focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10
           disabled:cursor-not-allowed disabled:opacity-60

Compacto:  h-10 rounded-xl px-3
```

### Navegación lateral (ítem)

```
Inactive:  rounded-xl px-3 py-3 text-sm font-semibold
           text-[#6f6a80] hover:bg-[#f7f3ff] hover:text-[#2f185f]
  Icon:    h-9 w-9 rounded-lg bg-[#f4f0fb] text-[#6d35ff]

Active:    bg-[#efe9ff] text-[#2f185f] shadow-sm
  Icon:    h-9 w-9 rounded-lg bg-[#6d35ff] text-white
```

### Barra lateral (contenedor)

```
sticky top-0 h-screen w-80 overflow-y-auto
border-r border-[#e7e1f2]
bg-white/90 backdrop-blur
px-4 py-5
shadow-[8px_0_30px_rgba(49,24,95,0.06)]
hidden xl:flex flex-col
```

Header de la sidebar:
```
rounded-2xl bg-[#2f185f] p-4 text-white shadow-lg shadow-[#6d35ff]/15
  App icon: h-10 w-10 rounded-xl bg-white text-[#6d35ff]
  Title:    text-lg font-black tracking-tight
  Subtitle: text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d8caff]
```

### Barra de filtros

```
rounded-3xl p-4 border border-[#e7e1f2] bg-white
shadow-[0_18px_50px_rgba(49,24,95,0.06)]
grid gap-3 grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr]
```

### Alerta / Banner

```
Éxito:     rounded-3xl border border-[#bfefe4] bg-[#e9fbf7] p-5
Warning:   rounded-3xl border border-[#ffe2a8] bg-white p-5
Error:     rounded-3xl border border-[#ffd0cd] bg-[#fff0ef] p-5
Info:      rounded-3xl border border-[#cbeeff] bg-[#eefaff] p-5
```

### Toggle

```
Container: inline-flex h-5 w-9 items-center rounded-full transition-colors
  On:      bg-[#6d35ff]
  Off:     bg-[#d8d0f0]
Handle:    h-4 w-4 rounded-full bg-white shadow transition-transform
  On:      translate-x-[18px]
  Off:     translate-x-0.5
```

### Loading spinner

```
h-10 w-10 animate-spin rounded-full
border-4 border-[#efe9ff] border-t-[#6d35ff]
```

### Skeleton (loading state)

```
Card:      h-40 animate-pulse rounded-3xl border border-[#e7e1f2] bg-white p-5
  Label:   h-4 w-28 rounded bg-[#eee8f8]
  Value:   h-8 w-40 rounded bg-[#e4dcf1]
  Detail:  h-3 w-32 rounded bg-[#f2eef8]

Table row: h-12 rounded-2xl bg-[#f4f0fb] (multiple con space-y-3)
```

---

## 8. Gráficas (Recharts)

### Configuración base

```jsx
// Grid
<CartesianGrid stroke="#eee8f8" strokeDasharray="4 6" vertical={false} />

// Ejes
<XAxis tick={{ fontSize: 12, fill: "#837a9f", fontWeight: 600 }}
       tickLine={false} axisLine={false} />
<YAxis tick={{ fontSize: 12, fill: "#837a9f", fontWeight: 600 }}
       tickLine={false} axisLine={false} width={78} />

// Tooltip
<Tooltip
  contentStyle={{
    fontSize: 12,
    borderRadius: 18,
    border: "1px solid #e7e1f2",
    boxShadow: "0 18px 50px rgba(49,24,95,0.12)"
  }}
  labelStyle={{ color: "#151229", fontWeight: 800 }}
/>

// Leyenda
<Legend iconType="circle"
        wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }} />
```

### Gradientes para área charts

```jsx
<defs>
  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%"  stopColor="#6d35ff" stopOpacity={0.28} />
    <stop offset="95%" stopColor="#6d35ff" stopOpacity={0.02} />
  </linearGradient>
</defs>
<Area stroke="#6d35ff" strokeWidth={3} fill="url(#areaGrad)" />
```

### Alturas estándar de contenedores de gráfica

| Tipo | Altura |
|---|---|
| Chart principal (área/barra grande) | `h-[420px]` |
| Chart mediano | `h-[380px]` |
| Chart pequeño | `h-[260px]` |
| Sparkline / mini | `h-[200px]` |

### Márgenes estándar

```js
margin={{ top: 8, right: 20, bottom: 8, left: 0 }}
```

---

## 9. Fondo de página

```css
background:
  radial-gradient(circle at top left, rgba(109, 53, 255, 0.12), transparent 30rem),
  linear-gradient(180deg, #fbfaff 0%, #f5f1fb 52%, #ffffff 100%);
```

---

## 10. Grids de layout

| Patrón | Clase Tailwind |
|---|---|
| KPI cards 3 col | `grid gap-4 md:grid-cols-2 xl:grid-cols-3` |
| Alertas 3 col | `grid gap-3 lg:grid-cols-3` |
| Dos columnas (ancha + estrecha) | `grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]` |
| Layout página con sidebar | `flex` — sidebar `w-80 hidden xl:flex` + main `flex-1` |

---

## 11. Iconos

- Librería: **Lucide React**
- Tamaño habitual: `size={16}` a `size={22}`
- Stroke width: `strokeWidth={2.4}` (énfasis), `strokeWidth={2}` (default)
- Los iconos se envuelven en un contenedor `flex items-center justify-center`

---

## 12. Responsive breakpoints

| Breakpoint | Ancho | Uso principal |
|---|---|---|
| sm | 640px | Single column → flex row |
| md | 768px | 2 columnas en grids |
| lg | 1024px | Multi-columna en filtros |
| xl | 1280px | 3 columnas, sidebar visible |

---

## 13. Reglas de diseño resumidas

1. **Tarjetas siempre `rounded-3xl`** — sin excepciones para el contenedor exterior.
2. **Sombra única:** `0 18px 50px rgba(49,24,95,0.06)` — el mismo valor en todos los cards.
3. **Labels siempre uppercase + `font-black` + `tracking-[0.16em]` + `text-xs`.**
4. **KPI values: `font-black text-3xl tracking-tight text-[#151229]`.**
5. **Footer de tablas: `bg-[#2f185f] text-white font-black`** — siempre oscuro.
6. **Colores inline con sintaxis de valores arbitrarios de Tailwind** (`text-[#6d35ff]`) — no en config.
7. **No hay dark mode** — sistema de tema único light.
8. **Hover en tarjetas interactivas:** `-translate-y-0.5` + sombra más intensa.
9. **El fondo del sidebar tiene `backdrop-blur` + `bg-white/90`** para efecto glass.
10. **Sidebar visible solo en `xl`** (`hidden xl:flex`).
