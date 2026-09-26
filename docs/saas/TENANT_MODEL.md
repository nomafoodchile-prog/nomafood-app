# TENANT_MODEL — Modelo multi-tenant

> Define las entidades de organización y **cuál es la raíz del aislamiento**.

## 1. Jerarquía objetivo

```
TENANT (cuenta cliente = raíz de aislamiento y de facturación SaaS)
 └─ COMPANY (razón social / entidad legal; 1..n por tenant, para DTE y contabilidad)
     └─ BRANCH (sucursal / local)
         └─ LOCATION (punto físico dentro de la sucursal: sala, cocina, tienda)
             └─ WAREHOUSE (bodega / cámara / punto de stock)
USER (pertenece al TENANT; puede tener acceso limitado a ciertas branches/warehouses)
```

## 2. Entidades y responsabilidades

| Entidad | Qué es | Aísla datos | Notas |
|---|---|---|---|
| **TENANT** | La cuenta de la empresa cliente en la plataforma | ✅ **SÍ — raíz** | Todo dato lleva `tenant_id`. Es la unidad de facturación SaaS, backup lógico y baja. |
| **COMPANY** | Razón social con RUT/config tributaria | scope interno | Un tenant puede tener varias (grupo empresarial). DTE y credenciales tributarias **por company**. |
| **BRANCH** | Sucursal/local operativo | scope interno | Ventas, caja y stock pueden reportarse por branch. |
| **LOCATION** | Punto físico dentro de una branch | scope interno | Opcional; útil para cocinas/dark kitchens. |
| **WAREHOUSE** | Bodega/punto de stock | scope interno | El inventario vive a nivel warehouse. |
| **USER** | Persona con login | pertenece a tenant | Membresía en `tenant_users`; roles y scope (branch/warehouse). |
| **WORKER (operario/chofer)** | Trabajador operativo | pertenece a tenant | Puede o no tener login; ligado a branch/área. |
| **CUSTOMER** | Cliente del tenant (mayorista/minorista) | pertenece a tenant | Reemplaza `mayoristas`/`customers` unificados, con `tenant_id`. |
| **SUPPLIER** | Proveedor del tenant | pertenece a tenant | `proveedores` con `tenant_id`. |

> **Decisión:** la **raíz de aislamiento es el TENANT.** La `marca` actual pasa a ser un atributo/entidad **dentro** del tenant (un tenant puede tener varias marcas/catálogos). La `organizaciones` actual (caso Aldea) se reinterpreta como **BRANCH/COMPANY dentro de un tenant**.

## 3. Tablas de plataforma (nuevas)

| Tabla | Campos clave |
|---|---|
| `tenants` | id, nombre, slug, industria, plan_id, estado, created_at |
| `companies` | id, tenant_id, razon_social, rut, config_tributaria (jsonb) |
| `branches` | id, tenant_id, company_id, nombre, direccion |
| `warehouses` | id, tenant_id, branch_id, nombre, tipo |
| `tenant_users` | id, tenant_id, user_id (auth), estado, invited_at |
| `tenant_settings` | tenant_id, group, key, value (jsonb) |
| `tenant_modules` | tenant_id, module_key, enabled |
| `tenant_integrations` | tenant_id, provider, credentials_ref (bóveda), config |
| `roles` | id, tenant_id (null=plantilla global), nombre, es_sistema |
| `role_permissions` | role_id, permission_key |
| `user_roles` | tenant_user_id, role_id, scope (branch/warehouse opcional) |
| `audit_logs` | tenant_id, user_id, modulo, accion, entidad, entidad_id, antes, despues, ip, ts |

## 4. Regla de oro del `tenant_id`
- **Toda** tabla de negocio incluye `tenant_id NOT NULL` con FK a `tenants`.
- `tenant_id` se **asigna en el servidor** a partir del JWT; el cliente nunca lo envía como autoridad.
- **RLS obligatoria** en cada tabla: `USING (tenant_id = auth.jwt()->>'tenant_id')` para SELECT/UPDATE/DELETE, y `WITH CHECK` en INSERT.
- Índices: `(tenant_id, <clave natural>)` para performance y unicidad por tenant.

## 5. Membresía multi-tenant de un usuario
- Un `auth.users` puede estar en varios `tenant_users` (p.ej. dueño con 2 empresas, o un contador externo).
- El **tenant activo** se fija al iniciar sesión / al cambiar; el backend re-emite el JWT validando la membresía.
- **Nunca** se infiere el tenant desde el dominio o un parámetro manipulable sin validar membresía.

## 6. Migración conceptual desde hoy
- Crear tenant "NOMMA" y backfill de `tenant_id` en todas las filas existentes.
- `marca` → atributo dentro del tenant NOMMA (NOMMA/Brotes como marcas del mismo tenant, o tenants separados si se decide venderlos aparte).
- `organizaciones`/Aldea → branches/companies dentro del tenant correspondiente.
- Detalle y riesgos en [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md).
