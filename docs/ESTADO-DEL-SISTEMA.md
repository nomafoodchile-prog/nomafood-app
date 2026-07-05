# NOMMA FOOD — Estado técnico del sistema

_Documento de continuidad. Actualizado tras cerrar la capa de comunicación/logística/data en vivo (Fases 2C–2F parciales)._
Si abres una sesión nueva, **lee esto primero**.

**Norte del proyecto (regla de oro de la usuaria):** CENTRALIZAR los portales con la Central, AUTOMATIZAR la comunicación (tiempo real, sin tener que estar revisando) y DEJAR HISTORIAL + DATA REAL de todo. Cada feature debe: (1) hacer viajar la info del portal → Central, (2) avisar solo (badges, sonido, alertas que no se puedan ignorar), (3) persistir historial consultable.

---

## 1. Resumen
App web B2B + sistema de logística de despacho para Nomma Food (Alma Libre Grupo SpA).
Stack: **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Auth/Postgres/Realtime/Storage) + Mercado Pago + Resend**. Mapas: **Leaflet/OpenStreetMap** + **Nominatim** (geocode) + **Waze** (deep link). Deploy en **Vercel**.

Identidad visual (definitiva, ya unificada en todo el repo): **azul marino `#1b2a4a`** (nav, encabezados, botones), **dorado `#c9a24e`** (acciones clave, iconos activos, logo), **crema `#f5f0e8`** (fondos), **verde** solo estados positivos, **rojo** solo incidencias.

## 2. Accesos e infraestructura
- **Repo:** `github.com/nomafoodchile-prog/nomafood-app`. Local: `~/Downloads/nomafood-upload/nomafood-app`. **`git push` funciona** (token en el llavero; el asistente sube código directo).
- **Supabase:** proyecto `nomafood-produccion`, ref `fufmwauofcqnlrfhcenq`. SQL Editor: `https://supabase.com/dashboard/project/fufmwauofcqnlrfhcenq/sql/new`.
- **Vercel:** team `noma-food`, proyecto `nomafood-app`. Producción: `nomafood-app.vercel.app`. Deployment Protection deshabilitada (previews públicos).
- **Regla de trabajo:** el asistente sube código; **la usuaria corre las migraciones** en Supabase (SQL Editor → Run) y da clics sensibles (merges, contraseñas, token MP). No hay Node local → la validación es el preview de Vercel.

## 3. Ramas
| Rama | Contenido | Estado |
|---|---|---|
| `main` | Producción (portal mayorista + app central demo) | producción |
| `fix/bloqueantes-produccion` | **PR #1** — 5 bloqueantes | abierto, sin merge |
| `feature/central-pedidos-mayoristas` | **PR #2** — "Pedidos Mayoristas" en app central | abierto, probado OK |
| `feature/portal-chofer` | **Rama activa** — logística completa (todo lo de abajo) | migraciones aplicadas |

Preview de la rama activa: `https://nomafood-app-git-feature-portal-chofer-noma-food.vercel.app`

## 4. Migraciones en Supabase producción (en orden) — TODAS APLICADAS ✅
1. `products-schema.sql` — `products` + 10 productos.
2. `logistica-fase0.sql` — fundación (19 tablas, rol SuperAdmin, RLS, Storage, Realtime).
3. `logistica-fase1-setup.sql` — funciones de negocio + chofer de prueba (Carlos).
4. `logistica-fase2a-completa.sql` — **dos pistas de estado**, funciones de despacho, `calcular_cumplimiento`.
5. `logistica-demo-datos-v2.sql` — datos demo.
6. `logistica-fase2d-central.sql` — `incidencias.respuesta_central`/`respondido_by` + RPCs `resolver_incidencia`, `reasignar_pedido` (solo `is_admin`).
7. `logistica-fase2d-plus.sql` — `driver_messages.recibido_at`; RPCs `enviar_mensaje_chofer`, `marcar_mensaje_recibido`; **Compras**: `compra_items` (+`precio_unitario/comprado/foto_url/nota/comprado_at`) + RPCs `guardar_item_compra`, `agregar_item_compra`; `compra_items` a Realtime.
8. `logistica-fase2d-firma.sql` — RPC `guardar_firma_entrega`; `entregas` a Realtime.

> `raw` de GitHub cachea ~5 min. Para **resetear datos de prueba** del chofer hay un script en el historial de chat (borra entregas/incidencias/mensajes/compras de Carlos y reinserta 3 entregas sin coords + compra "Lo Valledor" + 2 mensajes).

## 5. Modelo de datos clave
- **Dos pistas de estado** en `mayorista_pedidos`:
  - `estado` (Central): `confirmado → pagado → en_preparacion → listo_para_despacho → asignado` (+ `entregado` lo pone `registrar_entrega`). Solo SuperAdmin avanza vía `avanzar_estado_pedido`.
  - `estado_entrega` (Chofer, enum): `pendiente → cargado → en_ruta → llego_cliente → entregado / no_entregado / incidencia`.
- Tablas núcleo: `drivers`, `vehicles`, `warehouses`, `driver_shifts`, `routes`, `route_stops`, `mayorista_pedidos`, `pedido_estado_historial`, `entregas`(foto obligatoria + `firma_url`), `incidencias`(+`respuesta_central`,`respondido_by`), `location_pings`, `driver_positions`, `compras`, `compra_items`(+precio/comprado/foto/nota), `driver_messages`(+`recibido_at`), `notifications_outbox`.
- RPCs (todas security definer): `get_my_driver_id`, `is_admin`, `is_super_admin`, `avanzar_estado_pedido`, `registrar_llegada`, `registrar_entrega`, `guardar_firma_entrega`, `marcar_no_entregado`, `reportar_incidencia`, `resolver_incidencia`, `reasignar_pedido`, `iniciar_ruta`, `finalizar_ruta`, `calcular_cumplimiento`, `enviar_mensaje_chofer`, `marcar_mensaje_recibido`, `guardar_item_compra`, `agregar_item_compra`.
- **Realtime** habilitado: `mayorista_pedidos`, `driver_positions`, `incidencias`, `driver_messages`, `compras`, `compra_items`, `entregas`, (`routes` NO).
- **Ojo:** `driver_messages.tipo` solo `sistema / alerta / motivacional / chat`. `registrar_entrega` guarda `foto_url` = **ruta** de Storage (bucket `entregas`), no URL; la Central genera signed URL. Fotos de incidencia → bucket `incidencias`; fotos de compra → bucket `comprobantes`.

## 6. Usuarios y datos
- `admin.nommafood@gmail.com` → **SuperAdmin** (login central).
- `chofer1@nommafood.cl` → **Chofer** de prueba (driver "Carlos Chofer"). Login portal chofer.
- Datos demo tras reset: 3 entregas (Café Central, Verde Vivo, Raíces Veganas) **sin coordenadas a propósito** (para poder marcar llegada desde cualquier lugar), 1 compra "Lo Valledor" (tomate/lechuga/palta/cebolla/zanahoria), 2 mensajes de la Central.
- **Teléfono central** para "Llamar a la central": `+56967493679` (default; override con `NEXT_PUBLIC_CENTRAL_PHONE`).

## 7. Portales / rutas y archivos clave
- **App central (auth):** login `/login`. Layout `app/(central)/layout.tsx` monta `<IncidenciaAlert/>` (alerta global). Páginas nuevas de logística:
  - `operaciones/monitoreo` — panel en vivo (KPIs, mapa, choferes+cumplimiento, incidencias con acciones, pedidos dos pistas, entregas de hoy con comprobante, "Ubicar en el mapa").
  - `operaciones/incidencias` — repositorio/historial con filtros y evidencia.
  - `operaciones/mensajes` — centro de mensajes a choferes (historial + acuse + enviar).
  - `compras/en-curso` — checklist de compras de cada chofer en vivo.
  - Dashboard rediseñado (mockup) usa `components/central/{Panel,KpiCard,SalesChart}`.
- **Portal Chofer (auth, azul marino, mobile):** `app/(portales)/chofer/(app)/{"" dashboard, entregas, entregas/[id], compras, mensajes, perfil}` + `chofer/login`. Layout: badge de no leídos + sonido global + **reporte de GPS** (`driver_positions`).
- **Portal Mayorista (token):** `app/(portales)/portal/mayoristas/[token]`. **Picker/Operario:** `app/(portales)/portal/{picker,operario}/[token]`.
- Utilidades: `lib/notify.ts` (sonido+vibración, desbloqueo de audio), `app/api/geocode/route.ts` (Nominatim server-side con fallback calle→sector).

## 8. Integraciones
Supabase (Auth, Postgres+RLS, Realtime, Storage). **Waze** deep link para navegación del chofer. **Nominatim/OpenStreetMap** para geocodificar direcciones (gratis, sin key; solo se fijan coords precisas calle/exacta, no a nivel comuna). GPS del navegador (`watchPosition`) reportado a `driver_positions`. Firma del cliente en `<canvas>` → PNG a Storage. Mercado Pago (checkout+webhook; **falta token real de producción** → el link de pago aún no genera `init_point`). Resend (correo). WhatsApp/Push = futuro (`notifications_outbox`).

## 9. HECHO ✅
- **Fase 2B** Portal del Chofer completo (login, dashboard, entregas con stepper, compras, mensajes, perfil, tiempo real).
- **Fase 2C** Panel Central de monitoreo en vivo (KPIs, mapa react-leaflet, cumplimiento por chofer, incidencias, dos pistas).
- **Fase 2D** Gestión de incidencias desde la Central: En revisión / **Reasignar (con nota → mensaje al chofer, incluso al mismo)** / Cerrar. Repositorio/historial de incidencias con filtros y evidencia.
- **Comunicación en vivo:** badge de no leídos + sonido/vibración en el chofer; ventana **"¡INCIDENCIA!"** + sonido fuerte global en la central; **Centro de mensajes** central→chofer con **acuse "Recibido"**, historial por chofer y **badge+sonido en la central** cuando el chofer confirma.
- **GPS en vivo:** el chofer reporta ubicación; mapa con **camión que se mueve y lo sigue**. Botón **"Llegué al cliente" bloqueado por cercanía** (≤300 m si el pedido tiene coords; si no, exige GPS activo). Navegación con **Waze**.
- **Geocodificación:** `/api/geocode` + botón "Ubicar en el mapa" en la Central (fija coords precisas de los pedidos).
- **Entregas con evidencia:** foto de factura **+ firma del cliente** (canvas) → llegan a la Central (Monitoreo → Entregas de hoy → **Comprobante**).
- **Compras (Parte B):** checklist del chofer (marcar comprado, **precio por insumo**, **foto**, agregar productos, total vs tope, finalizar) visible **en vivo** en la Central (Compras → En curso).
- **Rediseño + consistencia:** Dashboard estilo mockup; componentes base `components/central/`; **paleta de marca unificada** (32 archivos); **mojibake UTF-8 corregido** en menú, Picker y API operario.

## 10. SIGUIENTE (elige en la sesión nueva)
- **Repaso pestaña por pestaña** del rediseño: aplicar el estilo del Dashboard (Panel/KpiCard) al resto de la central (Pedidos, Despachos, Finanzas, Comercial, etc.). ← pedido por la usuaria.
- **Pin manual de ubicación** en el mapa para direcciones que solo geocodifican a nivel comuna (precisión 100% para el bloqueo de llegada).
- **Foto en la incidencia** del chofer (hoy `reportar_incidencia` va con `foto_url` null).

## 11. Roadmap restante
- **2E** GPS avanzado: velocidad/ETA/km/historial de recorrido sobre `location_pings`.
- **2F** Compras: comprobante final (boleta) + estados; Perfil con vehículo real; más badges.
- **Mensajería bidireccional** (chat de ida y vuelta) — hoy es una vía + acuse (decisión de la usuaria).
- **Config producción:** token real de Mercado Pago; merge de PR #1 y #2; limpiar datos demo.

## 12. Cómo continuar en sesión nueva
Decir: **"lee `docs/ESTADO-DEL-SISTEMA.md` (rama feature/portal-chofer) y seguimos con [lo que sea]"**. El asistente sube código directo (git ok) y entrega el SQL listo para pegar; tú corres migraciones en Supabase y das clics sensibles. La rama trabaja sobre un worktree; el preview de Vercel valida.
