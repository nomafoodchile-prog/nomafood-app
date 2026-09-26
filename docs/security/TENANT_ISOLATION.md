# TENANT_ISOLATION — Aislamiento entre empresas

> El tema más importante para vender como SaaS B2B. Verificado en esquema y código.

## 1. Estado actual: SINGLE-TENANT

- **No hay `tenant_id` / `company_id`** en las tablas de negocio (`products`, `recetas`, `operarios`, `proveedores`, `inventario_*`, `fin_*`, `mkt_*`, `op_*`, `mayorista_pedidos`, `minorista_pedidos`, …).
- Existen dos discriminadores parciales, **ninguno es un límite de tenant**:
  1. **`products.marca`** (`'NOMMA FOOD'`, `'Brotes…'`): filtro de catálogo/portal. Sirve para separar marcas **del mismo dueño**, no empresas distintas.
  2. **`organizacion_id`** en `mayoristas`, `mayorista_usuarios`, `aldea_*`: modela **sucursales de un cliente** (Aldea), no un tenant de plataforma.

## 2. Cómo se "separa" hoy (capa por capa)

| Capa | Mecanismo actual | ¿Aísla empresas? |
|---|---|---|
| **Consultas** | `WHERE marca=…` / `WHERE mayorista_id=…` en cada endpoint | ❌ (filtro de app, no límite) |
| **Middleware** | solo valida sesión para la Central | ❌ no conoce empresas |
| **APIs** | service-role (ignora RLS) + chequeo de rol | ❌ dependen de recordar el filtro |
| **Base de datos** | RLS en 68 tablas, pero sorteada por service-role | ⚠️ parcial |
| **Almacenamiento de archivos** | fotos en `public/` y evidencias (`task_evidence_files`) | ❌ sin partición por empresa (`REQUIERE CONFIRMACIÓN` del bucket) |
| **Reportes/exportaciones** | consultas admin sin scope de tenant | ❌ |
| **Buscadores** | consultas directas | ❌ |
| **Caché** | `dynamic=force-dynamic` en portal (sin caché compartida sensible) | ⚠️ revisar por tenant a futuro |
| **Webhooks** | `minorista/pedido` (secreto), MP (por pedido) | ❌ sin tenant |
| **Integraciones** | credenciales **globales** (una cuenta Resend/MP/WhatsApp para todo) | ❌ compartidas |

## 3. Escenarios de fuga (clasificados)

> **Contexto:** hoy solo hay UNA empresa, por lo que estos escenarios **aún no son explotables entre empresas**. Se listan porque **se activarían al agregar una segunda empresa sin capa de tenant**.

| Escenario | Severidad al ser multi-empresa |
|---|---|
| Un admin de Empresa A consulta `products`/`fin_*`/pedidos y ve TODO (no hay filtro por empresa) | 🔴 CRITICAL |
| Endpoint `orden-compra/[id]` devuelve cualquier pedido por ID (IDOR cross-tenant) | 🔴 CRITICAL |
| Reportes/exportaciones sin scope → dump de otra empresa | 🔴 CRITICAL |
| Credenciales de integración compartidas → correos/pagos de A usan cuenta de B | 🟠 HIGH |
| Archivos/evidencias sin partición → acceso cruzado por URL | 🟠 HIGH |
| Búsqueda global de clientes/proveedores mezcla empresas | 🟠 HIGH |

## 4. Objetivo (multi-tenant seguro)

1. **`tenant_id` (empresa) en TODA tabla de negocio** + backfill a la empresa actual.
2. **JWT con `tenant_id`** (Supabase `app_metadata`), propagado a cada request.
3. **RLS por tenant en todas las tablas:** `USING (tenant_id = auth.jwt()->>'tenant_id')`.
4. **Reducir service-role**: usarlo solo para operaciones que realmente lo requieran; el resto con la sesión del usuario (RLS activa).
5. **Storage particionado por tenant** (prefijo `tenant_id/…` + políticas de bucket).
6. **Integraciones por tenant** (credenciales en bóveda, no globales).
7. **Tests de aislamiento automatizados**: suite que verifica que un usuario de A no puede leer/escribir datos de B en cada tabla y endpoint. **Sin esto, no se incorpora ningún cliente externo.**

## 5. Reutilizable
`organizaciones` y RLS existente son buenas semillas: la jerarquía objetivo es **tenant → organización/sucursal → usuario**, con RLS en el nivel tenant.
