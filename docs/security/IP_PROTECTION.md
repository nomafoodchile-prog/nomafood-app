# IP_PROTECTION — Propiedad intelectual y protección contra copia

> Qué constituye la PI de la plataforma y qué está innecesariamente expuesto al cliente. Principio rector: **el cliente compra ACCESO al servicio, no el código fuente.**

## 1. Activos de propiedad intelectual (propios)

| Activo | Dónde vive | Valor |
|---|---|---|
| **Código fuente** (app, APIs, lib) | repo | Alto |
| **Arquitectura y modelo de datos** | `docs/system/`, esquema | Alto |
| **Reglas de negocio** (recetas+tandas, escalado, costos, crédito, marcha blanca) | `lib/`, endpoints, `docs/system/BUSINESS_RULES.md` | **Muy alto** (diferenciador) |
| **Workflows/automatizaciones** (correos, campañas, cron, flujos de portal) | `lib/`, `app/api/` | Alto |
| **Motor de configuración** (a futuro: multi-tenant, feature flags) | por construir | Muy alto |
| **Prompts y diseño del futuro agente de IA** | por construir | Muy alto |
| **Componentes reutilizables / UI** | `components/` | Medio |
| **Documentación** | `docs/` | Medio |

## 2. Qué está expuesto hoy al cliente (navegador)

Next.js envía al navegador **todo el JavaScript de los componentes cliente** (`'use client'`). Riesgos verificados/potenciales:

| Elemento | Exposición | Estado |
|---|---|---|
| **Lógica en componentes cliente** | el bundle JS es visible/inspeccionable | ⚠️ parte de la lógica de UI y algunas reglas viven en páginas cliente |
| **Source maps de producción** | revelarían el código legible | ✅ **desactivados** (default Next; no activado `productionBrowserSourceMaps`) |
| **Claves `NEXT_PUBLIC_*`** | anon key, MP public key, GA, maps | ✅ son claves *públicas* por diseño (no secretas) |
| **Service-role / secretos** | — | ✅ **no** llegan al navegador |
| **Endpoints internos** | rutas `/api/**` visibles al inspeccionar red | ⚠️ normal, pero deben estar todos autorizados (ver SECURITY_AUDIT §4) |
| **Reglas de negocio sensibles** (costos, márgenes, fórmulas) | si se calculan en cliente, quedan expuestas | ⚠️ `REQUIERE CONFIRMACIÓN` de qué cálculos ocurren en cliente vs servidor |

## 3. Principio de arquitectura objetivo
- **Toda lógica propietaria y sensible = server-side** (route handlers / funciones en `lib` que corren en servidor). El cliente solo recibe **datos ya calculados** y UI.
- Mover al servidor cualquier cálculo de **costos, márgenes, precios, escalado de recetas, reglas de crédito** que hoy ocurra en el navegador.
- El **futuro agente de IA y sus prompts** viven **solo en el servidor**; nunca se envían prompts propietarios al cliente.

## 4. Medidas de protección contra copia (no ejecutar aún)
1. Mantener **source maps de producción desactivados** (ya está).
2. **Auditar componentes cliente** y mover reglas sensibles a endpoints server-side.
3. **Minificación/ofuscación** estándar de Next (ya aplica) — no confiar en ella como seguridad, solo como fricción.
4. **No** publicar el repo; acceso restringido; el cliente **nunca** recibe el código.
5. **Términos de servicio y licencia de uso** (SaaS) que prohíban ingeniería inversa y copia. ⚖️ (revisión legal).
6. Considerar **marca registrada** del nombre/producto y acuerdos de confidencialidad con colaboradores. ⚖️
7. Rate limiting + detección de scraping de endpoints/catálogos.

## 5. Nota
La **PI más valiosa** no es el código (replicable), sino las **reglas de negocio y el motor de configuración/IA multi-tenant**. Protegerlos server-side y contractualmente es prioritario al comercializar.
