# ADR-003: Stack Tecnológico — Python/FastAPI + PostgreSQL + React/Next.js
**Fecha:** 2026-04-17
**Estado:** ACEPTADO
**Autor:** Claude Code (Fase 4)

---

## Contexto

Hay que elegir el stack para construir la aplicación. El usuario es un CFO con conocimientos técnicos limitados; el desarrollo se hará de forma asistida por IA (Claude Code y Codex). Se necesita que sea:
- Mantenible y bien documentado.
- Fácil de construir con ayuda de IA.
- Ejecutable localmente sin infraestructura compleja.
- Suficientemente profesional para producción futura.

---

## Opciones consideradas

| Opción | Backend | BD | Frontend |
|--------|---------|---|----------|
| A (recomendada) | Python/FastAPI | PostgreSQL | React/Next.js |
| B | Node.js/Express | PostgreSQL | React/Next.js |
| C | Python/Django | PostgreSQL | Django templates |
| D | Python/Streamlit | SQLite | Streamlit |

### Por qué no B: Python tiene mejor ecosistema para cálculos numéricos y más soporte en IAs de código.
### Por qué no C: Django es más pesado y Django templates son limitados para dashboards interactivos.
### Por qué no D: Streamlit es rápido pero genera código difícil de mantener y con UX limitada para producción.

---

## Decisión

**Opción A:** Python 3.11+ con FastAPI para el backend, PostgreSQL para la base de datos, React con Next.js para el frontend.

Librerías adicionales confirmadas:
- `simple-salesforce` para la API de Salesforce.
- `SQLAlchemy` + `Alembic` para ORM y migraciones.
- `python-dotenv` para variables de entorno.
- `pytest` para tests.
- `Recharts` para gráficos en el frontend.
- `Docker Compose` para desarrollo local.

---

## Consecuencias

1. El desarrollador (o la IA) necesita saber Python y JavaScript/TypeScript.
2. Se necesita tener instalado: Python 3.11+, Node.js 18+, Docker Desktop.
3. El despliegue local usa Docker Compose (un único comando).
4. En producción se puede desplegar en cualquier cloud (Railway, Render, AWS, etc.).
