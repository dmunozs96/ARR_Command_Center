# Contexto de Negocio del ARR en isEazy

**Versión:** 1.0
**Fecha:** 2026-09-03
**Estado:** VIGENTE
**Audiencia:** cualquiera que reciba este proyecto sin conocimiento previo del negocio

> Este documento estaba vacío desde la creación del repositorio (Abr-2026). Se rellena ahora
> con el contexto necesario para interpretar las cifras. La mecánica de cálculo está en
> [19_calculation_reference.md](./19_calculation_reference.md).

---

## 1. Quién es isEazy y qué vende

isEazy es una empresa española de **e-learning B2B**. Vende software en modelo suscripción
(SaaS) y, alrededor de él, servicios no recurrentes (implantación, diseño instruccional,
producción de contenido, formación).

Líneas de negocio SaaS:

| Línea | `product_type` | Qué es | Fuente del dato |
|---|---|---|---|
| isEazy LMS | `SaaS LMS` | Plataforma de gestión del aprendizaje | Salesforce |
| isEazy AIO | `SaaS AIO` | All-In-One: LMS + creación de contenido | Salesforce |
| isEazy Author | `SaaS Author` | Herramienta de autoría de contenido (venta enterprise) | Salesforce |
| isEazy Author Online | `Author Online` | Misma herramienta en autoservicio online | **Stripe** |
| isEazy Engage | `SaaS Engage` | Comunicación interna | Salesforce |
| isEazy Skills | `SaaS Skills` | Gestión de competencias | Salesforce |

Todo lo demás que aparece en Salesforce (`TaaS`, `Implantación`, `Diseño Instruccional`,
`Videos`, `Cursos`, `Plantillas`, `Catálogo de Servicios`, `Servicio de Formación`) es
**ingreso no recurrente y no forma parte del ARR**.

**Author Online es el caso especial de todo el sistema:** es la única línea que no pasa por
Salesforce. Se factura por Stripe en autoservicio, con miles de suscripciones pequeñas, y por
eso entra en la app como un **agregado mensual sin dimensión de cliente** (ver §5).

---

## 2. Qué entendemos por ARR

**ARR (Annual Recurring Revenue) = valor anualizado de los contratos SaaS activos en un
momento dado.**

Tres precisiones que evitan casi todos los malentendidos:

1. **No es facturación ni caja.** Un contrato de 3 años facturado por adelantado aporta a ARR
   su valor anual, no el importe cobrado.
2. **Es un stock, no un flujo.** El "ARR de junio 2026" es la fotografía de lo que estaba
   contratado y activo ese mes, no la suma de lo vendido durante junio.
3. **Se mide por línea de producto, no por oportunidad.** Una oportunidad puede llevar tres
   productos: dos SaaS que suman ARR y una implantación que no.

La fórmula, replicada del Excel histórico del CFO:

```
ARR de una línea = (precio_real / días_de_servicio) × 365
donde  precio_real = cantidad × precio_unitario
```

Es decir: se calcula lo que cuesta **un día** de ese contrato y se multiplica por un año. Un
contrato semestral de 10.000 € aporta ~20.000 € de ARR mientras está activo; uno de 3 años por
60.000 € aporta ~20.000 €.

Todo en **EUR**. No hay contratos en otras divisas ni conversión de moneda.

---

## 3. De dónde viene este proyecto

El proceso original era:

```
Salesforce  →  exportación manual a Excel  →  hoja "Opos con Productos" con ~40 columnas
            →  cálculo manual del CFO  →  hoja "Resumen"  →  comité de dirección
```

Ese Excel es la fuente de verdad histórica de la compañía. Tenía tres problemas:
no auditable (nadie más podía reproducir el número), no versionado (no se podía saber por qué
el ARR de un mes cerrado había cambiado) y frágil (dependía de una persona).

**Decisión fundacional (ADR-001):** en el MVP la app **replica el Excel fielmente**, incluidas
sus rarezas matemáticas, antes de "mejorarlas". El objetivo era que el CFO pudiera comparar
cifra a cifra y confiar. Consecuencia práctica: hay detalles que un ingeniero corregiría
—como que `días_de_servicio` sea la duración menos uno— y que se mantienen a propósito. Están
documentados en [19_calculation_reference.md §4.2](./19_calculation_reference.md#42-los-dos-detalles-que-más-sorprenden-y-son-intencionados)
y en INC-05.

---

## 4. Las dos preguntas temporales: firmado vs. en servicio

Una venta SaaS tiene **dos fechas** que no coinciden: cuándo se firma (`close_date`) y cuándo
arranca el servicio (`subscription_start_date`). Entre ambas puede haber semanas o meses de
implantación.

Esto da dos lecturas legítimas del mismo dato, y la app soporta las dos con un selector global:

| Modo | Pregunta de negocio | Quién la hace |
|---|---|---|
| **Desde inicio** (`from_start`) | ¿Cuánto ARR está **en servicio** ahora mismo? | Finanzas, reporting a inversores |
| **Desde cierre** (`from_close`) | ¿Cuánto ARR está **firmado**, aunque no haya arrancado? | Dirección comercial, seguimiento de objetivos |

La diferencia entre ambas no es un error de datos: es el **inventario de contratos firmados
pendientes de implantar**. El módulo *Committed vs Real* convierte precisamente ese gap en un
indicador de gestión. Un delta creciente significa que se está vendiendo más rápido de lo que
se implanta.

Detalle importante: el modo "desde cierre" se aplica **solo a nuevo negocio**, no a
renovaciones (una renovación no debe adelantarse a su fecha de inicio).

---

## 5. Qué es un "cliente" (y por qué es más difícil de lo que parece)

Tres capas de identidad, y las tres importan:

1. **Cuenta de Salesforce** (`account_name`) — la sociedad concreta que firma.
2. **Cuenta principal** (`parent_account_name`) — el grupo empresarial al que pertenece.
3. **Cliente consolidado** (`client_name`) — la **raíz** del grupo, resuelta transitivamente.

Ejemplo real: `EUROCAJA RURAL → Banco Cooperativo → Grupo Caja Rural`. Las tres son cuentas
distintas en Salesforce, pero comercialmente son **un cliente**.

**Por qué es crítico:** si un grupo registra la renovación en otra sociedad del mismo grupo, el
análisis por cuenta lo lee como *baja de la sociedad A + cliente nuevo en la sociedad B*, e
infla simultáneamente el churn y el new logo. Todo el análisis de variaciones agrupa por
`client_name` desde V6 (~1.121 cuentas → ~989 clientes en la muestra de referencia).

**Author Online no tiene dimensión de cliente:** al ser un agregado de Stripe, entra como una
sola clave sintética `[Author Online Stripe]` y solo puede moverse por up/down-selling — nunca
se clasifica como churn ni como cliente nuevo.

---

## 6. Vocabulario de churn y expansión

Todas las métricas se calculan comparando dos fotografías del ARR por
`(cliente_consolidado, línea_de_negocio)`:

| Término | Definición operativa |
|---|---|
| **Churn** | El cliente×BL tenía ARR y pasa a 0. Se imputa el ARR completo perdido. |
| **New logo** | El cliente×BL no tenía ARR y ahora sí. |
| **Down-selling** | Tenía ARR y ahora tiene menos (pero >0). Se imputa solo la diferencia. |
| **Up-selling** | Tenía ARR y ahora tiene más. Se imputa solo la diferencia. |
| **GRR** (Gross Revenue Retention) | Retención **sin** contar expansión. Techo natural: 100 %. |
| **NRR** (Net Revenue Retention) | Retención **con** expansión. Puede superar 100 %. |
| **Logo churn rate** | % de clientes×BL perdidos sobre los que había al inicio (cuenta cabezas, no euros). |
| **Base instalada** | El ARR existente, excluyendo nuevo negocio. Lo que se retiene o se pierde. |

Identidad que siempre debe cuadrar:

```
ARR(mes B) − ARR(mes A) = new_logo + up_selling − churn − down_selling
```

**Dos avisos de interpretación:**

- El GRR y el NRR **mensuales** no son anuales. Un NRR mensual del 99,5 % es ~94 % anual
  compuesto. La app ofrece también ventanas LTM y YTD, que sí son anuales, pero se calculan
  sobre una **cohorte fija** y con reglas ligeramente distintas
  ([19_calculation_reference.md §9](./19_calculation_reference.md#9-churn-y-retención-de-ingresos)).
- Un cliente que **migra de LMS a AIO** aparece hoy como churn en LMS + new logo en AIO. Es
  intencionado (permite leer el churn por línea de negocio), pero hay que saberlo al leer el
  churn a nivel compañía.

---

## 7. Por qué existen los snapshots

Cada carga de datos crea un **snapshot inmutable**: el dataset crudo, el ARR calculado línea a
línea y las alertas de ese momento. No se recalcula el pasado; se añade una foto nueva.

Motivo de negocio: **el ARR de un mes cerrado cambia.** Alguien corrige una fecha de
suscripción en Salesforce, se anula una oportunidad, se reclasifica un producto. Sin snapshots,
el ARR de enero que se presentó al comité en febrero sería irrecuperable, y no habría forma de
explicar por qué en marzo es distinto. El *Revisor de Snapshot* compara dos fotos y muestra
exactamente qué líneas cambiaron.

---

## 8. Qué NO hace la app (deliberadamente)

Para evitar expectativas equivocadas al recibir el proyecto:

- **No hace pipeline ni forecast comercial.** Solo trabaja con oportunidades ganadas
  (*closed won*). El módulo predictivo proyecta la base instalada existente, sin nuevo negocio.
- **No calcula CAC, LTV, márgenes ni P&L.** Es ARR, no contabilidad.
- **No incluye ingresos no recurrentes** en el ARR (sí los tiene en la base de datos, marcados
  como no-SaaS).
- **No corrige Salesforce.** Detecta anomalías y permite excluir una línea concreta del ARR con
  un flag, pero el arreglo estructural se hace en el origen.
- **No tiene autenticación** todavía (F-21 pendiente): el acceso se controla a nivel de
  despliegue.
- **No está conectada a Salesforce en producción.** El código está implementado y probado, pero
  faltan credenciales; la vía operativa hoy es la **carga manual del Excel**.

---

## 9. Documentos relacionados

- [19_calculation_reference.md](./19_calculation_reference.md) — todas las lógicas de cálculo (documento maestro)
- [05_functional_requirements.md](./05_functional_requirements.md) — inventario funcional y estado
- [09_dashboard_and_reporting_draft.md](./09_dashboard_and_reporting_draft.md) — pantallas
- [07_data_model_draft.md](./07_data_model_draft.md) — modelo de datos
- [12_open_questions_and_risks.md](./12_open_questions_and_risks.md) — preguntas abiertas y riesgos
- [../decisions/ADR-001_arr_calculation_base.md](../decisions/ADR-001_arr_calculation_base.md) — replicar el Excel en el MVP
- [../decisions/ADR-002_dual_data_source.md](../decisions/ADR-002_dual_data_source.md) — Salesforce + Stripe
- [../logs/excel_business_rules_catalog.md](../logs/excel_business_rules_catalog.md) — reglas extraídas del Excel original
