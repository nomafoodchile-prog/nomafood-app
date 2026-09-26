# SECURITY_AUDIT — Auditoría de seguridad

> **Fecha:** 2026-09-26 · **Alcance:** seguridad, protección de datos, aislamiento multiempresa e IP. Complementa (no reemplaza) la auditoría general en [`../system/`](../system/SYSTEM_MASTER.md).
> **Método:** revisión directa del código. Lo no comprobable se marca `NO VERIFICADO` / `REQUIERE CONFIRMACIÓN`.
> **Regla cumplida:** no se copian valores de secretos; solo su nombre, ubicación y riesgo.

## 0. Resumen de hallazgos (severidad)

| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| SEC-01 | 🔴 CRITICAL | **Sin aislamiento multiempresa** (single-tenant; toda protección es filtro de app sobre tablas compartidas con service-role) | Bloquea clientes externos |
| SEC-02 | 🟠 HIGH | **Secreto de webhook hardcodeado** en el código (`minorista/pedido`, valor por defecto en git) | Abierto |
| SEC-03 | 🟠 HIGH | **`/api/cron/campanas` sin protección si falta `CRON_SECRET`** (chequeo condicional) | Abierto |
| SEC-04 | 🟠 HIGH | **Sin rate limiting** en endpoints públicos (login, crear-cuenta, enviar/reenviar-acceso, geocode, solicitud) | Abierto |
| SEC-05 | 🟡 MEDIUM | **Auditoría de acciones escasa** (finanzas, inventario, roles, permisos, config NO se auditan) | Abierto |
| SEC-06 | 🟡 MEDIUM | **RLS no verificada** + uso masivo de service-role que la ignora | Requiere revisión |
| SEC-07 | 🟡 MEDIUM | **Enumeración de usuarios y spam** vía endpoints públicos de cuenta/acceso | Abierto |
| SEC-08 | 🟡 MEDIUM | **Política de contraseñas débil** (mín. 6, sin complejidad) y **sin MFA** para la Central/admins | Abierto |
| SEC-09 | 🟡 MEDIUM | **Sin offboarding automatizado** de ex-trabajadores; portales por **token en la URL** (fuga por logs/compartir) | Abierto |
| SEC-10 | 🟡 MEDIUM | **Sin migraciones versionadas** → no se puede verificar/reproducir el estado de seguridad de la BD; **restore de backup no probado** | Abierto |
| SEC-11 | 🔵 LOW | **`geocode` proxy abierto** (costo/abuso, política de Nominatim) | Abierto |
| SEC-12 | ✅ POSITIVO | Secretos fuera del repo (salvo SEC-02); service-role no expuesto al navegador; sin source maps; CORS restringido; tokens de portal fuertes (256-bit); checks de propiedad presentes | — |

## 1. Aislamiento entre empresas (detalle en [`TENANT_ISOLATION.md`](./TENANT_ISOLATION.md))

- **No existe `tenant_id`/`company_id`** en las tablas núcleo. La "separación" hoy es:
  - por **`marca`** (filtro `WHERE marca = ...` en catálogo/portal) — es un **filtro**, no un límite de seguridad;
  - por **`organizacion_id`** solo en `mayoristas`/`mayorista_usuarios`/`aldea_*` (modela sucursales de un cliente).
- Las APIs usan **service-role** (ignora RLS); la protección depende de que **cada consulta** incluya el filtro correcto. **Un solo endpoint sin filtro = fuga.**
- **Hoy (single-tenant) el riesgo no es explotable entre empresas** porque solo hay una empresa; **al incorporar una segunda empresa sin capa de tenant, sí lo sería** → **CRITICAL para vender**.

## 2. Autenticación y autorización (detalle en [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md))

- **Central:** Supabase Auth (email/clave, hashing y JWT gestionados por Supabase). Sesión por cookies validada en `middleware.ts`. Autorización por **rol string** en cada endpoint (arrays copiados).
- **Portales:** token propio (`mayoristas.token` = `gen_random_bytes(32)` hex, **fuerte**) o login dedicado. `set-password` usa token sha256 de un solo uso con expiración (**buen diseño**).
- **Faltantes:** MFA/2FA (ninguno), política de contraseñas robusta, expiración/rotación de sesión configurada explícitamente (`NO VERIFICADO`), **offboarding automatizado** (depende de `activo=false` manual).
- **Mínimo privilegio:** parcial. El uso de service-role en casi todas las APIs es lo contrario a mínimo privilegio a nivel de datos (la app es "superusuario" y se autolimita por código).

## 3. Seguridad de base de datos

- **Exposición:** la BD Supabase no se conecta directo desde el cliente con service-role (solo server). El navegador usa anon key + RLS. ✅
- **RLS:** activa en ~68 tablas, pero **no auditada** su correctitud; muchas rutas la sortean con service-role (SEC-06).
- **Cifrado en reposo/tránsito:** gestionado por Supabase (TLS, cifrado en reposo) — `NO VERIFICADO` el detalle de configuración.
- **Migraciones:** manuales, sin versionar (SEC-10) → el estado real de políticas/constraints **no es reproducible ni auditable** desde el repo.
- **Borrado:** patrón **soft-delete** por `estado`/`activo` en documentos de negocio (✅, tras corregir un DELETE físico previo — ver system/KNOWN_ISSUES).
- **Funciones que saltan aislamiento:** el propio patrón service-role. `REQUIERE CONFIRMACIÓN` de funciones/RPC en la BD viva (no todas están en el repo).

## 4. Seguridad de APIs — tabla

Leyenda: **AuthN** = exige identidad · **AuthZ** = valida rol/propiedad · **Tenant** = filtra por dueño.

| Endpoint | AuthN | AuthZ | Tenant/Owner check | Riesgo | Observaciones |
|---|---|---|---|---|---|
| `api/central/**` (mayoría) | ✅ sesión | ✅ rol (arrays) | ⚠️ por `marca`/implícito | MEDIUM | AuthZ correcta pero duplicada; sin tenant real |
| `api/central/orden-compra[-minorista]/[id]` | ✅ | ✅ rol | ⚠️ no valida marca del pedido | LOW-MEDIUM | Admin ve cualquier pedido (ok en single-tenant; **IDOR cross-tenant** en multi) |
| `api/portal/mayoristas/[token]` (+ sub) | ✅ token 256-bit | ✅ por token | ✅ `mayorista_id` | LOW | Token en URL (SEC-09); ownership verificado en cancelar-pedido |
| `api/portal/mayoristas/set-password` | ✅ token 1-uso | ✅ | ✅ | LOW | Buen diseño; contraseña mín. 6 (SEC-08) |
| `api/portal/{chofer,operario,picker}/[token]` | ✅ token | ✅ por token | `REQUIERE CONFIRMACIÓN` scope por dueño | MEDIUM | Verificar que un token no acceda a datos de otro |
| `api/minorista/pedido` | ⚠️ secreto compartido | — | — | **HIGH** | **Secreto hardcodeado** (SEC-02); escribe/actualiza pedidos |
| `api/cron/campanas` | ⚠️ `CRON_SECRET` condicional | — | — | **HIGH** | Sin secret seteada → abierto (SEC-03); dispara correos masivos |
| `api/mayoristas/crear-cuenta` | ❌ público | ❌ | — | MEDIUM | Crea cuentas + correos; enumeración/spam (SEC-07) |
| `api/mayoristas/enviar-acceso`, `portal/mayoristas/reenviar-acceso` | ❌ público | ❌ | — | MEDIUM | Envío de correos de acceso; abuso/enumeración |
| `api/mayoristas/solicitud`, `api/importacion/solicitud` | ❌ público (form) | ❌ | — | LOW-MEDIUM | Leads; CORS restringido en `solicitud`; falta rate limit/captcha |
| `api/landing/productos`, `api/track` | ❌ público | — | — | LOW | Datos públicos por diseño |
| `api/marketing/webhook`, `api/marketing/baja` | ⚠️ | — | — | MEDIUM | Verificar firma del webhook (`REQUIERE CONFIRMACIÓN`) |
| `api/geocode` | ❌ público | — | — | LOW | Proxy a Nominatim sin límite (SEC-11) |

> **Inyección SQL:** bajo riesgo — se usa el cliente Supabase (consultas parametrizadas), no SQL string. **XSS:** React escapa por defecto; revisar cualquier `dangerouslySetInnerHTML` (`REQUIERE CONFIRMACIÓN`). **CSRF:** las APIs usan JSON + cookies SameSite (Supabase); `REQUIERE CONFIRMACIÓN` de `SameSite`. **Mass assignment:** varias APIs insertan objetos armados a mano (bajo riesgo), pero conviene validar con zod en todas.

## 5. Secretos y credenciales (detalle sin valores)

| Secreto | Servicio | Ubicación actual | Riesgo | Acción |
|---|---|---|---|---|
| `MINORISTA_SYNC_SECRET` | Webhook WooCommerce→Central | **valor por defecto hardcodeado en `app/api/minorista/pedido/route.ts`** | **HIGH** — cualquiera con el repo inyecta pedidos | Quitar el default; exigir env; rotar el valor |
| `CRON_SECRET` | Cron de campañas | env (chequeo condicional) | HIGH | Exigir siempre; fallar si falta |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | env server (correcto) | — (bien) | Mantener fuera de `NEXT_PUBLIC_` |
| `RESEND_API_KEY`, `MERCADO_PAGO_ACCESS_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `PAYMENT_WEBHOOK_SECRET`, `WEBPAY_API_KEY` | varios | env (según `.env.example`) | MEDIUM | Bóveda por empresa a futuro (SaaS) |
| Datos bancarios (RUT/cuenta) | Transferencia | **hardcodeados en `lib/transferencia.ts`** | LOW-MEDIUM (no secreto, pero config de empresa en código) | Mover a config por tenant |

✅ **Bien:** `.env`/`.env.local` en `.gitignore`; solo `.env.example` (demo) versionado; **ningún JWT/clave real** encontrado en archivos versionados; el service-role **no** llega al navegador (sin prefijo `NEXT_PUBLIC_`).

## 6–12
Ver documentos dedicados: infraestructura y ambientes → [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md) · modelo de amenazas → [`THREAT_MODEL.md`](./THREAT_MODEL.md) · datos → [`DATA_MAP.md`](./DATA_MAP.md) · privacidad → [`PRIVACY_ARCHITECTURE.md`](./PRIVACY_ARCHITECTURE.md) · IA → [`AI_SECURITY.md`](./AI_SECURITY.md) · backups → [`BACKUP_RECOVERY.md`](./BACKUP_RECOVERY.md) · incidentes → [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md) · licencias → [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md) · protección de código/IP → [`IP_PROTECTION.md`](./IP_PROTECTION.md).

## Plan de corrección priorizado

### P0 — CRÍTICO antes de clientes externos
- **SEC-01** Implementar capa **multi-tenant + RLS por `tenant_id`** con **tests de aislamiento** (un test que pruebe que Empresa A no ve datos de B). Prerrequisito de venta.
- **SEC-02** Eliminar el secreto hardcodeado del webhook; exigir env y **rotarlo**.
- **SEC-03** Hacer obligatorio `CRON_SECRET` (fallar si falta).

### P1 — Alta prioridad
- **SEC-04** Rate limiting + captcha en endpoints públicos (login, crear-cuenta, enviar/reenviar-acceso, solicitud, geocode).
- **SEC-06** Auditar y endurecer **políticas RLS**; reducir uso de service-role donde se pueda.
- **SEC-07** Respuestas uniformes (anti-enumeración) en flujos de cuenta/acceso.
- **SEC-08** Política de contraseñas + **MFA para roles administrativos**.

### P2 — Importante
- **SEC-05** Auditoría de acciones en finanzas, inventario, usuarios, roles, permisos, config, integraciones.
- **SEC-09** Offboarding automatizado (revocar sesión/rol al desactivar); acortar vida de tokens y evitar datos sensibles en la URL.
- **SEC-10** Migraciones versionadas + **prueba de restore** de backup documentada.

### P3 — Mejora futura
- **SEC-11** Límite/caché en `geocode`.
- Validación con **zod** en todos los endpoints; WAF/headers de seguridad (CSP), monitoreo y alertas.

> **No implementar aún.** Este plan espera aprobación. La Fase 0 (system) **no debe comenzar** hasta resolver al menos P0.
