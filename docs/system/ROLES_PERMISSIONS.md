# ROLES_PERMISSIONS — Roles y permisos

> Verificado buscando literales de rol en `app/` y `lib/`, y el patrón de autorización en los route handlers.

## 1. Cómo funciona hoy

- El rol vive como **texto** en `profiles.role`.
- **No hay tabla de roles ni de permisos** (no hay RBAC central). Cada endpoint decide con un **array de roles permitidos** escrito a mano.
- Patrón típico:
  ```ts
  const ADMIN_ROLES = ['SuperAdmin','Administracion','Gerencia','EncargadoProduccion']
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!ADMIN_ROLES.includes(String(me?.role||''))) return 403
  ```
- Los **portales externos** no usan `profiles.role`: se autentican por **token** o por login propio (`operarios`, `mayorista_usuarios`).

## 2. Roles encontrados (conteo de apariciones en código)

| Rol | Apariciones | Ámbito |
|---|---|---|
| `SuperAdmin` | 50 | acceso total |
| `Gerencia` | 50 | dirección |
| `Administracion` | 50 | administración |
| `EncargadoProduccion` | 33 | operaciones/producción |
| `Operario` | 13 | planta (portal operario) |
| `Chofer` | 11 | reparto (portal chofer) |
| `Contador` | 8 | finanzas (rol contador) |
| `Comercial` | 8 | ventas/marketing |
| `Finanzas` | 4 | finanzas |
| `Despacho` | 3 | logística |
| `Bodega` | 1 | inventario |

> Los tres roles "admin" (`SuperAdmin`, `Administracion`, `Gerencia`) aparecen 50 veces cada uno → son el **conjunto admin repetido** en casi todos los endpoints.

Roles de **cliente/organización** (portal Aldea): `admin_general`, `encargado_local` (en `mayorista_usuarios.rol`).

## 3. Problemas para el producto

1. **Autorización dispersa y duplicada.** El mismo array `ADMIN_ROLES` está copiado en decenas de archivos. Un cambio de política obliga a editar todos. **Riesgo de inconsistencia** (algún endpoint con el array incompleto).
2. **Roles fijos (no configurables).** Una empresa cliente no puede definir sus propios roles/permisos sin tocar código.
3. **Sin matriz de permisos por módulo.** No existe "este rol puede ver/editar este módulo" como dato.
4. **Autorizaciones a nivel de fila** dependen de RLS (activo) + chequeo en endpoint; conviven dos mecanismos → `REQUIERE CONFIRMACIÓN` de que ambos coinciden.

## 4. Objetivo para SaaS
- Tabla `roles` y `role_permissions` **por tenant**, con roles base plantilla por industria.
- Un **helper único** `requireRole(req, permiso)` en `lib/` que reemplace los arrays copiados.
- Permisos por **módulo activable** (ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md), feature flags).
