# NOMMA FOOD — Estado técnico del sistema

_Documento de continuidad. Actualizado al cierre de la Fase 2C (Panel Central de monitoreo en vivo)._
Si abres una sesión nueva, **lee esto primero** y luego sigue con la Fase 2D.

---

## 1. Resumen
App web B2B + sistema de logística de despacho para Nomma Food (Alma Libre Grupo SpA).
Stack: **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Auth/Postgres/Realtime/Storage) + Mercado Pago + Resend**. Deploy en **Vercel**.

Identidad visual (definitiva): **azul marino `#1b2a4a`** (nav, encabezados, botones), **dorado `#c9a24e`** (acciones clave, iconos activos, logo), **crema/blanco cálido** (fondos), **verde** solo para estados positivos (En ruta / Entregado), **rojo** solo para incidencias.

## 2. Accesos e infraestructura
- **Repo:** `github.com/nomafoodchile-prog/nomafood-app`. Local: `~/Downloads/nomafood-upload/nomafood-app`. **`git push` funciona** (token en el llavero; el asistente sube código directo).
- **Supabase:** proyecto `nomafood-produccion`, ref `fufmwauofcqnlrfhcenq`.
- **Vercel:** team `noma-food`, proyecto `nomafood-app`. Producción: `nomafood-app.vercel.app`. **Deployment Protection deshabilitada** (previews públicos para probar en teléfono).
- **Regla de trabajo:** el asistente sube código; la usuaria corre migraciones en Supabase (SQL Editor → Run) y da clics sensibles (merges, contraseñas, token MP).

## 3. Ramas
| Rama | Contenido | Estado |
|---|---|---|
| `main` | Producción (portal mayorista + app central demo) | producción |
| `fix/bloqueantes-produccion` | **PR #1** — 5 bloqueantes | abierto, sin merge |
| `feature/central-pedidos-mayoristas` | **PR #2** — página "Pedidos Mayoristas" en app central | abierto, probado OK |
| `feature/portal-chofer` | **Rama activa** — Portal del Chofer + migraciones logística | migraciones aplicadas |

## 4. Migraciones APLICADAS en Supabase producción (en orden)
1. `products-schema.sql` — tabla `products` + 10 productos.
2. `logistica-fase0.sql` — fundación (19 tablas, rol SuperAdmin, RLS, Storage, Realtime).
3. `logistica-fase1-setup.sql` — funciones de negocio + chofer de prueba (Carlos).
4. `logistica-fase2a-completa.sql` — **dos pistas de estado**, funciones de despacho, `calcular_cumplimiento`, limpieza.
5. `logistica-demo-datos-v2.sql` — 3 clientes con entregas pendientes, 1 compra con lista, 1 mensaje de la Central.

**PENDIENTE de correr** (Fase 2D):
6. `logistica-fase2d-central.sql` — columnas `incidencias.respuesta_central`/`respondido_by` + RPCs `resolver_incidencia(uuid,text,text)` y `reasignar_pedido(uuid,uuid)` (solo `is_admin`). **Sin esto, los botones de gestión de incidencias del panel darán error "function ... does not exist".**

> Todas las migraciones están en `supabase/` de la rama `feature/portal-chofer`. El SQL Editor de Supabase corre el script como **una transacción** (revierte todo si algo falla). El `raw` de GitHub cachea ~5 min → subir con nombre nuevo para forzar fresco.

## 5. Modelo de datos clave
- **Dos pistas de estado** en `mayorista_pedidos`:
  - `estado` (Central): `confirmado → pagado → en_preparacion → listo_para_despacho → asignado`. Solo SuperAdmin (`avanzar_estado_pedido`).
  - `estado_entrega` (Chofer, enum): `pendiente → en_ruta → llego_cliente → entregado / no_entregado / incidencia`.
- Tablas: `profiles`(rol), `drivers`, `vehicles`, `warehouses`, `driver_shifts`, `routes`, `route_stops`, `mayorista_pedidos`(ampliada: chofer_id, route_id, warehouse_id, lat/lng, telefono_entrega, hora_programada, bultos, estado_entrega, hora_llegada_real, hora_entrega_real), `pedido_estado_historial`, `entregas`(foto obligatoria), `incidencias`, `location_pings`, `driver_positions`, `compras`, `compra_items`, `compra_comprobantes`, `compras_sin_factura`, `jornada_resumen`, `driver_messages`, `notifications_outbox`.
- Funciones (RPC): `get_my_role`, `get_my_driver_id`, `is_admin`, `is_super_admin`, `avanzar_estado_pedido`, `registrar_llegada`, `registrar_entrega`(foto+receptor), `marcar_no_entregado`, `reportar_incidencia`, `iniciar_ruta`, `finalizar_ruta`(bloquea con pendientes), `calcular_cumplimiento`.
- **Ojo:** `driver_messages.tipo` solo acepta `sistema / alerta / motivacional / chat` (no `aviso`).

## 6. Usuarios y datos
- `admin.nommafood@gmail.com` → **SuperAdmin** (login app central).
- `chofer1@nommafood.cl` → **Chofer** de prueba (driver "Carlos Chofer", bodega "Bodega Central"). Login portal chofer.
- Demo: 3 clientes con entregas pendientes (Café Central 10:15, Verde Vivo 10:45, Raíces Veganas 11:30), 1 compra "Lo Valledor" con lista (tomate/lechuga/palta/cebolla/zanahoria), 1 mensaje de la Central.

## 7. Portales / rutas
- **App central (auth):** `app/(central)/operaciones/pedidos-mayoristas` (PR #2). Login `/login`.
- **Portal Chofer (auth, azul marino):** `app/(portales)/chofer/{login, "" (dashboard), entregas, entregas/[id], compras, mensajes, perfil}`. Cliente browser de Supabase + `supabase.rpc()` + **Realtime**. Middleware permite `/chofer`.
- **Portal Mayorista (token):** `app/(portales)/portal/mayoristas/[token]`.
- Preview chofer: `https://nomafood-app-git-feature-portal-chofer-noma-food.vercel.app/chofer/login`.

## 8. Integraciones
Supabase (Auth, Postgres+RLS, Realtime, Storage). Mercado Pago (checkout+webhook; **el link de pago aún no genera `init_point`** → falta el token real de producción MP en Vercel). Resend (correo). Google Maps (deep link "Navegar"). WhatsApp/Push/Waze/firma/QR = futuro (`notifications_outbox` deja la estructura).

## 9. HECHO ✅
- Auditoría + 5 bloqueantes (PR #1). Página "Pedidos Mayoristas" central (PR #2, probada).
- Logística: Fase 0 (fundación), Fase 1 (lógica), Fase 2A (dos pistas de estado).
- **Portal del Chofer (Fase 2B) COMPLETO y probado en teléfono:** login, dashboard operativo (próxima entrega, botones grandes, cumplimiento con "Sin entregas aún", bienvenida, resumen, última sync), entregas (pendientes/completadas), detalle con stepper del chofer (Llegué → Entregar con foto / No entregado / Incidencia), **Compras** (lista real), **Mensajes** (avisos de Central), Perfil, **tiempo real** en todas. Paleta azul marino.
- **Panel Central de monitoreo en vivo (Fase 2C) COMPLETO y probado en preview:** página `app/(central)/operaciones/monitoreo` + ítem "Monitoreo en vivo" en el menú. KPIs, tarjetas de choferes (Disponible/En ruta + entrega actual + **barra de cumplimiento** vía `calcular_cumplimiento`), **mapa en vivo** (`MonitoreoMapa.tsx`, react-leaflet client-only, grafica choferes con GPS y destinos de pedidos), incidencias entrantes en vivo y tabla de pedidos con las dos pistas. Realtime a `mayorista_pedidos`, `incidencias`, `driver_positions`, `routes`. **Sin migración** (RLS `is_admin()` + tablas ya en `supabase_realtime`).
- **Rediseño visual + consistencia (esta sesión):**
  - **Dashboard central** rearmado al mockup de la usuaria (saludo, 4 KPIs, flujo operativo, alertas y pendientes, ventas/gastos con `recharts`, pedidos recientes, equipo conectado).
  - **Componentes base reutilizables** en `components/central/`: `Panel`, `KpiCard`, `SalesChart` (para ir aplicando el estilo al resto).
  - **Paleta de marca unificada** en todo el repo: dorado `#c9a24e`, azul marino `#1b2a4a`, crema `#f5f0e8` (se reemplazó el viejo `#c9a84c`/`#0f0f0f` en 32 archivos).
  - **Mojibake corregido** (doble UTF-8) en menú Sidebar (Producción/Mantención/Campañas), Portal Picker y API operario.

## 10. EN PROGRESO — Fase 2D (gestión de incidencias desde la Central)
**Construido, pendiente correr migración `logistica-fase2d-central.sql` y probar.**
- En el panel de monitoreo, cada incidencia tiene acciones: **En revisión** / **Reasignar** (elige otro chofer) / **Cerrar** → RPC `resolver_incidencia` y `reasignar_pedido`. Reasignar pone el pedido en `pendiente`, limpia `route_id` y cierra la incidencia.
- Fix de paso: el panel ahora también cuenta/incluye pedidos `entregado` de hoy (antes `registrar_entrega` ponía `estado='entregado'` y quedaban fuera del filtro → "Entregas de hoy" siempre 0).
- **Falta (2D-bis, lado chofer):** captura de **firma** del receptor en la entrega (`entregas.firma_url` ya existe; hay que sumar el canvas de firma al flujo del chofer y un parámetro a `registrar_entrega`).

## 11. Roadmap restante
- **2D** gestión de incidencias + firma desde Central ← siguiente. **2E** GPS en vivo completo (velocidad, ETA, km, historial) sobre el `MonitoreoMapa` ya montado + `location_pings`. **2F** Compras (iniciar/finalizar + comprobante), Mensajes badges, Perfil con vehículo real, badges numéricos en el menú.
- **Diseño:** seguir aplicando `components/central/` (Panel/KpiCard) al resto de páginas de la central para que todas queden como el Dashboard.
- **Config:** token real de Mercado Pago; merge de PR #1 y #2; limpiar datos demo antes de producción.

## 12. Cómo continuar en sesión nueva
Decir: **"lee `docs/ESTADO-DEL-SISTEMA.md` (rama feature/portal-chofer) y seguimos con la Fase 2D"**. El asistente sube código directo (git ok); tú corres migraciones y das clics sensibles.
