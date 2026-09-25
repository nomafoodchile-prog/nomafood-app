# DECISIONS — Decisiones de arquitectura (ADR ligero)

> Registro de decisiones observadas en el código (inferidas) + decisiones propuestas por esta auditoría. Las inferidas se marcan como tal; confirmarlas o revertirlas conscientemente.

## Decisiones ya tomadas (inferidas del código)

### ADR-01 · Monolito Next.js (App Router) en Vercel
- **Contexto:** un solo repo, frontend + API en el mismo proyecto.
- **Consecuencia:** despliegue simple; sin separación backend/servicios. Suficiente para el tamaño actual.

### ADR-02 · Supabase como BD + Auth (sin ORM)
- **Contexto:** acceso directo por PostgREST/`supabase-js`.
- **Consecuencia:** rapidez inicial; a cambio, errores silenciosos por embeds/columnas y lógica de datos dispersa. Ver [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md).

### ADR-03 · Autorización en cada endpoint con service-role
- **Contexto:** el endpoint identifica al usuario (cookie) y opera con service-role.
- **Consecuencia:** funciona, pero arrays de roles duplicados y doble mecanismo (RLS + chequeo). Ver [`ROLES_PERMISSIONS.md`](./ROLES_PERMISSIONS.md).

### ADR-04 · Multi-marca por columna `marca`, no por tenant
- **Contexto:** NOMMA y Brotes comparten BD; se distinguen por `products.marca` y URLs por marca.
- **Consecuencia:** simple para 2 marcas de un mismo dueño; **no escala** a empresas independientes. Origen del trabajo de productización.

### ADR-05 · `organizaciones` para clientes multi-sucursal (Aldea)
- **Contexto:** un cliente (Aldea) con 3 locales bajo una organización.
- **Consecuencia:** semilla conceptual de jerarquía, pero modelada como caso particular, no como capacidad de plataforma.

### ADR-06 · Esquema en español como fuente viva
- **Contexto:** el scaffold inicial en inglés fue reemplazado por tablas en español.
- **Consecuencia:** tablas en inglés quedaron muertas → deuda (TD-1).

## Decisiones propuestas (a aprobar)

### ADR-07 (propuesta) · Multi-tenant por `tenant_id` + RLS (Opción A)
- **Razón:** menor costo, reutiliza RLS existente, un solo deploy.
- **Alternativas:** schema por tenant / proyecto por tenant (reservar para enterprise).
- **Estado:** PROPUESTA — ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md).

### ADR-08 (propuesta) · Adoptar migraciones versionadas (Supabase CLI)
- **Razón:** recrear la BD de forma determinista es prerrequisito para vender.
- **Estado:** PROPUESTA (Fase 0).

### ADR-09 (propuesta) · Config de empresa fuera del código
- **Razón:** branding, remitentes, pagos y datos bancarios deben ser datos por tenant.
- **Estado:** PROPUESTA (Fase 2).

### ADR-10 (propuesta) · Helper único de autorización + RBAC por tenant
- **Estado:** PROPUESTA (Fase 0–1).
