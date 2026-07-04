# NOMMA FOOD — Estado técnico del sistema

_Documento de continuidad. Última actualización: sesión de construcción del Portal del Chofer (Fase 2B)._
Si abres una sesión nueva, lee esto primero para retomar sin perder el rumbo.

---

## 1. Resumen
App web B2B + sistema de logística de despacho para Nomma Food (Alma Libre Grupo SpA).
Stack: **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Auth/Postgres/Realtime/Storage) + Mercado Pago + Resend**. Deploy en **Vercel**.

Identidad visual: verde bosque `#1f3d2c`, dorado `#c9a24e`, crema `#f5efe2`, verde éxito `#3b6d11`.

## 2. Accesos e infraestructura
- **Repo:** `github.com/nomafoodchile-prog/nomafood-app`. Local con git: `~/Downloads/nomafood-upload/nomafood-app`. **`git push` ya funciona** (token en el llavero del Mac; el asistente sube código directo).
- **Supabase:** proyecto `nomafood-produccion`, ref `fufmwauofcqnlrfhcenq`. La URL y anon key son públicas (van en el bundle).
- **Vercel:** team `noma-food`, proyecto `nomafood-app`. Producción: `nomafood-app.vercel.app`. **Deployment Protection deshabilitada** (Vercel Authentication → Only Production) para poder probar previews en el teléfono.
- **Regla de trabajo:** el asistente sube el código; la usuaria corre las migraciones en Supabase (SQL Editor → Run) y da los clics sensibles (merges, contraseñas, token MP).

## 3. Ramas (branches)
| Rama | Contenido | Estado |
|---|---|---|
| `main` | App en producción (portal mayorista, app central demo) | producción |
| `fix/bloqueantes-produccion` | **PR #1** — 5 bloqueantes (webhook MP, confirmación pago, middleware, RLS roles, imágenes) | abierto, sin merge |
| `feature/central-pedidos-mayoristas` | **PR #2** — página "Pedidos Mayoristas" en app central | abierto, sin merge, **probado OK** |
| `feature/logistica-fase0` | SQL Fase 0 + funciones Fase 1 | migraciones aplicadas |
| `feature/portal-chofer` | **Rama activa** — portal del chofer + migraciones Fase 1 setup y Fase 2A | migraciones aplicadas |

## 4. Base de datos (Supabase) — migraciones APLICADAS en producción
1. `supabase/products-schema.sql` — tabla `products` + 10 productos mayoristas.
2. `supabase/logistica-fase0.sql` — **fundación**: 19 tablas, rol `SuperAdmin`, RLS de aislamiento por chofer, buckets de Storage (`entregas`, `incidencias`, `comprobantes`), tiempo real.
3. `supabase/logistica-fase1-setup.sql` — funciones de negocio + semilla (bodega, chofer, pedidos asignados).
4. `supabase/logistica-fase2a-completa.sql` — **dos pistas de estado**, funciones de despacho, `calcular_cumplimiento`, limpieza de datos de prueba.

### Tablas principales
`profiles` (rol), `drivers`, `vehicles`, `warehouses`, `driver_shifts`, `routes`, `route_stops`,
`mayorista_pedidos` (ampliada: `chofer_id`, `route_id`, `warehouse_id`, `lat/lng`, `telefono_entrega`, `hora_programada`, `bultos`, `estado`, **`estado_entrega`**, `hora_llegada_real`, `hora_entrega_real`),
`pedido_estado_historial`, `entregas` (foto obligatoria), `incidencias`, `location_pings`, `driver_positions`,
`compras`, `compra_items`, `compra_comprobantes`, `compras_sin_factura`, `jornada_resumen`, `driver_messages`, `notifications_outbox`.

### Dos pistas de estado (decisión clave)
- **Pista Central (`estado`, texto):** `confirmado → pagado → en_preparacion → listo_para_despacho → asignado`. Solo SuperAdmin la mueve (`avanzar_estado_pedido`). Admin solo visualiza.
- **Pista Chofer (`estado_entrega`, enum):** `pendiente → en_ruta → llego_cliente → entregado / no_entregado / incidencia`. Solo el chofer, desde su portal.

### Funciones (RPC, SECURITY DEFINER)
`get_my_role`, `get_my_driver_id`, `is_admin`, `is_super_admin`, `transicion_valida`,
`avanzar_estado_pedido` (SuperAdmin), `registrar_llegada`, `registrar_entrega` (exige foto + receptor),
`marcar_no_entregado`, `reportar_incidencia`, `iniciar_ruta`, `finalizar_ruta` (bloquea si hay pendientes),
`calcular_cumplimiento`.

### Usuarios y semilla
- `admin.nommafood@gmail.com` → **SuperAdmin** (login de la app central).
- `chofer1@nommafood.cl` → **Chofer** de prueba (driver "Carlos Chofer", bodega "Bodega Central"). Login del portal chofer.
- `natyladera0406@gmail.com`, `nomafoodchile@gmail.com` → Chofer (sin driver).
- Pedidos de prueba asignados a Carlos (`estado='asignado'`, `estado_entrega='pendiente'`), mayorista de prueba renombrado a "Juan Pérez / Distribuidora Verde Ltda".

## 5. Rutas / Portales (código)
- **App central (auth):** `app/(central)/operaciones/pedidos-mayoristas` (PR #2). Login `/login` (Supabase Auth).
- **Portal Chofer (auth, verde Nomma):** `app/(portales)/chofer/login`, `/chofer` (dashboard), `/chofer/entregas`, `/chofer/entregas/[id]`, `/chofer/compras`, `/chofer/mensajes`, `/chofer/perfil`. Usa el cliente browser de Supabase + `supabase.rpc()` + **Realtime** (respeta RLS). Middleware permite `/chofer`.
- **Portal Mayorista (por token):** `app/(portales)/portal/mayoristas/[token]`.
- Preview del chofer: `https://nomafood-app-git-feature-portal-chofer-noma-food.vercel.app/chofer/login` (QR para el teléfono).

## 6. Integraciones
- **Supabase:** Auth (sesión), Postgres + RLS, **Realtime** (postgres_changes filtrado por chofer), Storage (fotos privadas).
- **Mercado Pago:** checkout + webhook. `MERCADO_PAGO_ACCESS_TOKEN` existe en Vercel pero **el link de pago aún no genera `init_point`** → falta confirmar que el token sea el real de producción de la cuenta MP.
- **Resend** (correo), **Google Maps** (deep link "Navegar"). **WhatsApp / Push / Waze / firma / QR** = futuro (`notifications_outbox` deja la estructura lista).

## 7. Hecho ✅
- Auditoría + 5 bloqueantes (PR #1).
- Página "Pedidos Mayoristas" en la app central (PR #2, probada).
- Fundación de logística (Fase 0), lógica de negocio (Fase 1), dos pistas de estado + operación (Fase 2A).
- **Portal del Chofer (Fase 2B):** login, dashboard operativo (próxima entrega, botones grandes, cumplimiento, bienvenida, resumen), detalle con stepper del chofer, entrega con foto, incidencias, no entregado, iniciar/finalizar ruta, **tiempo real** en las 3 pantallas.

## 8. Pendiente / roadmap
- **Fase 2C:** Panel Central de monitoreo en vivo (mapa con todos los choferes, estados e incidencias en tiempo real). ← siguiente.
- **Fase 2D:** firma digital opcional en entrega; gestión de incidencias desde la Central (responder, reasignar, cerrar).
- **Fase 2E:** GPS en vivo (`location_pings` + `driver_positions` + mapa + velocidad/ETA/km/historial de recorrido).
- **Fase 2F:** Compras real, Mensajes = "Avisos de Central", badges numéricos en el menú, Perfil con vehículo real.
- **Config:** poner el **token real de Mercado Pago** en Vercel; **merge de PR #1 y #2** a producción; limpiar datos de prueba antes de producción.

## 9. Decisiones tomadas
- Dos pistas de estado (Central vs Chofer); el chofer solo mueve su pista; admin solo lee salvo SuperAdmin.
- Enfoque **API-first / Supabase-native** (browser client + RLS + RPC SECURITY DEFINER + Realtime) → listo para apps nativas Android/iOS sin reescribir.
- Arquitectura escalable: multi-chofer, multi-vehículo, multi-bodega, multi-ruta desde el día uno.
- Sin soluciones temporales ni datos hardcodeados; toda la data viene de la base.

## 10. Notas prácticas (evitar tropiezos)
- El **SQL Editor de Supabase corre el script como UNA transacción**: si algo falla al final, revierte todo. Migraciones idempotentes.
- El enlace **`raw.githubusercontent.com` cachea ~5 min**: para forzar contenido fresco, subir el archivo con **nombre nuevo**.
- Para borrar pedidos, eliminar primero dependencias (`entregas`, `incidencias`, `pedido_estado_historial`, `mayorista_pedido_items`) por las llaves foráneas.
- El asistente a veces tiene un fallo cosmético de salida repitiendo texto ("court court…"): no afecta el código ni los datos.
