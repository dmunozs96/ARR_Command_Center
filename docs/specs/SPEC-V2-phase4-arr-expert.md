# SPEC-V2 Fase 4 — ARR Expert (IA embebida)

**Fase:** 4 de 4  
**Prioridad:** Alta  
**Dependencias:** P1 recomendada (para el endpoint by-account). P3 recomendada (para coherencia con agrupaciones).  
**Página nueva:** `/expert`  
**Entrada sidebar:** "ARR Expert" con icono `BrainCircuit` (lucide-react), estilo diferenciado (badge "Beta" o color acento)  
**API de IA:** Claude API de Anthropic (modelo: `claude-sonnet-4-6` por defecto)

---

## 1. Descripción funcional

El ARR Expert es un asistente de inteligencia artificial embebido en la aplicación. Actúa como experto en negocios SaaS, con conocimiento específico de e-learning, y responde preguntas sobre los datos de ARR de isEazy con acceso exclusivo a los datos reales del dashboard.

### Capacidades del asistente

- Responder preguntas en lenguaje natural sobre ARR, clientes, productos y tendencias
- Generar análisis cualitativos ("¿Por qué bajó el ARR de SaaS Skills en marzo?")
- Generar rankings ("Top 10 clientes de Author")
- Calcular variaciones entre periodos ("¿Cuánto creció el ARR total entre 2024 y 2025?")
- Identificar patrones y anomalías en los datos
- Proporcionar contexto de industria SaaS/e-learning

### Formato de respuesta

Las respuestas del asistente pueden contener tres tipos de bloques:
1. **Texto:** análisis narrativo, explicaciones, contexto
2. **Tabla:** datos tabulares renderizados como `<table>` HTML
3. **Gráfico:** visualización dinámica usando Recharts

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend /expert page                                          │
│                                                                  │
│  [Chat UI]                                                       │
│  Usuario escribe pregunta → POST /api/expert/chat               │
│  ← Respuesta SSE con bloques texto/tabla/gráfico                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend POST /api/expert/chat                                  │
│                                                                  │
│  1. Recibe pregunta + historial                                  │
│  2. Llama a Claude API con:                                      │
│     - System prompt (experto SaaS + instrucciones de formato)   │
│     - Historial de conversación                                  │
│     - Tool definitions (consultas a BD)                         │
│  3. Claude llama tools según necesite                            │
│  4. Las tools consultan la BD local                              │
│  5. Claude genera respuesta final con bloques                    │
│  6. Streameamos la respuesta al frontend                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Base de datos PostgreSQL                                        │
│  arr_line_items, product_classifications, snapshot_stripe_mrr  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend

### Nuevo archivo: `app/backend/api/routes/expert.py`

#### Endpoint: `POST /api/expert/chat`

**Request body:**

```python
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ExpertChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []
    snapshot_id: Optional[UUID] = None
    # Estado de agrupaciones activas del usuario (de P3)
    combine_lms_aio: bool = False
    combine_author: bool = False
```

**Response:** `text/event-stream` (SSE — Server-Sent Events) o JSON simple

> **Decisión de implementación:** Para V2 inicial, usar **JSON simple** (no streaming) para reducir complejidad. El streaming SSE puede añadirse en una iteración posterior. El endpoint bloquea hasta obtener respuesta completa y devuelve un JSON.

**Response body:**

```python
class ExpertResponseBlock(BaseModel):
    type: Literal["text", "table", "chart"]
    # Para type="text":
    content: Optional[str] = None
    # Para type="table":
    table_title: Optional[str] = None
    columns: Optional[List[str]] = None         # encabezados
    rows: Optional[List[List[str]]] = None      # filas como arrays de strings
    # Para type="chart":
    chart_type: Optional[Literal["bar", "line", "area"]] = None
    chart_title: Optional[str] = None
    chart_data: Optional[List[Dict[str, Any]]] = None  # formato Recharts
    x_key: Optional[str] = None
    data_keys: Optional[List[str]] = None
    colors: Optional[List[str]] = None

class ExpertChatResponse(BaseModel):
    blocks: List[ExpertResponseBlock]
    tokens_used: int
    model: str
```

### System prompt del ARR Expert

```
Eres el ARR Expert de isEazy, una empresa de e-learning B2B con sede en España.
Actúas como un experto en negocios SaaS especializado en e-learning.

Tu rol es analizar datos de ARR (Annual Recurring Revenue) de isEazy y proporcionar
insights accionables al equipo financiero.

CONTEXTO DE NEGOCIO DE ISEAZY:
- isEazy tiene varias líneas de producto:
  - SaaS LMS: plataforma de gestión de aprendizaje
  - SaaS AIO (All In One): solución LMS + creación de contenido
  - SaaS Author: herramienta de autoría de contenido e-learning (offline)
  - Author Online (Stripe): versión online/SaaS de Author, facturación por Stripe
  - SaaS Engage: herramienta de comunicación interna
  - SaaS Skills: plataforma de gestión de competencias
- Todo el ARR está en EUR
- Los datos provienen de Salesforce (líneas SaaS) y Stripe (Author Online)
- El ARR se calcula anualizando los contratos activos en cada mes

INSTRUCCIONES DE RESPUESTA:
1. Basa SIEMPRE tus respuestas exclusivamente en los datos disponibles en las tools.
   Nunca inventes datos ni extrapoles sin advertirlo claramente.
2. Cuando respondas con datos numéricos, incluye SIEMPRE una tabla para claridad.
3. Cuando sea relevante, incluye un gráfico para visualizar tendencias.
4. Ofrece contexto de industria SaaS cuando sea útil (benchmarks de churn, crecimiento, etc.)
   pero diferenciando claramente lo que son datos reales vs. conocimiento de industria.
5. Si el usuario pregunta algo que no puedes responder con los datos disponibles,
   dilo explícitamente en lugar de especular.
6. Responde siempre en español.
7. Sé conciso pero completo. Prioriza insights accionables.

FORMATO DE SALIDA:
Tu respuesta debe ser un JSON con la siguiente estructura:
{
  "blocks": [
    {"type": "text", "content": "...análisis narrativo..."},
    {"type": "table", "table_title": "...", "columns": [...], "rows": [[...], ...]},
    {"type": "chart", "chart_type": "bar|line", "chart_title": "...",
     "chart_data": [...], "x_key": "...", "data_keys": [...]}
  ]
}
Incluye solo los bloques necesarios para la respuesta. El texto siempre primero.
```

### Tools disponibles para el experto

Claude usará Anthropic tool use para consultar la BD. Definir en `expert.py`:

```python
EXPERT_TOOLS = [
    {
        "name": "get_arr_summary",
        "description": "Obtiene ARR mensual por tipo de producto para un rango de fechas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month_from": {"type": "string", "description": "YYYY-MM-DD"},
                "month_to": {"type": "string", "description": "YYYY-MM-DD"},
                "product_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Lista de tipos de producto a filtrar. Si vacío, devuelve todos."
                },
                "mode": {"type": "string", "enum": ["from_start", "from_close"]}
            }
        }
    },
    {
        "name": "get_top_accounts",
        "description": "Obtiene los N clientes con mayor ARR en un periodo.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month_from": {"type": "string", "description": "YYYY-MM-DD"},
                "month_to": {"type": "string", "description": "YYYY-MM-DD"},
                "product_types": {"type": "array", "items": {"type": "string"}},
                "limit": {"type": "integer", "description": "Número de cuentas a devolver. Default 10."}
            }
        }
    },
    {
        "name": "get_arr_mom_changes",
        "description": "Obtiene variaciones mes a mes del ARR, con detalle de qué clientes o productos variaron más.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month": {"type": "string", "description": "Mes a analizar YYYY-MM-DD"},
                "product_types": {"type": "array", "items": {"type": "string"}}
            }
        }
    },
    {
        "name": "get_stripe_mrr",
        "description": "Obtiene datos de Stripe MRR (Author Online) para un rango de fechas.",
        "input_schema": {
            "type": "object",
            "properties": {
                "month_from": {"type": "string"},
                "month_to": {"type": "string"}
            }
        }
    },
    {
        "name": "get_data_quality_summary",
        "description": "Obtiene un resumen de alertas de calidad de datos del snapshot activo.",
        "input_schema": {
            "type": "object",
            "properties": {
                "include_reviewed": {"type": "boolean", "default": False}
            }
        }
    }
]
```

Cada tool llama a los endpoints internos o directamente a la lógica de BD ya existente (reutilizando las funciones de `arr_calculator.py` y los modelos SQLAlchemy).

### Gestión del API key de Claude

- El API key se configura como variable de entorno: `ANTHROPIC_API_KEY`
- Ya debe estar en `.env` si se usa la misma instancia de Claude Code
- El backend usa el SDK oficial: `pip install anthropic` (añadir a `requirements.txt`)
- Modelo por defecto: `claude-sonnet-4-6`

### Migración de base de datos (opcional)

Si se quiere persistir el historial de conversaciones:

```python
# app/backend/db/migrations/0006_add_expert_conversations.py

# Tabla: expert_conversations
# Columnas: id (UUID), created_at, snapshot_id (FK), messages (JSONB)
```

En V2 inicial, el historial puede ser solo en memoria de frontend (no persistido). La migración es opcional.

---

## 4. Frontend

### Nuevo archivo: `app/frontend/app/expert/page.tsx`

#### Layout de la página

```
┌──────────────────────────────────────────────────────────────┐
│  Header: "ARR Expert"  [badge: Beta]                         │
│  Subtítulo: "Pregunta cualquier cosa sobre los datos de ARR" │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ÁREA DE CONTEXTO (collapsable)                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Snapshot activo: [fecha] · [N registros]               │  │
│  │ Periodo disponible: [mes inicio] — [mes fin]           │  │
│  │ Agrupaciones activas: LMS+AIO ✓ · Author completo ✗   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  PREGUNTAS SUGERIDAS (carrusel horizontal, desaparecen       │
│  una vez el usuario envía el primer mensaje)                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────┐  │
│  │ Top 10 clientes  │ │ Variación ARR    │ │ ¿Por qué    │  │
│  │ de SaaS LMS      │ │ Skills en 2025   │ │ bajó Author │  │
│  │ este mes         │ │                  │ │ en marzo?   │  │
│  └──────────────────┘ └──────────────────┘ └─────────────┘  │
│                                                              │
│  HISTORIAL DE CONVERSACIÓN                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [Usuario] ¿Cuál es el top 5 de Author?                 │  │
│  │                                                        │  │
│  │ [Expert] Aquí tienes el top 5 de clientes de SaaS     │  │
│  │          Author por ARR en el último mes disponible:  │  │
│  │                                                        │  │
│  │  ┌───────────────────────────────────────────────┐    │  │
│  │  │ Tabla: Top 5 clientes SaaS Author             │    │  │
│  │  │ #  │ Cliente          │ ARR mensual  │ Total  │    │  │
│  │  │ 1  │ Empresa ABC      │ 45.000 €     │ ...    │    │  │
│  │  └───────────────────────────────────────────────┘    │  │
│  │                                                        │  │
│  │  [Gráfico de barras: Top 5 Author]                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  INPUT                                                       │
│  ┌────────────────────────────────────────┐ ┌────────────┐  │
│  │ Escribe tu pregunta...                 │ │  Enviar ▶  │  │
│  └────────────────────────────────────────┘ └────────────┘  │
│  [Botón: Nueva conversación]                                 │
└──────────────────────────────────────────────────────────────┘
```

### Preguntas sugeridas (hardcoded en el componente)

```typescript
const SUGGESTED_QUESTIONS = [
  "¿Cuál es el top 10 de clientes de Author este mes?",
  "¿Cuánto ha crecido el ARR total de LMS en los últimos 6 meses?",
  "¿Por qué varió el ARR de Skills entre enero y junio de 2025?",
  "¿Qué clientes tienen mayor riesgo de churn basándome en la evolución de su ARR?",
  "Dame un resumen ejecutivo del ARR de isEazy a fecha de hoy",
  "¿Cuál es la distribución de ARR por línea de negocio actualmente?",
  "¿Qué alertas de calidad de datos están pendientes de revisión?",
];
```

### Componente de renderizado de respuesta: `ExpertResponseRenderer.tsx`

```typescript
// Renderiza los bloques de respuesta del experto

interface Props {
  blocks: ExpertResponseBlock[];
}

export function ExpertResponseRenderer({ blocks }: Props) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "text") {
          return <MarkdownText key={i} content={block.content} />;
        }
        if (block.type === "table") {
          return <ExpertTable key={i} {...block} />;
        }
        if (block.type === "chart") {
          return <ExpertChart key={i} {...block} />;
        }
      })}
    </div>
  );
}
```

### `ExpertTable.tsx`
- Renderiza `columns` y `rows` como `<table>` HTML con estilos Tailwind
- Números formateados como EUR (`Intl.NumberFormat`)
- Encabezados en bold, filas alternadas con fondo claro

### `ExpertChart.tsx`
- Recharts `<BarChart>` o `<LineChart>` según `chart_type`
- Construye las `<Bar>` o `<Line>` dinámicamente a partir de `data_keys`
- Usa `ACCOUNT_COLORS` o `PRODUCT_TYPE_COLORS` si los keys coinciden
- Fallback a una paleta por defecto si las claves no se reconocen
- `<ResponsiveContainer width="100%" height={300}>`

### Gestión del estado de conversación

```typescript
// Estado local en page.tsx
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;              // texto plano del mensaje de usuario
  blocks?: ExpertResponseBlock[]; // bloques del asistente
  isLoading?: boolean;
  error?: string;
}

const [messages, setMessages] = useState<Message[]>([]);
const [inputValue, setInputValue] = useState("");
const [isLoading, setIsLoading] = useState(false);
```

### Llamada a la API desde el frontend

Añadir en `app/frontend/lib/api.ts`:

```typescript
expertChat: (data: {
  message: string;
  conversation_history: { role: "user" | "assistant"; content: string }[];
  snapshot_id?: string;
  combine_lms_aio?: boolean;
  combine_author?: boolean;
}) =>
  client
    .post<ExpertChatResponse>("/expert/chat", data)
    .then((r) => r.data),
```

Añadir tipos en `app/frontend/lib/types.ts`:

```typescript
export interface ExpertResponseBlock {
  type: "text" | "table" | "chart";
  content?: string;
  table_title?: string;
  columns?: string[];
  rows?: string[][];
  chart_type?: "bar" | "line" | "area";
  chart_title?: string;
  chart_data?: Record<string, unknown>[];
  x_key?: string;
  data_keys?: string[];
  colors?: string[];
}

export interface ExpertChatResponse {
  blocks: ExpertResponseBlock[];
  tokens_used: number;
  model: string;
}
```

---

## 5. Registro del router en el backend

Añadir en `app/backend/main.py`:

```python
from app.backend.api.routes import expert

app.include_router(expert.router, prefix="/api/expert", tags=["expert"])
```

---

## 6. Variable de entorno requerida

Añadir al `.env` del proyecto:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Y documentar en el README que esta variable es necesaria para la funcionalidad ARR Expert.

---

## 7. Consideraciones de seguridad

- El endpoint `/api/expert/chat` no debe exponer el API key al cliente
- El `message` del usuario no debe pasarse directamente como parte del system prompt (ya está en el array `messages`, no en el system)
- Limitar la longitud del `message` a 2000 caracteres en el servidor para evitar abusos
- El historial de conversación tiene un límite de 20 mensajes antes de truncar (enviar solo los últimos 20)
- No registrar en logs el contenido completo de las conversaciones (puede contener datos financieros sensibles)

---

## 8. Criterios de aceptación

- [ ] La página `/expert` es accesible desde el sidebar con el icono `BrainCircuit`
- [ ] Al cargar la página, se muestran las preguntas sugeridas
- [ ] El usuario puede escribir una pregunta y recibir respuesta en < 15 segundos
- [ ] Las respuestas con datos numéricos incluyen siempre una tabla
- [ ] Las tablas están correctamente formateadas con valores en EUR
- [ ] Los gráficos son interactivos (tooltip al hover)
- [ ] El historial de conversación persiste durante la sesión (navegar a otro tab y volver no borra el historial)
- [ ] El botón "Nueva conversación" limpia el historial correctamente
- [ ] Si Claude no puede responder por falta de datos, la respuesta lo indica claramente en español
- [ ] Si el API key no está configurado, el endpoint devuelve un error 503 con mensaje claro
- [ ] Las preguntas sugeridas desaparecen una vez el usuario envía su primer mensaje
- [ ] El estado de "pensando..." (loading) es visible mientras se procesa la respuesta
- [ ] La respuesta respeta las agrupaciones de BL activas (P3): si está activado "LMS & AIO", el experto habla de esa combinación
