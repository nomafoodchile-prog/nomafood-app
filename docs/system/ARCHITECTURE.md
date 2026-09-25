# ARCHITECTURE — Mapa de arquitectura

> Verificado contra `app/`, `lib/`, `middleware.ts`, `supabase/`. Diagramas en Mermaid.

## 1. Vista de capas

```mermaid
flowchart TD
  subgraph Cliente
    L[Landing pública app/page.tsx]
    C[Central / Backoffice]
    P[Portales externos]
  end
  subgraph Next["Next.js 14 (Vercel) — un solo despliegue"]
    MW[middleware.ts\nprotege (central)]
    RSC[Server Components / Pages]
    API[Route Handlers app/api/**]
    LIB[lib/** lógica de negocio]
  end
  subgraph Datos
    SB[(Supabase Postgres)]
    AUTH[Supabase Auth]
    STG[Supabase Storage\n(evidencias/archivos) — REQUIERE CONFIRMACIÓN]
  end
  subgraph Externos
    RES[Resend correo]
    MP[MercadoPago pagos]
    WA[Meta Graph WhatsApp]
    WOO[WooCommerce → webhook]
  end

  L --> API
  C --> MW --> RSC --> API
  P --> API
  API --> LIB --> SB
  API --> AUTH
  API --> RES & MP & WA
  WOO -->|POST /api/minorista/pedido| API
```

## 2. Modelo conceptual objetivo (cómo debería leerse)

```
EMPRESA (tenant)  ← HOY NO EXISTE como capa real (single-tenant)
   └─ CENTRAL (backoffice)
        └─ MÓDULOS (operaciones, producción, compras, comercial, finanzas, personas, gerencia)
             └─ PORTALES (mayoristas, chofer, operario, picker, aldea)
                  └─ SERVICIOS (lib/**: correos, pagos, marca, ops, inventario…)
                       └─ BASE DE DATOS (Supabase)
                            └─ INTEGRACIONES (Resend, MercadoPago, WhatsApp, WooCommerce)
```
> **Hallazgo central:** el nivel **EMPRESA (tenant)** está **implícito** (todo pertenece a una sola empresa). El nivel "organización" que existe (`organizaciones`) modela **clientes corporativos con sucursales** (caso Aldea), no empresas-tenant de la plataforma. Ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md).

## 3. Route groups (App Router)

| Grupo | Ruta base | Protección | Contenido |
|---|---|---|---|
| `(auth)` | `/login`, `/recuperar`, `/nueva-contrasena` | pública | autenticación de la Central |
| `(central)` | `/dashboard`, `/operaciones/*`, `/comercial/*`, `/compras/*`, `/finanzas/*`, `/personas/*`, `/gerencia/*`, `/aldea` | **sesión Supabase** (middleware) | backoffice |
| `(portales)` | `/mayoristas`, `/chofer`, `/operario`, `/portal/*` | **auto-gestionada** (token o login propio) | portales externos |
| (raíz) | `/` landing, `/orden-compra*`, `/track` | pública | landing + utilidades |

## 4. Autenticación y sesión (verificado en `middleware.ts`)

- `middleware.ts` deja **públicas**: `/`, `/login`, `/recuperar`, `/mayoristas`, `/portal`, `/chofer`, `/operario`, `/api`.
- Para el resto (la Central) valida `supabase.auth.getUser()`; si no hay sesión → redirige a `/login`.
- **Los portales y las APIs manejan su propia autenticación** (token en la URL, RPC o login dedicado), por eso el middleware no los cubre. Esto significa que **cada endpoint es responsable de su propia autorización** (ver [`ROLES_PERMISSIONS.md`](./ROLES_PERMISSIONS.md)).

## 5. Dos clientes Supabase (patrón crítico)

| Cliente | Dónde | Autoridad | Uso |
|---|---|---|---|
| **Browser** (`lib/supabase/client.ts`, `createBrowserClient`) | componentes cliente | anon + **RLS** (sesión por cookies) | lecturas de UI |
| **Server** (`lib/supabase/server.ts`, service-role) | route handlers | **ignora RLS** | escrituras y lecturas privilegiadas |
| **Auth server** (`lib/supabase/auth-server.ts`, `getServerSupabase`) | route handlers | sesión del usuario (respeta RLS) | identificar al usuario y su `role` |

**Patrón de un endpoint protegido de Central:** identifica al usuario con `getServerSupabase()`, valida `profiles.role ∈ ADMIN_ROLES`, y opera con el cliente **service-role**.

## 6. Middleware / no hay workers ni colas

- **No hay workers** ni colas (Redis/BullMQ/etc.): `NO VERIFICADO` cualquier procesamiento asíncrono fuera de:
  - `app/api/cron/campanas` — endpoint disparado por cron (Vercel Cron o pg_cron), protegido por `CRON_SECRET`.
- **pg_cron**: no hay `cron.schedule(...)` en los `.sql` del repo → si existe, se configuró en el dashboard (`NO VERIFICADO`).

## 7. Almacenamiento de archivos

- Existen tablas `task_evidence_files` y referencias a fotos (`foto_oficial_url`, evidencias de limpieza/tareas). El uso de **Supabase Storage** es plausible pero **no fue verificado** el bucket/config → `REQUIERE CONFIRMACIÓN`.
- Fotos de catálogo se sirven desde `public/productos/*` (estáticas en el repo).
