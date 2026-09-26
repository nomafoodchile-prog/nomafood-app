# ONBOARDING — Alta de una empresa nueva

> Meta: incorporar una empresa **sin modificar código**. Todo es datos + configuración.

## 1. Flujo ideal

```
CREAR TENANT → CREAR COMPANY → CONFIGURACIÓN → SUCURSALES → BODEGAS
  → USUARIOS → ROLES → PRODUCTOS → INVENTARIO → INTEGRACIONES → GO LIVE
```

| Paso | Qué hace | Automatizado |
|---|---|---|
| 1. Crear tenant | Panel super-admin: nombre, industria, plan | ✅ |
| 2. Plantilla de industria | Activa módulos + roles + catálogos base según industria (MODULE_ARCHITECTURE §2) | ✅ |
| 3. Company/razón social | RUT, config tributaria, folios (para DTE) | ✅ (config) |
| 4. Branding | Logo, colores, dominio/subdominio, plantillas de documento | ✅ (config) |
| 5. Sucursales / bodegas | El admin las crea en UI | ✅ |
| 6. Usuario admin | Invitación por email → set-password | ✅ |
| 7. Roles y permisos | Roles plantilla; personalización opcional | ✅ |
| 8. Productos | UI o **import CSV** | ✅/semi |
| 9. Recetas | UI o plantillas | semi |
| 10. Inventario inicial | Carga/ajuste o import | semi |
| 11. Integraciones | Asistente conecta cuentas del tenant (pago, correo, DTE, WhatsApp) con **sus** credenciales | ✅ |
| 12. Pruebas de aceptación | Checklist por módulo activo | manual guiado |
| 13. **GO LIVE** | Marcha blanca → producción (switch ya existe hoy) | ✅ |

## 2. Panel de super-admin (plataforma) — NEW
- Crea/gestiona tenants, planes, módulos, estado (activo/suspendido/baja).
- **No** accede a datos operativos de los tenants salvo soporte con consentimiento y auditoría (mínimo privilegio del operador de plataforma).
- Métricas de uso por tenant (Observability) para soporte y facturación.

## 3. Asistente de configuración (self-service, futuro)
- Wizard por industria que precarga catálogos, roles y módulos.
- Import de datos (CSV/Excel) para productos, clientes, proveedores, stock.
- Validaciones que impiden GO LIVE con configuración incompleta (p.ej. sin bodega, sin método de pago).

## 4. Qué hace que esto NO requiera código
- **Módulos** = flags (`tenant_modules`).
- **Roles/permisos** = datos (`roles`/`role_permissions`).
- **Branding, impuestos, estados, métodos de pago, reglas de stock** = `tenant_settings`/catálogos.
- **Integraciones** = adaptadores existentes + credenciales por tenant.
- Si algo **requiere código**, es porque falta una capacidad genérica → se agrega al producto para **todos**, no para ese cliente (CONFIGURATION_ENGINE §3).

## 5. Baja de tenant (offboarding)
- Export de datos del tenant (portabilidad).
- Suspensión → retención → **purga** (DB + Storage + vectores IA). Enlaza con security/PRIVACY (derecho de supresión) y STORAGE/BACKUP.
