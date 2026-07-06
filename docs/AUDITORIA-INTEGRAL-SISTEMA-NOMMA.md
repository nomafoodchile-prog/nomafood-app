# Auditoría Integral del Sistema — NOMMA FOOD

_Fecha: 2026-07-05 · Rama analizada: `feature/portal-chofer` · Etapa: **SOLO ANÁLISIS** (no se modificó código, base de datos, datos ni diseño)._

> **Alcance y método.** Se revisó el código real (páginas, componentes, API routes), las migraciones SQL del repo, las funciones/RLS/Storage/Realtime declaradas, los permisos (middleware + layout), y las fuentes de datos de cada pantalla (Supabase real vs `lib/` demo).
>
> **Limitación importante y honesta:** el asistente **no tiene acceso directo a la base de datos de producción**. Varias conclusiones sobre "qué tablas están realmente aplicadas" se infieren del código y del historial del proyecto, y se marcan como **[VERIFICAR EN DB]** con una consulta sugerida. La fuente de verdad definitiva es la DB de Supabase, que corre Nataly.

---

## A. Resumen ejecutivo

NOMMA FOOD tiene **dos "eras" de construcción superpuestas** que explican casi todos los problemas:

1. **Era Codex (`schema.sql`)** — define un ERP completo (~40 tablas: pedidos, pagos, recetas, producción, inventario, compras, finanzas, clientes, operarios, picking). **La evidencia indica que este esquema NUNCA se aplicó a producción.** Casi todas las pantallas "bonitas" de la Central (Pedidos, Producción, Inventario, Despachos, Finanzas, Personas, Comercial demo) pintan datos de `lib/` (demo) porque **no tienen backend real detrás**.

2. **Era Claude (migraciones `mayoristas-*`, `comercial-solicitudes`, `logistica-*`)** — es lo que **sí está vivo y conectado**: Portal Mayorista, Landing, Solicitudes de acceso, Portal Chofer nuevo, Monitoreo en vivo, Incidencias, Mensajes, Compras del chofer, y el pago Mercado Pago.

**Estado global honesto:** el sistema tiene **un flujo comercial de punta a punta funcionando** (visita → solicitud → aprobación → cuenta → correo → pedido → pago → central/monitoreo) y **un flujo de despacho/chofer funcionando**. Todo el resto del ERP (producción, inventario, recetas, picking, calidad, merma, compras formales, proveedores, finanzas, bonos, personas) está en estado **demo o pendiente**, y en varios casos **duplicado** con las tablas de la era Codex que no se usan.

**Los 3 riesgos más graves (CRÍTICOS) son de seguridad, no de features:**
- **RLS permisiva** `USING(true)` en `mayoristas`/`mayorista_pedidos`/`mayorista_pedido_items`.
- **Middleware** que solo comprueba que exista una cookie (no valida la sesión ni el rol).
- **La Central no está protegida por rol** (cualquier usuario logueado —incluido un cliente mayorista— podría abrirla).

---

## B. Mapa de módulos y portales existentes

**Grupos de rutas (`app/`):**
- `(auth)` → `/login`, `/recuperar`.
- `(central)` → Dashboard, Operaciones (Pedidos, Monitoreo, Incidencias, Mensajes, Producción, Tareas, Inventario, Despachos, Limpieza, Mantención), Comercial (Solicitudes, Productos, Clientes, Campañas), Compras (En curso, Proveedores), Finanzas (Caja, Cobranza, Costos, Balance), Personas (Usuarios, Accesos), Gerencia (Marcha Blanca).
- `(portales)` →
  - Público: `/mayoristas` (landing).
  - Mayorista/Cliente: `/portal/mayoristas/[token]`, `/portal/mayoristas/[token]/confirmacion`, `/portal/mayoristas/{login,crear-clave,cuenta}`.
  - Chofer **nuevo**: `/chofer/(app)/{,entregas,entregas/[id],compras,mensajes,perfil}` + `/chofer/login`.
  - Portales por token **viejos**: `/portal/chofer/[token]`, `/portal/picker/[token]`, `/portal/operario/[token]`.

**APIs (`app/api/`):** geocode; mayoristas (crear-cuenta, enviar-acceso, solicitud); portal/chofer (route, dispatch, gasto, stop); portal/mayoristas (route, pedido, verificar-pago, webhook); portal/operario (route, incidencia, reporte, task); portal/picker (route, item).

---

## C. Arquitectura actual detectada

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind. Páginas de la Central son en su mayoría **client components** que importan demo desde `lib/`. Las páginas conectadas usan el **cliente Supabase de navegador** (`lib/supabase/client`, anon key + RLS) o llaman a **API routes** que usan el **service role** (`lib/supabase/server`).
- **Backend/datos:** Supabase (Postgres + Auth + RLS + Realtime + Storage).
- **Integraciones:** Mercado Pago Checkout Pro (preferencia + webhook + verificación al volver); Resend vía SMTP de Supabase (dominio `nomafood.cl` verificado); Leaflet/OSM + Nominatim (geocode); WhatsApp solo como link `wa.me`.
- **Realtime declarado:** `access_requests`, `compra_items`, `entregas` (y el código se suscribe además a `mayorista_pedidos`, `driver_messages`, etc.).
- **Storage referenciado:** buckets `entregas`, `comprobantes`, `incidencias`, `compras`.

---

## D. Tablas, relaciones, permisos, Storage, Realtime, APIs e integraciones

### D.1 Tablas por origen (y si están realmente aplicadas)
- **`mayoristas-schema.sql` [APLICADA]:** `mayoristas`, `mayorista_pedidos`, `mayorista_pedido_items`.
- **`comercial-solicitudes.sql` [APLICADA]:** `access_requests`, `access_request_events`, `landing_config`.
- **`schema.sql` (products) [products APLICADA; resto DUDOSO]:** `products` sí está en producción (semilla de 10 productos). El **resto de `schema.sql`** (orders, order_lines, payments, recipes, recipe_ingredients, recipe_steps, production_orders, production_items, picking_tasks, adt_tasks, operators, dispatches, inventory_catalog_items, inventory_movements, stock_reservations, warehouse_locations, purchase_*, supplier_*, customers, cash_entries, credit_*, customer_receivables, balance_snapshots, business_settings, audit_logs, payment_webhook_events, cleaning_reports, maintenance_events, machine_failures, marketing_*, task_reports/validations/evidence) **[VERIFICAR EN DB — probablemente NO aplicado]**.
- **Logística "fase0" [APLICADA pero NO commiteada al repo]:** `drivers`, `routes`, `route_stops`, `entregas`, `incidencias`, `driver_messages`, `compras`, `compra_items`, `driver_positions` (y bucket `comprobantes`). **No existe el `CREATE TABLE` de estas tablas en `supabase/`** → riesgo de reproducibilidad.
- **`notifications_outbox` [APLICADA ad-hoc, NO commiteada]:** el código inserta en ella (crear-cuenta, solicitud, enviar-acceso) pero **no hay `CREATE TABLE` en el repo**.

> **[VERIFICAR EN DB]** — Consulta para listar lo que existe de verdad:
> ```sql
> select table_name from information_schema.tables
> where table_schema='public' order by table_name;
> ```

### D.2 Permisos / RLS
- **76 políticas** declaradas en total; la mayoría de la era logística usan helpers (`is_admin`, `get_my_mayorista_id`, `_pedido_es_mio`, `_compra_es_mia`).
- **4 políticas permisivas `USING(true)`**, y las 3 más peligrosas son: `mayoristas`, `mayorista_pedidos`, `mayorista_pedido_items` → **`FOR ALL TO authenticated USING (true)`**. La cuarta (`landing_config` select público) es aceptable.
- **`app_role` enum:** `Administracion, Armado, Chofer, EncargadoProduccion, Gerencia, Mayorista, Operario, SuperAdmin`.

### D.3 Funciones/Triggers relevantes (era logística — funcionan)
`iniciar_ruta`, `finalizar_ruta`, `registrar_llegada`, `registrar_entrega`, `guardar_firma_entrega`, `marcar_no_entregado`, `reportar_incidencia`, `resolver_incidencia`, `reasignar_pedido`, `enviar_mensaje_chofer`, `marcar_mensaje_recibido`, `agregar/guardar_item_compra`, `calcular_cumplimiento`, `avanzar_estado_pedido`, `transicion_valida`, `apply_inventory_movement` (+ triggers `inventory_movements_*`, `products_touch_updated_at`).

### D.4 Integraciones
- **Mercado Pago:** preferencia OK; **primer pago real confirmado** (op. #167380926558). Webhook existe pero **no llegaba** (dominio no seteado); se añadió **verificación al volver** (robusta). **Sin validación de firma `x-signature`** (riesgo de webhook falsificado).
- **Resend:** dominio verificado; correos a cualquier cliente OK.
- **WhatsApp:** solo `wa.me` + `notifications_outbox`; **sin Business API ni worker**.

---

## E. Matriz de módulos (clasificación obligatoria)

**Leyenda:** 🟢 Funcional y conectado · 🟡 Funcional pero parcial · 🔵 Solo visual/demo · 🟠 Desconectado · 🟣 Duplicado/inconsistente · ⚪ Pendiente

| # | Módulo / pantalla | Se visualiza | Qué funciona de verdad | Datos | Clasificación | Prioridad |
|---|---|---|---|---|---|---|
| 1 | **Landing `/mayoristas`** | Landing premium | Productos reales + solicitud | Reales (`products`,`landing_config`) | 🟢 | — |
| 2 | **Solicitud de acceso** | Formulario | Guarda, dedup, estados, historial | Reales (`access_requests`) | 🟢 | — |
| 3 | **Comercial · Solicitudes** | KPIs, detalle, acciones | Aprobar, crear cuenta, invitar | Reales | 🟢 | — |
| 4 | **Portal Mayorista `[token]`** | Catálogo + pedir + pagar | Crea pedido + preferencia MP | Reales | 🟡 (RLS permisiva) | Crítica (seguridad) |
| 5 | **Portal Cliente (cuenta/login)** | Cuenta, pedidos, descuento | Login, recuperación, pedidos Realtime | Reales | 🟡 (fichas duplicadas, RLS) | Alta |
| 6 | **Confirmación de pago** | "¡Pago confirmado!" | Verifica pago con MP y marca `pagado` | Reales | 🟢 (recién agregado) | — |
| 7 | **Mercado Pago (pago)** | Checkout MP | Pago real acreditado | Reales | 🟡 (sin firma; webhook depende de dominio) | Alta |
| 8 | **Operaciones · Monitoreo en vivo** | Mapa, choferes, pedidos, entregas | GPS, cumplimiento, evidencia, pedidos pagados | Reales | 🟢 | — |
| 9 | **Operaciones · Incidencias** | Repositorio | Historial + gestión | Reales | 🟢 | — |
| 10 | **Operaciones · Mensajes a choferes** | Bandeja | Envío + acuse + badge | Reales | 🟢 | — |
| 11 | **Compras · En curso** | Checklist choferes | Precios/fotos en vivo | Reales | 🟢 | — |
| 12 | **Portal Chofer nuevo `/chofer`** | Dashboard, entregas, compras, mensajes | Ruta, GPS, foto+firma, compras, mensajes | Reales | 🟢 | — |
| 13 | **Dashboard central** | KPIs, gráficos, pedidos | Nada real | Demo (`lib`) | 🔵 | Media |
| 14 | **Operaciones · Pedidos** | Tabla de pedidos | Nada real; **no muestra los pedidos mayoristas reales** | Demo (`lib/operations`) | 🔵 + 🟠 | **Alta** |
| 15 | **Operaciones · Producción** | Órdenes de producción | Nada real | Demo | 🔵 / ⚪ | Alta |
| 16 | **Operaciones · Tareas** | ADT/tareas | Nada real | Demo | 🔵 / ⚪ | Media |
| 17 | **Operaciones · Inventario** | Stock, movimientos | Nada real | Demo | 🔵 / ⚪ | Alta |
| 18 | **Operaciones · Despachos** | Asignación/rutas | Nada real (el despacho real vive en Monitoreo) | Demo | 🔵 + 🟣 | Media |
| 19 | **Operaciones · Limpieza** | Calendario | Nada real | Demo | 🔵 | Baja |
| 20 | **Operaciones · Mantención** | Calendario máquinas | Nada real | Demo | 🔵 | Baja |
| 21 | **Comercial · Productos** | Catálogo | Nada real (existe tabla `products`, no se usa aquí) | Demo | 🔵 + 🟠 | Media |
| 22 | **Comercial · Clientes** | Clientes | Nada real (clientes reales = `mayoristas`) | Demo | 🔵 + 🟣 | Media |
| 23 | **Comercial · Campañas** | Campañas | Nada real | Demo | 🔵 | Baja |
| 24 | **Compras · Proveedores** | Proveedores/precios | Nada real | Demo | 🔵 / ⚪ | Media |
| 25 | **Finanzas · Caja** | Movimientos de caja | Nada real; **el pago aprobado NO genera ingreso** | Demo | 🔵 + 🟠 | **Alta** |
| 26 | **Finanzas · Balance/Costos/Cobranza** | Reportes | Nada real | Demo | 🔵 | Media |
| 27 | **Personas · Usuarios/Accesos** | Usuarios por rol | Nada real | Demo | 🔵 / ⚪ | Media |
| 28 | **Gerencia · Marcha Blanca** | Panel | Consulta Supabase (verificar alcance) | Reales(?) | 🟡 [VERIFICAR] | Baja |
| 29 | **Portal Chofer viejo `/portal/chofer/[token]`** | Portal por token | Consulta `dispatches`/`operators` (esquema no aplicado) | Roto/vacío | 🟠 + 🟣 | Alta (limpiar/deprecage) |
| 30 | **Portal Picker `/portal/picker/[token]`** | Picking por token | Consulta `picking_tasks`/`operators` (no aplicado) | Roto/vacío | 🔵 + ⚪ | Alta |
| 31 | **Portal Operario `/portal/operario/[token]`** | Producción por token | Consulta `adt_tasks`/`operators` (no aplicado) | Roto/vacío | 🔵 + ⚪ | Alta |
| 32 | **WhatsApp / Notificaciones** | Botón `wa.me` | Outbox se llena; sin envío automático | Parcial | 🟡 / ⚪ | Media |

---

## F. Flujos de información **actuales** (lo que sí viaja hoy)

1. **Comercial/Mayorista (funciona):** Landing → `access_requests` → Central Comercial (aprobar) → `crear-cuenta` (Auth + `mayoristas.profile_id` + rol) → correo Resend → login cliente → catálogo (`products`) → `mayorista_pedidos` (+items) → preferencia MP → **pago** → `verificar-pago`/webhook marca `pagado` → **Monitoreo en vivo** lo muestra.
2. **Despacho/Chofer (funciona):** pedido pagado/asignado → `drivers`/`routes`/`route_stops` → Portal Chofer (GPS `driver_positions`, `iniciar_ruta`) → entrega con foto+firma (`entregas`, bucket) → Monitoreo/Incidencias/Mensajes en la Central en tiempo real → `calcular_cumplimiento`.

## G. Flujos que **deberían existir y NO están conectados**

1. **Pago aprobado → Ingreso en Caja/Finanzas.** Hoy el pago marca el pedido, pero **no genera ingreso financiero** (Caja es demo). 🟠
2. **Pedido pagado → Producción → Inventario.** No hay reserva/descuento de stock, ni cálculo de faltantes, ni orden de producción, ni recetas/preelaboraciones. ⚪
3. **Producción → Producto terminado → Picking.** No existe el puente; los portales Picker/Operario apuntan a tablas no aplicadas. ⚪
4. **Picking cierra → Central libera despacho.** Hoy el despacho se arma manual; no viene de un picking real. 🟠
5. **Pedido real → pestaña "Pedidos" de la Central.** Los pedidos mayoristas reales **no se ven** en Operaciones · Pedidos (esa pantalla es demo). 🟠
6. **Compras del chofer → Inventario y Finanzas.** Las compras del chofer se registran, pero **no impactan stock ni costos**. 🟠
7. **Calidad/Merma/Trazabilidad → Bonos e Indicadores.** No hay captura de fechado/etiquetado/temperaturas/merma, por lo que **los bonos no pueden calcularse por calidad** (requisito explícito). ⚪
8. **WhatsApp automático.** El outbox se llena pero nadie lo procesa/envía. ⚪

## H. Datos demo / hardcodeados a limpiar antes de producción

- **En DB de producción (confirmado):** clientes ficticios `Verde Vivo Ltda` (verdevivo@demo.nomma), `Raíces Veganas SpA` (raices@demo.nomma); chofer de prueba `Carlos Chofer`; pedidos demo (MAY-20260704-\*); semillas de `products`, y (si se aplicaron) `operators`/`customers`.
- **En código (`lib/`):** `operations.ts`, `finance.ts`, `inventory.ts`, `factory-management.ts`, `campaigns.ts`, `wholesale.ts`, `central-flow.ts`, `seed.ts` alimentan todas las pantallas demo.
- **Pedido de prueba real:** `MAY-20260705-6305` (Vicente, marcado `pagado` a mano por única vez) y solicitudes/cuentas de prueba.

## I. Duplicidades detectadas (🟣)

1. **Pedidos/pagos:** `orders`+`order_lines`+`payments` (Codex, sin usar) **vs** `mayorista_pedidos`+`items` (real).
2. **Clientes:** `customers`/`marketing_customers` (demo) **vs** `mayoristas` (real).
3. **Productos:** catálogo demo en Comercial **vs** tabla `products` real.
4. **Portales chofer:** `/portal/chofer/[token]` (viejo, `dispatches`) **vs** `/chofer/(app)` (nuevo, `drivers`/`routes`).
5. **Despacho:** Operaciones·Despachos (demo) **vs** Monitoreo/logística (real).
6. **Operarios/tareas:** `operators`+`adt_tasks`+`picking_tasks` (no aplicadas) **vs** nada real aún.

## J. Riesgos críticos técnicos, operativos y de seguridad

| Riesgo | Detalle | Severidad |
|---|---|---|
| **RLS abierta** | `mayoristas`/`mayorista_pedidos`/`items` con `USING(true)` → cualquier usuario autenticado (incluido un cliente) puede leer/editar **todos** los datos de todos los clientes | 🔴 Crítica |
| **Middleware débil** | Solo verifica **presencia** de una cookie `sb-*-auth-token`; no valida la sesión ni el rol | 🔴 Crítica |
| **Central sin gate por rol** | El layout de `(central)` no comprueba rol → un cliente/chofer logueado podría abrir la Central | 🔴 Crítica |
| **Webhook MP sin firma** | No valida `x-signature` → un tercero podría marcar pedidos como pagados | 🟠 Alta |
| **Datos demo en prod** | Empresas/choferes/pedidos ficticios mezclados con reales | 🟠 Alta |
| **Migraciones no commiteadas** | fase0 logística + `notifications_outbox` sin `CREATE TABLE` en el repo | 🟡 Media |
| **ERP no aplicado** | Producción/Inventario/Recetas/Compras/Finanzas sin backend real | 🟠 Alta (bloquea operación fábrica) |

## K. Riesgos de merma, picking, despacho y pérdida de información

- **Sin inventario real** → riesgo de **vender sin stock**, sin reserva ni descuento, sin alertas.
- **Sin picking real** → riesgo de **errores de cantidades/fechado/etiquetado** sin control ni evidencia; el cierre de pedido no valida nada.
- **Sin calidad/merma** → **no hay trazabilidad** de lote, temperatura, no conformidades ni responsable; imposible calcular bonos por calidad.
- **Despacho manual** → un pedido puede despacharse sin haber pasado por producción/picking reales.
- **Compras del chofer sin impacto** → costos y stock quedan desactualizados (riesgo financiero).

## L. Automatizaciones faltantes

1. Pago aprobado → **ingreso automático en Caja** + actualización de cobranza.
2. Pedido pagado → **reserva/descuento de stock** + **cálculo de producción** por recetas/preelaboraciones.
3. Producción terminada → **producto terminado disponible** → **generación de tareas de picking**.
4. Picking cerrado (validado) → **liberación de despacho** y asignación de ruta.
5. Compra del chofer/proveedor → **actualización de stock y costos**.
6. Eventos clave → **WhatsApp/notificación automática** (worker del outbox).
7. Métricas de calidad/tiempo/merma → **cálculo de indicadores y bonos**.

## M. Orden recomendado de implementación por fases

- **Fase A — Seguridad (CRÍTICA, antes de sumar clientes):** endurecer RLS de `mayoristas`/pedidos/items; middleware que valide sesión real (`getUser`) y **rol**; gate de rol en la Central; validación `x-signature` en el webhook MP.
- **Fase B — Cerrar el flujo comercial real:** conectar la pestaña **Pedidos** a `mayorista_pedidos`; **ingreso automático en Caja** al aprobarse el pago; listas de precios por cliente; limpiar fichas duplicadas de mayoristas.
- **Fase C — Higiene y trazabilidad de migraciones:** commitear fase0 + `notifications_outbox`; decidir qué se hace con `schema.sql` (aplicar por partes reales o archivar); limpiar datos demo de producción.
- **Fase D — Núcleo de fábrica:** Inventario real → Recetas/Preelaboraciones → Producción → Producto terminado → Picking (Portal Picker nuevo) → Operario (Portal nuevo) → Calidad/Merma.
- **Fase E — Compras/Proveedores/Finanzas/Bonos:** compras formales + proveedores + costos; finanzas reales; indicadores y bonos por calidad.
- **Fase F — WhatsApp Business API + PWA.**

## N. Próxima tarea crítica recomendada

**Fase A (Seguridad).** Es barata, no cambia la experiencia del usuario y **elimina los 3 riesgos críticos** antes de abrir el portal a más clientes reales. En paralelo, **Fase B** (Pedidos reales en la Central + ingreso automático en Caja) es lo que más valor operativo entrega de inmediato.

## O. Preguntas y decisiones que necesito de Nataly antes de avanzar

1. **`schema.sql` (ERP Codex):** ¿lo **archivamos** y construimos el núcleo de fábrica sobre migraciones nuevas y limpias, o intentamos aplicar/rescatar partes? (Recomiendo archivarlo y construir limpio, tabla por tabla, conectado de verdad.)
2. **Portales viejos por token** (`/portal/chofer|picker|operario/[token]`): ¿los **deprecamos** (el chofer nuevo ya lo reemplaza) y hacemos Picker/Operario nuevos conectados a la logística real?
3. **Orden:** ¿arrancamos por **Fase A (seguridad)** o prefieres primero **Fase B (Pedidos + Caja)** para "ver" el negocio operar? (Recomiendo A y B juntas, en ese orden.)
4. **Listas de precios:** ¿precio por cliente (hoy solo `descuento_pct`) o listas por segmento?
5. **Limpieza de demo:** ¿cuándo autorizas borrar clientes/pedidos/choferes ficticios de producción?
6. **Dominio de producción:** confirmar la URL real de la app (¿`nomafood.cl`?) para fijar `NEXT_PUBLIC_SITE_URL` y cerrar el webhook MP.

---

> **Cierre.** No se implementó ningún cambio de código, base de datos, datos ni diseño en esta etapa. Espero tu aprobación para definir juntas las fases de corrección, automatización y desarrollo.
