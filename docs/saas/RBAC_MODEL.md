# RBAC_MODEL — Identidad, roles y permisos

> Reemplaza los arrays de rol copiados (system/ROLES_PERMISSIONS) por un RBAC escalable y configurable por tenant.

## 1. Modelo

```
PERMISSION  = "modulo.accion"            (átomo; catálogo global de la plataforma)
ROLE        = conjunto de permissions    (plantilla global o custom por tenant)
USER_ROLE   = asigna un role a un usuario, opcionalmente con SCOPE (branch/warehouse)
```

- **Permisos** son un catálogo global fijo (lo que el software sabe hacer).
- **Roles** pueden ser **plantillas de sistema** (Propietario, Admin, Operario…) **o custom por tenant** (el cliente crea "Jefe de turno" con los permisos que quiera).
- **Scope**: un rol puede limitarse a una sucursal/bodega (p.ej. "Bodeguero de Sucursal Centro").

## 2. Catálogo de permisos (`modulo.accion`) — ejemplos

| Módulo | Permisos |
|---|---|
| dashboard | `dashboard.read` |
| productos | `productos.read`, `productos.write`, `productos.delete` |
| inventario | `inventario.read`, `inventario.adjust`, `inventario.transfer`, `inventario.count` |
| recetas | `recetas.read`, `recetas.write`, `recetas.approve` |
| produccion | `produccion.read`, `produccion.assign`, `produccion.start`, `produccion.close` |
| compras | `compras.read`, `compras.request`, `compras.approve`, `compras.receive` |
| ventas/pedidos | `pedidos.read`, `pedidos.create`, `pedidos.validate`, `pedidos.cancel` |
| finanzas | `finanzas.read`, `finanzas.approve`, `caja.open`, `caja.close`, `cxc.manage`, `cxp.manage` |
| facturacion | `factura.emit`, `factura.void` |
| usuarios | `usuarios.read`, `usuarios.manage`, `roles.manage` |
| config | `config.read`, `config.manage`, `integraciones.manage` |
| auditoria | `auditoria.read` |

> Convención: `read` < `write`/`action` < `approve`/`manage`. Acciones sensibles (`approve`, `void`, `manage`, `delete`) siempre auditadas.

## 3. Roles plantilla (sistema) — punto de partida
Propietario, Administrador, Gerencia, Finanzas, Contador/Auditor (solo lectura financiera), Encargado de Producción, Operario, Bodega, Picker, Chofer, Comercial, Cobranza, RRHH, Mantención, **Solo lectura**.
- Son **plantillas**: al crear un tenant se instancian y el cliente puede **clonarlas y personalizarlas**. No son rígidas.

## 4. Enforcement (backend es la autoridad)
```ts
// Pseudocódigo del helper único
await requirePermission(req, 'inventario.adjust', { branchId })
// 1) resuelve tenant_id + user del JWT (no del body)
// 2) carga permisos efectivos del usuario en ESE tenant (roles + scope)
// 3) valida el permiso y el scope (branch/warehouse)
// 4) si falla → 403 genérico (sin filtrar info)
```
- **RLS** por tenant es la segunda barrera (aunque el permiso pase, RLS impide tocar otro tenant).
- Los permisos se **cachean por request** (no por sesión larga) para reflejar revocaciones rápido.

## 5. Ciclo de vida de usuarios
| Acción | Diseño |
|---|---|
| **Invitación** | admin invita por email → `tenant_users` (estado `invitado`) → el usuario fija clave (flujo tipo `set-password` actual, ya robusto) |
| **Activación/roles** | admin asigna roles + scope |
| **Desactivación** | `estado=inactivo` → **revoca sesión** (invalidar refresh tokens en Supabase) inmediatamente |
| **Revocación inmediata** | permisos leídos por-request + invalidación de sesión → efecto inmediato (corrige security/SEC-09 offboarding) |
| **Sesiones** | expiración/rotación configuradas explícitamente; refresh controlado |
| **MFA (futuro)** | 2FA para roles administrativos (security/SEC-08) |
| **Auditoría** | alta/baja/cambio de rol y permiso → audit log |
| **Mínimo privilegio** | roles acotados por defecto; scope por sucursal/bodega |

## 6. Anti-patrones a eliminar (de hoy)
- ❌ Arrays `ADMIN_ROLES` copiados en cada endpoint → ✅ `requirePermission()`.
- ❌ Rol como string libre en `profiles.role` → ✅ tablas `roles`/`user_roles` por tenant.
- ❌ Autorización que depende de service-role → ✅ RLS + permiso por request.
