# PORTALS — Portales externos

> Verificado en `app/(portales)/**` y `app/api/portal/**`. Cada portal gestiona su propia autenticación (el middleware los deja públicos).

Hay **dos generaciones** de portales conviviendo:
- **`app/(portales)/portal/<rol>/[token]`** → acceso por **token en la URL** (enlace mágico, sin login).
- **`app/(portales)/<rol>/login` + `(app)`** → **login dedicado** con sesión propia (generación más nueva; ej. chofer, operario, aldea).

`REQUIERE CONFIRMACIÓN`: cuáles enlaces están vigentes en producción para cada cliente.

---

## 1. Portal MAYORISTAS (clientes B2B)
- **Rutas:** `/mayoristas`, `/portal/mayoristas/[token]`, `/portal/mayoristas/login`, `/portal/mayoristas/cuenta`, `/portal/mayoristas/crear-clave`
- **API:** `/api/portal/mayoristas/[token]` (catálogo/carrito), `/pedido`, `/pagar`, `/verificar-pago`, `/webhook`, `/cancelar-pedido`, `/direccion`, `/set-password`, `/reenviar-acceso`; alta: `/api/mayoristas/crear-cuenta`, `/enviar-acceso`, `/solicitud`
- **Usuarios:** clientes mayoristas (cafeterías, minimarkets…). **Rol de datos:** `mayoristas`, `mayorista_usuarios`.
- **Funciones:** ver catálogo por **marca** (filtro `marca` + `visible_catalogo`), armar pedido, elegir dirección, **pagar (MercadoPago o transferencia)**, ver estado.
- **Tablas:** `mayoristas`, `mayorista_usuarios`, `mayorista_pedidos`, `mayorista_pedido_items`, `mayorista_direcciones`, `organizaciones` (para Aldea).
- **Estado:** IMPLEMENTADA. **Correo transaccional** ("recibido", "en ruta") vía Resend.
- **Acoplamiento a marca:** el enlace del portal cambia según marca (`lib/marca-portal.ts`: NOMMA vs Brotes). Ver [`SAAS_MIGRATION_PLAN.md`](./SAAS_MIGRATION_PLAN.md).

## 2. Portal CHOFER (reparto)
- **Rutas:** `/chofer/login`, `/chofer/(app)/entregas`, `/perfil`, `/mensajes`, `/compras`; legacy: `/portal/chofer/[token]`
- **API:** `/api/portal/chofer/[token]`, `/dispatch/[dispatchId]`, `/stop/[stopId]`, `/gasto`, `/notificar-en-ruta`
- **Usuarios:** choferes de reparto. **Funciones:** ver ruta/entregas, marcar paradas, **notificar "en ruta"** (dispara correo al cliente), registrar gastos, mensajería con Central, mapa (Leaflet).
- **Tablas:** `dispatches`, `stops`(en `dispatches`/logística), `op_mensajes`, gastos. **Estado:** IMPLEMENTADA.

## 3. Portal OPERARIO (planta)
- **Rutas:** `/operario/login`, `/operario/(app)/tareas/[id]`, `/produccion`, `/limpieza`, `/asistencia`, `/perfil`; legacy: `/portal/operario/[token]`
- **API:** `/api/portal/operario/[token]`, `/task/[taskId]`, `/reporte`, `/incidencia`, `/limpieza`
- **Usuarios:** operarios de producción (tabla `operarios` — identificados por `profile_id`, `area`, `turno_default`).
- **Funciones:** jornada (entrada/salida), tareas asignadas, **producción paso a paso con ingredientes escalados por tandas** (lee `receta_ingredientes`), checklists de limpieza, asistencia, incidencias.
- **Tablas:** `operarios`, `op_tareas`, `op_jornadas`, `op_tarea_cierre`, `op_produccion_pasos`, `op_asistencia`, `receta_*`. **Estado:** IMPLEMENTADA.
- ⚠️ **Duplicación viva:** coexisten `operarios` y `operators` (ambas referenciadas en código). Ver [`TECH_DEBT.md`](./TECH_DEBT.md).

## 4. Portal PICKER (armado de pedidos)
- **Rutas:** `/portal/picker/[token]` · **API:** `/api/portal/picker/[token]`, `/item/[itemId]`
- **Usuarios:** personal de bodega/armado. **Funciones:** lista de picking por pedido, marcar ítems.
- **Tablas:** `picking_tasks` (uso bajo en código). **Estado:** PARCIAL / generación token (`REQUIERE CONFIRMACIÓN` de uso real).

## 5. Portal ALDEA (cliente corporativo multi-sucursal)
- **Rutas:** `/portal/aldea/login`, `/portal/aldea/(app)` · **API:** `/api/portal/aldea/*` (session, pedidos, stock, recepcion, facturas, incidencias, solicitud)
- **Usuarios:** encargados de las 3 cafeterías de **Aldea Vegetal** (cliente interno). Roles: `admin_general` (ve todas las sucursales) / `encargado_local` (solo la suya).
- **Funciones:** catálogo propio, pedidos entre sucursales/central, stock por local, recepción, facturas, incidencias.
- **Tablas:** `organizaciones`, `mayorista_usuarios` (con `organizacion_id`), `aldea_*`. **Estado:** IMPLEMENTADA (fundación).
- **Nota de producto:** este portal es la **prueba de concepto más cercana a multi-tenant** (un cliente con varias sucursales bajo una organización), pero está modelado como **caso particular**, no como capacidad genérica de la plataforma.

---

## Resumen por portal

| Portal | Auth | Estado | Acoplado a empresa actual |
|---|---|---|---|
| Mayoristas | token + clave | IMPLEMENTADA | Sí (marca NOMMA/Brotes) |
| Chofer | login | IMPLEMENTADA | Bajo |
| Operario | login | IMPLEMENTADA | Bajo (pero duplicación operarios/operators) |
| Picker | token | PARCIAL | Bajo |
| Aldea | login | IMPLEMENTADA | **Alto** (cliente específico) |
