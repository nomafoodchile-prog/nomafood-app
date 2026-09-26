# CONFIGURATION_ENGINE — Motor de configuración

> Objetivo: **evitar código personalizado por cliente.** Las diferencias entre empresas se resuelven con **configuración (datos)**. Este documento define la frontera configuración vs. desarrollo.

## 1. Dónde vive la configuración
- **`tenant_settings(tenant_id, group, key, value jsonb)`** — clave/valor por grupo, por tenant.
- **`tenant_modules`** — módulos activos.
- **`tenant_integrations`** — conectores + credenciales (bóveda) por tenant.
- Tablas de catálogo por tenant: `categorias`, `estados_pedido`, `metodos_pago`, `impuestos`, `monedas`, `bodegas`, etc.

## 2. Qué es CONFIGURACIÓN (sin desarrollo)

| Ámbito | Ejemplos configurables |
|---|---|
| **Estructura** | sucursales, bodegas, companies/razones sociales |
| **Catálogos** | categorías, unidades, estados de pedido, motivos de merma |
| **Comercial** | métodos de pago, listas de precio, descuentos, mínimos de compra, condiciones de crédito |
| **Tributario** | impuestos (IVA %), moneda, config DTE por company |
| **Inventario** | stock mínimo, stock de seguridad, reglas de reserva, política de lotes/vencimiento |
| **Operación** | horarios, turnos, áreas, checklists de limpieza/mantención |
| **Branding** | logo, colores, nombre visible, dominio/subdominio, plantillas de documento (OC, factura, guía) |
| **Notificaciones** | qué eventos notifican, por qué canal (email/WhatsApp), a quién |
| **Flujos de aprobación** | quién aprueba compras/pagos/producción, umbrales |
| **Permisos** | roles custom y asignaciones |
| **Módulos** | activar/desactivar |

## 3. Qué requiere DESARROLLO (no es configuración)
- Un **módulo nuevo** o una **acción nueva** que el software no sabe hacer.
- Un **conector de integración nuevo** (nuevo adaptador en el Integration Hub).
- Un **modelo de datos nuevo** (entidad que no existe).
- Reglas de negocio **estructuralmente distintas** (p.ej. un método de costeo no soportado).
- Cambios en el **motor** (RBAC, tenancy, inventario).

> **Regla de decisión:** si la diferencia entre dos clientes se puede expresar como **valores** sobre un comportamiento ya soportado → **configuración**. Si requiere **lógica nueva** → desarrollo (y debe nacer **genérico**, no "para el cliente X").

## 4. Branding / White-label (reemplaza el hack actual)
- Hoy: `lib/marca-portal.ts` con `includes('brotes')` (2 marcas hardcodeadas).
- Objetivo: `tenant_settings` con `branding.logo_url`, `branding.colors`, `branding.domain`, plantillas de documento. El portal lee el branding **del tenant activo** (o del dominio → tenant, validado server-side).

## 5. Flujos de aprobación (motor genérico)
- Definición por tenant: `approval_rules(tenant_id, tipo, umbral, rol_aprobador, pasos)`.
- Aplicable a compras, pagos, producción, ajustes de inventario, notas de crédito.
- El motor evalúa la regla y crea tareas de aprobación → auditables.

## 6. Antipatrón a evitar
- ❌ `if (tenant === 'X')` en el código. **Prohibido.** Toda ramificación por cliente = bug de arquitectura. Si aparece, es señal de que falta una opción de configuración o un módulo genérico.
