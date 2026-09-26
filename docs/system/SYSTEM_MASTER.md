# SYSTEM_MASTER — Puerta de entrada del sistema

> **Propósito de este documento:** que cualquier desarrollador o IA entienda el sistema completo **sin leer conversaciones históricas**. Es la fuente de verdad de alto nivel; cada tema tiene su documento detallado en esta misma carpeta.
>
> **Fecha de auditoría:** 2026-09-25 · **Auditor:** revisión directa del código fuente (no de memoria).
> **Convención:** lo que no se pudo comprobar en el código se marca `NO VERIFICADO` o `REQUIERE CONFIRMACIÓN`.

---

## 1. Qué es

**NOMMA FOOD Central** es una plataforma web de gestión operacional para una fábrica de alimentos (producción vegetariana/vegana) y sus canales de venta. Nació como la **central interna de las empresas de la dueña** (NOMMA FOOD, Brotes Asiáticos, y un cliente corporativo, Aldea Vegetal) y hoy se busca **convertir en producto comercial replicable (SaaS multiempresa)** para otras fábricas, restaurantes y cafeterías.

Cubre, en un mismo sistema:
- **Landing pública + captación** de clientes mayoristas.
- **Central de gestión** (backoffice) con módulos de Operaciones, Producción, Compras, Comercial, Finanzas, Personas, Gerencia.
- **Portales externos** para: clientes mayoristas, choferes, operarios de planta, pickers y un cliente corporativo multi-sucursal (Aldea).
- **Integraciones**: pagos (MercadoPago), correo (Resend), WhatsApp (Meta Graph), recepción de pedidos minoristas (WooCommerce vía webhook).

## 2. Stack tecnológico (verificado en `package.json`)

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 14.2.16** (App Router) |
| UI | **React 18.3**, **TailwindCSS 3.4**, **lucide-react**, **Recharts** (gráficos), **Leaflet/react-leaflet** (mapas) |
| Backend | **Route Handlers** de Next (`app/api/**/route.ts`) — no hay servidor separado |
| Base de datos | **Supabase (PostgreSQL)** |
| Auth | **Supabase Auth** (email/password) + tokens propios para portales |
| Acceso a datos | `@supabase/supabase-js` + `@supabase/ssr` (**no hay ORM**; SQL/PostgREST directo) |
| Correo | **Resend** |
| Validación | **zod** · Formularios: **react-hook-form** |
| i18n | **next-intl** (ES/EN) |
| Hosting | **Vercel** (inferido del contexto de despliegue; **no hay `vercel.json`** en el repo → `REQUIERE CONFIRMACIÓN`) |

## 3. Estructura del repositorio (un solo proyecto Next)

```
app/
  (auth)/            → login, recuperar, nueva-contrasena
  (central)/         → BACKOFFICE (dashboard, operaciones, comercial, compras,
                        finanzas, personas, gerencia, aldea) — protegido por sesión
  (portales)/        → PORTALES externos (mayoristas, chofer, operario, picker, aldea)
  api/               → ~75 endpoints (central, portal, cron, marketing, minorista, …)
  page.tsx           → landing pública (~50 KB)
components/          → UI compartida (KpiCard, etc.)
lib/                 → lógica de negocio y helpers (supabase, correos, marca, ops, aldea…)
supabase/            → 48 scripts .sql (esquema + features), aplicados MANUALMENTE
docs/                → documentación previa + esta carpeta docs/system/
middleware.ts        → protege (central); deja públicos landing, portales y /api
```

Detalle por área:
- Arquitectura y flujo → [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Módulos del backoffice → [`MODULES.md`](./MODULES.md)
- Portales externos → [`PORTALS.md`](./PORTALS.md)
- Base de datos → [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)
- Integraciones → [`INTEGRATIONS.md`](./INTEGRATIONS.md)
- Roles y permisos → [`ROLES_PERMISSIONS.md`](./ROLES_PERMISSIONS.md)
- Despliegue → [`DEPLOYMENT.md`](./DEPLOYMENT.md) · Variables → [`ENVIRONMENT.md`](./ENVIRONMENT.md)
- Reglas de negocio → [`BUSINESS_RULES.md`](./BUSINESS_RULES.md)
- Deuda técnica → [`TECH_DEBT.md`](./TECH_DEBT.md) · Problemas conocidos → [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md)
- Convertir a SaaS → [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md)
- Replicar para un cliente nuevo → [`REPLICATION_PLAYBOOK.md`](./REPLICATION_PLAYBOOK.md)
- Contexto para IA/devs → [`AGENT_CONTEXT.md`](./AGENT_CONTEXT.md)

**Auditoría de seguridad** (carpeta aparte, [`../security/`](../security/SECURITY_AUDIT.md)):
- Auditoría de seguridad → [`SECURITY_AUDIT.md`](../security/SECURITY_AUDIT.md) · Arquitectura de seguridad → [`SECURITY_ARCHITECTURE.md`](../security/SECURITY_ARCHITECTURE.md)
- Aislamiento multiempresa → [`TENANT_ISOLATION.md`](../security/TENANT_ISOLATION.md) · Modelo de amenazas → [`THREAT_MODEL.md`](../security/THREAT_MODEL.md)
- Mapa de datos → [`DATA_MAP.md`](../security/DATA_MAP.md) · Privacidad → [`PRIVACY_ARCHITECTURE.md`](../security/PRIVACY_ARCHITECTURE.md)
- Seguridad del agente IA → [`AI_SECURITY.md`](../security/AI_SECURITY.md) · Backups → [`BACKUP_RECOVERY.md`](../security/BACKUP_RECOVERY.md) · Incidentes → [`INCIDENT_RESPONSE.md`](../security/INCIDENT_RESPONSE.md)
- Licencias de terceros → [`THIRD_PARTY_LICENSES.md`](../security/THIRD_PARTY_LICENSES.md) · Protección de IP → [`IP_PROTECTION.md`](../security/IP_PROTECTION.md)

**Transformación a SaaS multiempresa** (diseño objetivo, [`../saas/`](../saas/SAAS_MASTER_PLAN.md)):
- Índice del diseño → [`SAAS_MASTER_PLAN.md`](../saas/SAAS_MASTER_PLAN.md) · Roadmap Phase 0–9 → [`ROADMAP.md`](../saas/ROADMAP.md)
- Arquitectura → [`SAAS_ARCHITECTURE.md`](../saas/SAAS_ARCHITECTURE.md) · Modelo tenant → [`TENANT_MODEL.md`](../saas/TENANT_MODEL.md) · Datos → [`DATA_ARCHITECTURE.md`](../saas/DATA_ARCHITECTURE.md) · RBAC → [`RBAC_MODEL.md`](../saas/RBAC_MODEL.md)
- Módulos → [`MODULE_ARCHITECTURE.md`](../saas/MODULE_ARCHITECTURE.md) · Configuración → [`CONFIGURATION_ENGINE.md`](../saas/CONFIGURATION_ENGINE.md) · Inventario → [`INVENTORY_ARCHITECTURE.md`](../saas/INVENTORY_ARCHITECTURE.md) · Pedidos → [`ORDER_FLOW.md`](../saas/ORDER_FLOW.md)
- Integraciones → [`INTEGRATION_HUB.md`](../saas/INTEGRATION_HUB.md) · Facturación DTE → [`BILLING_INTEGRATION.md`](../saas/BILLING_INTEGRATION.md) · Storage → [`STORAGE_ARCHITECTURE.md`](../saas/STORAGE_ARCHITECTURE.md) · Observabilidad → [`OBSERVABILITY.md`](../saas/OBSERVABILITY.md)
- Onboarding → [`ONBOARDING.md`](../saas/ONBOARDING.md) · Migración → [`MIGRATION_PLAN.md`](../saas/MIGRATION_PLAN.md) · Piloto → [`PILOT_PLAN.md`](../saas/PILOT_PLAN.md) · Producto/planes → [`PRODUCT_MODEL.md`](../saas/PRODUCT_MODEL.md) · Agente IA → [`AI_AGENT_ARCHITECTURE.md`](../saas/AI_AGENT_ARCHITECTURE.md)

## 4. Cómo se conecta todo (resumen)

```
Cliente/usuario
   │
   ├─ Landing pública (app/page.tsx) ─────────────► formularios → API → Central
   │
   ├─ Central (backoffice, sesión Supabase) ──────► app/api/central/** → Supabase
   │
   └─ Portales externos ──────────────────────────► app/api/portal/** → Supabase
        (mayoristas/chofer/operario/picker: acceso por TOKEN o login propio)

Integraciones: Resend (correo) · MercadoPago (pago) · Meta Graph (WhatsApp) ·
               WooCommerce → webhook entrante /api/minorista/pedido
Automatización: /api/cron/campanas (marketing programado, protegido por CRON_SECRET)
```

## 5. Estado general (resumen ejecutivo técnico)

- **Amplitud funcional: muy alta.** Cubre casi toda la operación de una fábrica de alimentos y sus canales.
- **Madurez arquitectónica: media-baja para producto.** Es un **monolito single-tenant** con:
  - **Duplicación de esquema** (tablas en español e inglés para lo mismo: recetas/recipes, proveedores/suppliers, operarios/operators, inventario/inventory).
  - **Sin capa de tenant** en las tablas núcleo → hoy **no puede alojar dos empresas** con datos aislados.
  - **Branding hardcodeado** a NOMMA/Brotes (`marca-portal.ts`, filtros por `marca`).
  - **Permisos** por arrays de strings repetidos en cada endpoint (sin RBAC central).
- **Seguridad: parcial.** RLS activo en 68 tablas (buena señal), pero varias APIs usan **service-role** con chequeo de rol propio; la corrección de políticas RLS **no fue auditada línea por línea** (`REQUIERE CONFIRMACIÓN`).
- **Distancia a SaaS:** significativa pero abordable. Ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md).

## 6. Lo mínimo que debes saber para tocar el sistema

1. **No hay migraciones versionadas.** Los `.sql` de `supabase/` se corrieron a mano en el dashboard de Supabase. El repo **no garantiza** que la BD real == estos scripts. Ver [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) y [`TECH_DEBT.md`](./TECH_DEBT.md).
2. **No hay ORM.** Se consulta con el cliente Supabase (PostREST). Ojo con embeds ambiguos y columnas inexistentes (fallan en silencio). Ver [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).
3. **Dos clientes Supabase:** navegador (anon, RLS) y servidor (service-role, ignora RLS). La mayoría de escrituras críticas van por servidor.
4. **Verificar antes de afirmar.** Este documento marca lo no comprobado; mantén esa disciplina.
