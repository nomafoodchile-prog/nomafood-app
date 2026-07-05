# NOMMA FOOD — Estado técnico del sistema

_Actualizado: 2026-07-05. Documento de continuidad — **léelo primero** al abrir una sesión nueva._
_Rama activa: `feature/portal-chofer` · último commit: `1aae717`._

**Norte del proyecto:** CENTRALIZAR los portales con la Central, AUTOMATIZAR la comunicación en tiempo real (sin tener que estar revisando) y DEJAR HISTORIAL + DATA REAL de todo. Sistema entrelazado: Central ↔ Chofer ↔ Picker ↔ Operario ↔ Mayorista (con pasarela de pago).

---

## 1. Resumen ejecutivo
App web + sistema logístico y comercial para **NOMMA FOOD** (Alma Libre Grupo SpA), fábrica de alimentos vegetarianos/veganos que abastece cafeterías, universidades, minimarkets, oficinas y restaurantes.
Incluye: **Central administrativa** (gestión interna), **Portal Mayorista** (B2B con cuentas y pago online), **Landing pública** (captación de clientes), y **portales operativos por token** (Chofer, Picker, Operario).

## 2. Arquitectura
- **Frontend/Backend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS. API routes server-side en `app/api/**`.
- **Base de datos / Auth / Realtime / Storage:** Supabase (Postgres + RLS). Proyecto `nomafood-produccion`, ref `fufmwauofcqnlrfhcenq`.
- **Pagos:** Mercado Pago (Checkout Pro + webhook). **Credenciales de PRODUCCIÓN puestas** en Vercel.
- **Correos:** Resend (vía SMTP de Supabase para correos de auth). En transición a dominio propio.
- **Mapas:** Leaflet + OpenStreetMap (mapa en vivo), Nominatim (geocodificación, `/api/geocode`), Waze (deep-link navegación chofer).
- **Deploy:** Vercel (team `noma-food`, proyecto `nomafood-app`). Producción `nomafood-app.vercel.app`; preview de la rama activa: `https://nomafood-app-git-feature-portal-chofer-noma-food.vercel.app`.
- **Identidad visual (unificada en todo el repo):** azul marino `#1b2a4a`, dorado `#c9a24e`, crema `#f5f0e8`; verde para estados positivos, rojo para incidencias.
- **Utilidades:** `lib/supabase/server.ts` (`createServerClient` con service role), `lib/supabase/client.ts` (browser), `lib/notify.ts` (sonido+vibración con desbloqueo de audio), `components/central/{Panel,KpiCard,SalesChart,IncidenciaAlert}`.

### Autenticación y roles
- Supabase Auth (email+contraseña). Trigger `handle_new_user` crea `profiles` al registrarse.
- Enum `app_role`: `SuperAdmin, Gerencia, Administracion, EncargadoProduccion, Operario, Armado, Chofer, Mayorista`.
- Helpers RLS (security definer): `get_my_role`, `is_admin` (SuperAdmin/Gerencia/Administracion), `is_super_admin`, `get_my_driver_id`, `get_my_mayorista_id`.
- **Central** usa login `/login` (rol admin). **Portal Mayorista** usa `/portal/mayoristas/login` (rol Mayorista). **Portales Chofer/Picker/Operario** operan por **token en la URL** (además el chofer tiene login propio con sesión).

### Storage (buckets) y Realtime
- **Buckets:** `entregas` (foto de factura + firma del cliente), `incidencias` (fotos), `comprobantes` (fotos de compras del chofer).
- **Realtime habilitado en:** `mayorista_pedidos`, `driver_positions`, `incidencias`, `driver_messages`, `compras`, `compra_items`, `entregas`, `access_requests`. (`routes` NO.)

## 3. Módulos y estado real

Leyenda: ✅ terminado y probado · 🟡 construido, falta probar · ⚪ demo (datos de `lib/`, no conectado a Supabase) · 🔧 requiere config externa.

| Módulo | Ruta | Estado |
|---|---|---|
| **Dashboard Central** | `/dashboard` | ⚪ rediseñado al mockup; datos demo (`lib/operations`, `lib/finance`) |
| **Pedidos** | `/operaciones/pedidos` | ⚪ demo |
| **Producción** | `/operaciones/produccion` | ⚪ demo |
| **Tareas** | `/operaciones/tareas` | ⚪ demo |
| **Inventario** | `/operaciones/inventario` | ⚪ demo |
| **Despachos** | `/operaciones/despachos` | ⚪ demo (el monitoreo real está en `/operaciones/monitoreo`) |
| **Monitoreo en vivo** (GPS, choferes, pedidos, incidencias, entregas de hoy) | `/operaciones/monitoreo` | ✅ Supabase + Realtime + mapa Leaflet |
| **Incidencias (repositorio/historial)** | `/operaciones/incidencias` | ✅ Supabase + Realtime |
| **Mensajes a choferes** (bandeja, acuse, envío) | `/operaciones/mensajes` | ✅ Supabase + Realtime |
| **Limpieza** | `/operaciones/limpieza` | ⚪ demo |
| **Mantención** | `/operaciones/mantencion` | ⚪ demo |
| **Compras — Proveedores** | `/compras/proveedores` | ⚪ demo |
| **Compras — En curso** (checklist del chofer en vivo) | `/compras/en-curso` | ✅ Supabase + Realtime |
| **Finanzas** (Caja, Cobranza, Costos, Balance) | `/finanzas/*` | ⚪ demo (`lib/finance`) |
| **Comercial — Productos/Clientes/Campañas** | `/comercial/*` | ⚪ demo |
| **Comercial — Solicitudes de acceso** | `/comercial/solicitudes` | ✅ Supabase + Realtime (badge+sonido) |
| **Personas — Usuarios/Accesos** | `/personas/*` | ⚪ demo |
| **Gerencia — Marcha Blanca** | `/gerencia/marcha-blanca` | ⚪ demo |
| **Portal Chofer** (app con sesión) | `/chofer/*` | ✅ entregas, compras, mensajes, perfil, GPS, tiempo real |
| **Portal Mayorista (cuenta)** | `/portal/mayoristas/{login,crear-clave,cuenta}` | 🟡 login+cuenta+historial (falta Fase 2: catálogo/pago integrado) |
| **Portal Mayorista (token)** | `/portal/mayoristas/[token]` | ✅ catálogo + checkout + pago Mercado Pago |
| **Portal Picker (token)** | `/portal/picker/[token]` | 🟡 existe de fase previa |
| **Portal Operario (token)** | `/portal/operario/[token]` | 🟡 existe de fase previa |
| **Landing pública** | `/mayoristas` | ✅ mobile-first, SEO/OG, productos reales, formulario |

## 4. Portal Chofer (detalle) — ✅
Login, dashboard operativo (próxima entrega, cumplimiento, resumen, última sync), entregas con stepper (**Llegué → Entregar con foto + firma / No entregado / Incidencia**), **Compras** en checklist (precio por insumo, foto, agregar productos, total vs tope, finalizar), **Mensajes** (badge de no leídos + sonido/vibración + "Recibido" + "Llamar a la central"), Perfil, **reporte de GPS** en vivo (`driver_positions`), navegación **Waze**. El botón "Llegué al cliente" se **bloquea por cercanía GPS** (≤300 m si el pedido tiene coordenadas).

## 5. Flujo de estados de pedido (dos pistas)
`mayorista_pedidos`:
- **Pista Central** (`estado`): `borrador → confirmado → pagado → en_preparacion → listo_para_despacho → asignado` (+ `entregado` lo pone `registrar_entrega`; `cancelado`). Solo SuperAdmin avanza vía `avanzar_estado_pedido`.
- **Pista Chofer** (`estado_entrega`, enum): `pendiente → cargado → en_ruta → llego_cliente → entregado / no_entregado / incidencia`.

## 6. Migraciones (SQL en `supabase/`) — TODAS APLICADAS en producción
1. `products-schema.sql` — `products` (foundacional; SQL vive en rama de logística). 
2. `schema.sql` / `rls-policies.sql` — núcleo demo (inventario, recetas, pedidos, etc.).
3. `mayoristas-schema.sql` — `mayoristas`, `mayorista_pedidos`, `mayorista_pedido_items` (+ Mercado Pago).
4. `logistica-fase0.sql` — fundación logística (19 tablas, roles, RLS, Storage, Realtime; SQL en rama logística).
5. `logistica-fase1-setup.sql` — funciones de negocio + chofer de prueba.
6. `logistica-fase2a-completa.sql` — dos pistas de estado + funciones de despacho + `calcular_cumplimiento`.
7. `logistica-demo-datos-v2.sql` — datos demo (choferes/pedidos/compra/mensaje).
8. `logistica-fase2d-central.sql` — `incidencias.respuesta_central` + RPCs `resolver_incidencia`, `reasignar_pedido`.
9. `logistica-fase2d-plus.sql` — `driver_messages.recibido_at`; RPCs `enviar_mensaje_chofer`, `marcar_mensaje_recibido`; Compras (`compra_items` + precio/comprado/foto/nota) + RPCs `guardar_item_compra`, `agregar_item_compra`; realtime `compra_items`.
10. `logistica-fase2d-firma.sql` — RPC `guardar_firma_entrega` + realtime `entregas`.
11. `comercial-solicitudes.sql` — enum `solicitud_estado`; tablas `access_requests`, `access_request_events`, `landing_config`; `products.destacado/foto_url/descripcion_publica`; RLS; realtime `access_requests`.
12. `mayoristas-cuentas.sql` — rol `Mayorista`; `mayoristas.profile_id`; `get_my_mayorista_id()`.

### Funciones (RPC) principales
`get_my_role, is_admin, is_super_admin, get_my_driver_id, get_my_mayorista_id, avanzar_estado_pedido, registrar_llegada, registrar_entrega, guardar_firma_entrega, marcar_no_entregado, reportar_incidencia, resolver_incidencia, reasignar_pedido, iniciar_ruta, finalizar_ruta, calcular_cumplimiento, enviar_mensaje_chofer, marcar_mensaje_recibido, guardar_item_compra, agregar_item_compra, handle_new_user`.

### RLS (resumen)
- `access_requests`/`access_request_events`: solo `is_admin()` (inserción pública vía API con service role). `landing_config`: lectura pública.
- Tablas con `driver_id`: el chofer ve/edita lo suyo (`= get_my_driver_id()`), admin lee. `mayoristas`: el cliente ve su ficha (`profile_id = auth.uid()`), admin todo. `mayorista_pedidos`/items: política permisiva `to authenticated` (⚠️ ver Riesgos).

## 7. APIs (`app/api/`)
- `mayoristas/solicitud` (POST público, service role): valida, **dedup por email/RUT/teléfono**, crea solicitud + evento + outbox.
- `mayoristas/crear-cuenta` (POST): crea/vincula cuenta Auth del cliente + invitación por SMTP.
- `mayoristas/enviar-acceso` (POST): envía link de acceso por email/WhatsApp (flujo alternativo por token).
- `geocode` (GET): Nominatim con fallback calle→sector.
- `portal/mayoristas/[token]/pedido` (POST): crea pedido + **preferencia de Mercado Pago** (init_point).
- `portal/mayoristas/webhook` (POST): recibe notificación de pago → marca pedido `pagado` (acepta formato moderno e IPN/legacy).
- `portal/chofer/[token]/*` (dispatch, gasto, stop), `portal/operario/[token]/*` (incidencia, reporte, task), `portal/picker/[token]/item/*`.

## 8. Integraciones y su estado
- **Mercado Pago:** ✅ operativo. Credenciales de producción (`APP_USR-…`) en Vercel; webhook registrado en modo productivo (evento "Pagos"). Regla MP: **el dueño de la cuenta no puede pagarse a sí mismo** (se prueba con otra cuenta/tarjeta o usuarios de prueba). **Pendiente:** ingreso automático en Caja al aprobarse (la Caja hoy es demo).
- **Resend (correos):** 🔧 funciona en **modo prueba** (remitente `onboarding@resend.dev`) → **solo entrega a `nomafoodchile@gmail.com`**. **Pendiente Nataly:** verificar dominio `nomafood.cl` en Resend (registros DNS en NIC Chile) y cambiar el "Sender email" del SMTP de Supabase a `portal@nomafood.cl`.
- **SMTP de Supabase con Resend:** ✅ activado (host `smtp.resend.com`, puerto 465, user `resend`). Plantillas "Invite user" y "Reset Password" personalizadas con marca NOMMA FOOD.
- **WhatsApp Business API:** ⚪ preparado (envs + `notifications_outbox`), sin conectar. Hoy se usa botón `wa.me` de un toque desde el panel.

## 9. Estado Git
- Rama activa: **`feature/portal-chofer`** (worktree). Origin en `github.com/nomafoodchile-prog/nomafood-app`.
- Últimos commits: `1aae717` (rebuild SUPABASE key), `ce092c9`/`b15caff` (fixes webhook MP), `d03d8f0`/`4aca5c3` (cuentas mayorista + landing).
- PRs abiertos sin merge: **PR #1** `fix/bloqueantes-produccion`, **PR #2** `feature/central-pedidos-mayoristas`.
- `main` = producción (aún sin la logística/comercial nueva; todo vive en `feature/portal-chofer`).

## 10. Terminado y probado ✅
Landing pública + solicitudes → Central; cuentas mayorista con email+contraseña + recuperación; correo de invitación con marca (a `nomafoodchile@gmail.com` en modo prueba); Monitoreo en vivo (mapa GPS, cumplimiento, incidencias, entregas de hoy con comprobante); repositorio de incidencias; centro de mensajes a choferes; compras en curso; Portal Chofer completo; **pago Mercado Pago operativo** (checkout + webhook).

## 11. Construido, falta probar 🟡
Portal Mayorista con cuenta (login/cuenta/historial) — funciona pero le falta la **Fase 2** (catálogo con especificaciones, pago y promociones DENTRO de la cuenta; hoy "Ver catálogo" reusa el portal por token). Portales Picker/Operario (token) de fase previa: revisar y conectar al flujo central.

## 12. Pendiente
- **Ingreso automático en Caja** al aprobarse un pago (Caja real en base, no demo).
- **Verificar dominio en Resend** (para correos a clientes reales).
- **Migrar páginas demo de la Central a Supabase** (Pedidos, Producción, Inventario, Finanzas, etc.).
- **Fase 2 Portal Mayorista** (catálogo+specs+pago+promos en la cuenta).
- **GPS avanzado (2E):** velocidad/ETA/km/historial sobre `location_pings`.
- **WhatsApp Business API** real; **firma de webhook MP** (x-signature).
- Aplicar el estilo del Dashboard (components/central) al resto de páginas.

## 13. Problemas / riesgos / bloqueos
- ⚠️ **RLS permisiva** en `mayoristas`/`mayorista_pedidos`/`mayorista_pedido_items` (`to authenticated using(true)`) → un cliente logueado podría leer datos de otros. **Endurecer antes de producción.**
- ⚠️ **Datos cruzados de prueba:** un mismo correo (`nomafoodchile@gmail.com`) quedó ligado a varios mayoristas por pruebas → la cuenta toma el más reciente (parche `limit(1)`). En producción cada cliente tendrá su correo.
- ⚠️ **Resend modo prueba:** correos solo a `nomafoodchile@gmail.com` hasta verificar dominio.
- Sensible a que Nataly corra migraciones y edite envs (ya ocurrió una confusión anon vs service_role, resuelta).

## 14. Configuraciones externas pendientes por Nataly
1. **Resend:** verificar `nomafood.cl` (registros DNS en NIC Chile: DKIM `resend._domainkey` TXT, `send` MX+TXT SPF, `_dmarc` TXT) → luego cambiar Sender del SMTP a `portal@nomafood.cl`.
2. **Mercado Pago:** ✅ credenciales de producción y webhook ya configurados. (Opcional: agregar firma secreta.)
3. **Vercel:** (opcional) `NEXT_PUBLIC_SITE_URL` = URL pública, para back_urls/webhook.
4. **Prueba de pago real** con otra persona/tarjeta o usuarios de prueba de MP.
5. **Merge de PR #1 y #2** cuando corresponda.

## 15. Datos demo a limpiar antes de producción
- Solicitudes de prueba en `access_requests` (ej. "Diag …", "kkkk", "Osumed Latam", "Aldea vegetal", "A.V").
- Mayoristas/cuentas de prueba ligadas a `nomafoodchile@gmail.com` / `natyladera0406@gmail.com`.
- Pedidos/compras/mensajes/incidencias demo del chofer "Carlos".
- `landing_config` con zonas por defecto (ajustar a reales).
- Toda la data de páginas Central que hoy sale de `lib/` (es demo, no producción).

## 16. Usuarios de prueba (SIN contraseñas)
- `brotesladera@gmail.com` → **SuperAdmin** (Central). *(Se recuperó el acceso creando/ajustando su perfil como SuperAdmin.)*
- `chofer1@nommafood.cl` → **Chofer** de prueba (driver "Carlos Chofer").
- Cuentas mayorista de prueba: `nomafoodchile@gmail.com`, `natyladera0406@gmail.com`, `vicentea.0801@gmail.com` (rol Mayorista).
- Otros usuarios Auth existentes: `admin.nommafood@gmail.com`.

## 17. Ambientes / URLs de prueba
- Preview rama: `https://nomafood-app-git-feature-portal-chofer-noma-food.vercel.app`
  - Landing: `/mayoristas` · Login mayorista: `/portal/mayoristas/login` · Central: `/login`
  - Portal chofer: `/chofer/login`
- Producción (main, sin lo nuevo): `nomafood-app.vercel.app`
- Supabase SQL Editor: `https://supabase.com/dashboard/project/fufmwauofcqnlrfhcenq/sql/new`

## 18. Cómo continuar
Ver `docs/GUIA-REANUDAR-PROYECTO.md`. En resumen: leer este documento + el `RESPALDO-SESION` más reciente + `CHECKLIST-MAESTRO-NOMMA.md`, revisar `git log` en `feature/portal-chofer`, y continuar. El asistente sube código directo (git ok); Nataly corre migraciones en Supabase y da clics sensibles (envs, dominios, pagos).
