# Guía para Construir el Proyecto desde Cero
**Audiencia:** Persona con conocimientos técnicos básicos o nulos, trabajando con asistencia de IA
**Fecha:** 2026-04-17

Esta guía es **secuencial**. Sigue los pasos en orden. Cada sección tiene un ✅ checkpoint para verificar que todo va bien antes de continuar.

---

## Parte 0: Preparación del entorno

### Paso 0.1: Instalar software necesario

Necesitas instalar estas herramientas en tu ordenador. Cada una tiene un instalador estándar que puedes descargar de su web oficial:

1. **Python 3.11 o superior**
   - Web: https://python.org/downloads
   - Durante la instalación, marca la casilla "Add Python to PATH"
   - Para verificar: abre la terminal y escribe `python --version` → debe mostrar "Python 3.11.x"

2. **Node.js 18 o superior**
   - Web: https://nodejs.org (descarga la versión LTS)
   - Para verificar: `node --version` → debe mostrar "v18.x.x"

3. **Docker Desktop**
   - Web: https://www.docker.com/products/docker-desktop
   - Necesario para levantar la base de datos PostgreSQL fácilmente
   - Para verificar: abre Docker Desktop y debe mostrar el icono en verde

4. **Visual Studio Code** (editor de código)
   - Web: https://code.visualstudio.com
   - Instala las extensiones: Python, ESLint, Prettier

5. **Git** (control de versiones)
   - Web: https://git-scm.com
   - Para verificar: `git --version`

> ℹ️ **Qué es la terminal:** Es una ventana negra (o azul) donde escribes comandos. En Windows: busca "PowerShell" o "Git Bash" en el menú inicio. En Mac: busca "Terminal".

✅ **Checkpoint 0:** `python --version`, `node --version`, `docker --version` muestran versiones sin error.

---

## Parte 1: Preparar el repositorio

### Paso 1.1: Clonar el repositorio (si no lo tienes ya)

```bash
cd C:\Users\TuNombre\Documents
git clone https://github.com/tuorganizacion/ARR_Command_Center
cd ARR_Command_Center
```

O si ya tienes el repositorio, abrirlo en VS Code:
```bash
code "C:\Users\TuNombre\Documents\ARR_Command_Center"
```

### Paso 1.2: Leer el estado actual del proyecto

Antes de hacer cualquier cosa, lee estos archivos:
- `docs/handover/CURRENT_STATE.md` — qué está hecho
- `docs/handover/NEXT_STEPS.md` — qué hay que hacer

✅ **Checkpoint 1:** Tienes el repo abierto en VS Code y has leído el estado actual.

---

## Parte 2: Configurar el backend (Python/FastAPI)

### Paso 2.1: Crear el entorno virtual de Python

Un "entorno virtual" es como una caja donde instalamos las librerías de Python para este proyecto, sin mezclarlas con otras.

```bash
# Desde la raíz del proyecto
cd app/backend
python -m venv venv

# Activar el entorno virtual
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

# Verás que el prompt cambia a: (venv) C:\...
```

### Paso 2.2: Instalar las dependencias de Python

```bash
# Con el entorno virtual activado:
pip install fastapi uvicorn sqlalchemy alembic psycopg2-binary python-dotenv simple-salesforce pytest httpx
```

> ℹ️ Esto puede tardar 2-3 minutos. Estás descargando todas las librerías que el proyecto necesita.

### Paso 2.3: Crear el archivo .env

El archivo `.env` contiene las "contraseñas" y configuraciones del proyecto. NUNCA se sube a Git.

Copia el archivo de ejemplo:
```bash
cp ../../.env.example .env
```

Abre `.env` en VS Code y rellena los valores:
```
# Base de datos
DATABASE_URL=postgresql://arruser:arrpass@localhost:5432/arrdb

# Salesforce (rellena cuando tengas credenciales)
SF_CLIENT_ID=
SF_CLIENT_SECRET=
SF_USERNAME=
SF_PASSWORD=
SF_SECURITY_TOKEN=
SF_INSTANCE_URL=https://iseazy.lightning.force.com
```

✅ **Checkpoint 2:** No hay errores al ejecutar `pip install`. El archivo `.env` existe.

---

## Parte 3: Levantar la base de datos con Docker

### Paso 3.1: Iniciar PostgreSQL con Docker Compose

```bash
# Desde la raíz del proyecto
docker-compose up -d postgres
```

> ℹ️ Este comando descarga PostgreSQL (solo la primera vez) y lo inicia como un proceso en segundo plano. La opción `-d` significa "en background".

### Paso 3.2: Verificar que la BD está funcionando

```bash
docker-compose ps
```
Debe mostrar `postgres` con estado `Up`.

### Paso 3.3: Crear las tablas en la base de datos

```bash
cd app/backend
# Con el entorno virtual activado
alembic upgrade head
```

> ℹ️ Alembic es la herramienta que crea las tablas en la BD según el modelo de datos definido en `docs/specs/07_data_model_draft.md`.

✅ **Checkpoint 3:** `docker-compose ps` muestra postgres en estado `Up`. `alembic upgrade head` termina sin errores.

---

## Parte 4: Arrancar el backend

### Paso 4.1: Iniciar el servidor FastAPI

```bash
cd app/backend
# Con el entorno virtual activado
uvicorn main:app --reload --port 8000
```

> ℹ️ `--reload` significa que el servidor se reinicia automáticamente cuando cambias el código. Muy útil durante el desarrollo.

### Paso 4.2: Verificar que el backend funciona

Abre el navegador en: `http://localhost:8000/docs`

Debes ver la documentación automática de la API (Swagger UI). Esto significa que el backend está funcionando.

✅ **Checkpoint 4:** `http://localhost:8000/docs` carga sin error y muestra los endpoints disponibles.

---

## Parte 5: Configurar el frontend (React/Next.js)

### Paso 5.1: Instalar las dependencias de Node.js

```bash
cd app/frontend
npm install
```

> ℹ️ Esto puede tardar 3-5 minutos. Descarga las librerías de JavaScript.

### Paso 5.2: Crear el archivo de configuración del frontend

```bash
cp .env.example .env.local
```

Edita `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Paso 5.3: Arrancar el frontend

```bash
npm run dev
```

Abre el navegador en: `http://localhost:3000`

✅ **Checkpoint 5:** `http://localhost:3000` carga y muestra la app (aunque esté vacía o con datos de ejemplo).

---

## Parte 6: Primera sincronización con datos mock

Antes de conectar con Salesforce real, puedes probar con datos de ejemplo.

### Paso 6.1: Cargar datos del Excel como mock

```bash
cd scripts
python import_excel_data.py
```

Este script lee el Excel de `data_samples/raw_excel/ARR Oportunidad.xlsx` y lo carga en la base de datos como si fuera una sincronización de Salesforce.

### Paso 6.2: Verificar los cálculos

```bash
python validate_vs_excel.py
```

Este script compara el ARR calculado por la app con el ARR del Excel. Debe mostrar diferencias < 0.01€ por línea.

✅ **Checkpoint 6:** El script de validación termina con "✅ Validación superada. Diferencia máxima: X€".

---

## Parte 7: Conectar con Salesforce real

### Paso 7.1: Obtener credenciales de Salesforce

Necesitas que el admin de Salesforce de isEazy cree una "Connected App":

1. Envíale las instrucciones de `docs/specs/04_salesforce_integration_plan.md` (sección "Configurar la Connected App").
2. El admin te enviará:
   - `Consumer Key` → esto es tu `SF_CLIENT_ID`
   - `Consumer Secret` → esto es tu `SF_CLIENT_SECRET`
3. Rellena tu `.env` con esos valores + tu usuario y contraseña de SF.

### Paso 7.2: Probar la conexión

```bash
cd app/backend
python -c "from core.sf_extractor import test_connection; test_connection()"
```

Debe mostrar: "✅ Conexión a Salesforce exitosa. Registros disponibles: XXXXX"

### Paso 7.3: Primera sincronización real

En el navegador (`http://localhost:3000`), haz clic en el botón **"Actualizar desde Salesforce"**.

Verás un indicador de progreso. Al terminar, el dashboard se actualizará con los datos reales.

✅ **Checkpoint 7:** El dashboard muestra datos de Salesforce. Las cifras son similares a las del Excel.

---

## Parte 8: Cómo trabajar con Claude Code o Codex en sesiones futuras

Cuando abras una nueva sesión de trabajo con un agente IA, empieza siempre por:

1. Decirle que lea `docs/handover/CURRENT_STATE.md`.
2. Decirle que lea `docs/handover/NEXT_STEPS.md`.
3. Decirle en qué fase estás trabajando.

El agente leerá estos archivos y podrá continuar exactamente donde lo dejaste.

Al terminar cada sesión, el agente debe actualizar esos mismos archivos con el nuevo estado.

---

## Problemas comunes y soluciones

| Problema | Solución |
|----------|----------|
| `python: command not found` | Reinicia la terminal o reinstala Python marcando "Add to PATH" |
| `pip install` falla con permisos | Ejecuta la terminal como administrador |
| Docker no arranca | Asegúrate de que Docker Desktop está abierto (icono en la barra de tareas) |
| `alembic upgrade head` falla | Verifica que PostgreSQL está corriendo (`docker-compose ps`) |
| El frontend no conecta con el backend | Verifica que el backend está corriendo en `localhost:8000` y que `.env.local` tiene la URL correcta |
| Error de Salesforce "INVALID_LOGIN" | Verifica usuario, contraseña y security token en `.env` |
| Los números no coinciden con el Excel | Ejecuta `scripts/validate_vs_excel.py` para ver las diferencias específicas |
