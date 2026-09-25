# REPLICATION_PLAYBOOK — "Si mañana vendo el sistema a una fábrica nueva"

> Dos versiones: **(A) HOY** (lo que realmente se puede hacer con el sistema actual) y **(B) OBJETIVO** (cuando exista la capa de tenant). Cada paso marca si es **MANUAL** o **AUTOMATIZADO**.

---

## A) HOY — cómo se replicaría con el sistema actual

⚠️ **Realidad:** el sistema es **single-tenant**. Dar de alta una empresa nueva **sin aislamiento** significa **una instancia separada** (otro proyecto Supabase + otro deploy). No hay forma segura de meter dos empresas en la misma BD hoy.

| # | Paso | Estado hoy |
|---|---|---|
| 1 | Crear **proyecto Supabase** nuevo para el cliente | MANUAL |
| 2 | Aplicar los **48 `.sql`** en orden de dependencias (resolver el orden a mano) | MANUAL (frágil — sin migraciones) |
| 3 | Crear **usuario admin** (Supabase Auth) + fila en `profiles` con rol | MANUAL (SQL/dashboard) |
| 4 | Sembrar **config**: `business_settings`, `landing_config` (id=1), `credit_rules`, ubicaciones | MANUAL |
| 5 | Cargar **branding**: hoy el branding está en código (`marca-portal.ts`) → requiere **editar código** | MANUAL / código |
| 6 | Nuevo **deploy en Vercel** apuntando a ese Supabase (env propias) | MANUAL |
| 7 | Configurar **dominio** propio | MANUAL |
| 8 | Configurar **integraciones** (Resend/MP/WhatsApp) con cuentas del cliente | MANUAL |
| 9 | Cargar **productos, recetas, proveedores, clientes, stock, trabajadores** | Parcial: hay UI para varios (productos, recetas vía botón, operarios), otros a mano |
| 10 | **Pruebas** y puesta en marcha | MANUAL |

**Veredicto HOY:** replicable **solo como instancia independiente**, con **mucho trabajo manual** y **edición de código** para branding. **No apto** para vender a escala todavía.

---

## B) OBJETIVO — con capa de tenant (tras SAAS_MIGRATION_PLAN)

Flujo **NUEVO CLIENTE → SISTEMA FUNCIONANDO**, mayormente **AUTOMATIZADO** desde un panel de plataforma:

| # | Paso | Cómo |
|---|---|---|
| 1 | **Crear empresa (tenant)** | Panel super-admin: nombre, industria, plan → crea `tenants` + settings base | AUTOMATIZADO |
| 2 | **Elegir plantilla de industria** | Fábrica de alimentos / cafetería / restaurante → activa módulos, roles y catálogos base | AUTOMATIZADO |
| 3 | **Branding** | Subir logo, colores, dominio → guardado en `tenant_settings` | AUTOMATIZADO |
| 4 | **Usuario admin del cliente** | Invitación por correo; setea password | AUTOMATIZADO |
| 5 | **Roles y permisos** | Roles plantilla; el admin ajusta la matriz | AUTOMATIZADO/config |
| 6 | **Sucursales / bodegas** | El admin las crea en UI | AUTOMATIZADO |
| 7 | **Módulos activados** | Feature flags según plan | AUTOMATIZADO |
| 8 | **Productos** | UI de productos (ya existe) o import CSV | Semi-auto |
| 9 | **Recetas** | UI de recetas (ya existe) o plantillas | Semi-auto |
| 10 | **Stock inicial** | Carga/ajuste de inventario en UI | Semi-auto |
| 11 | **Trabajadores (operarios/choferes)** | UI "Crear operario" (ya existe) | AUTOMATIZADO |
| 12 | **Proveedores** | UI de proveedores (ya existe) | AUTOMATIZADO |
| 13 | **Clientes** | UI de clientes/mayoristas (ya existe) | AUTOMATIZADO |
| 14 | **Integraciones** | El cliente conecta sus cuentas (Resend/MP/WhatsApp) por asistente | AUTOMATIZADO |
| 15 | **Deployment** | Mismo deploy multi-tenant (no se crea infra nueva) | AUTOMATIZADO |
| 16 | **Dominio** | Dominio propio o subdominio `cliente.plataforma.com` | Semi-auto |
| 17 | **Pruebas** | Checklist de aceptación por módulo | Manual guiado |
| 18 | **Puesta en marcha** | Marcha blanca (ya existe el switch) → producción | AUTOMATIZADO |

**Diferencia clave:** en el objetivo **no se copia ni edita código**; todo es datos/config por tenant sobre el **mismo motor**.

---

## C) Qué falta para pasar de A → B (resumen)
1. Capa de **tenant + RLS** (Fase 1 del plan SaaS).
2. **Migraciones versionadas** (recrear BD determinista).
3. **Branding y config por tenant** (sacarlo del código).
4. **Panel de onboarding** de plataforma.
5. **Feature flags** y **plantillas por industria**.

Ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md) para el detalle por fases.
