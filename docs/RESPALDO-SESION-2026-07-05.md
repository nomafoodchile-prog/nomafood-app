# Respaldo de sesión — 2026-07-05

_Bitácora de lo conversado y avanzado. Rama `feature/portal-chofer`. Commits del rango `ce8fd14 → 1aae717`._

## 1. Decisiones de arquitectura y negocio
- **Norte confirmado:** centralizar portales con la Central, automatizar comunicación en tiempo real, y persistir historial + data real de todo.
- **Portal Mayorista con CUENTAS reales** (email + contraseña vía Supabase Auth), no solo link por token. El token queda como respaldo. Rol nuevo `Mayorista`.
- **Invitación/recuperación de contraseña por correo** vía **SMTP de Supabase con Resend** (una sola configuración cubre invitación + recuperación).
- **Correos con marca**: plantillas "Invite user" y "Reset Password" personalizadas (azul marino/dorado, texto en español).
- **Paleta de marca unificada** en todo el repo (`#1b2a4a`/`#c9a24e`/crema); corrección de mojibake UTF-8 en menú y portales.
- **Pagos con Mercado Pago en producción**: el dueño no puede pagarse a sí mismo (regla MP); clientes pagan con cualquier tarjeta, sin cuenta MP.

## 2. Mejoras en la Central (implementadas ✅)
- **Dashboard** rediseñado al mockup (saludo, KPIs, flujo operativo, alertas, ventas/gastos con recharts, pedidos recientes, equipo). Componentes base `components/central/{Panel,KpiCard,SalesChart}`.
- **Monitoreo en vivo** (`/operaciones/monitoreo`): KPIs, **mapa Leaflet con camión GPS que se mueve**, tarjetas de choferes con **barra de cumplimiento**, incidencias entrantes con acciones, tabla de pedidos (dos pistas), **Entregas de hoy con comprobante (foto + firma)**, botón **"Ubicar en el mapa"** (geocodifica direcciones), botón "Actualizar" con feedback.
- **Alerta global "¡INCIDENCIA!"** + sonido fuerte (montada en el layout central).
- **Repositorio de incidencias** (`/operaciones/incidencias`): historial con filtros por estado/período y evidencia.
- **Mensajes a choferes** (`/operaciones/mensajes`): bandeja por chofer, historial, acuse "Recibido", envío directo; **badge + sonido** en la Sidebar al recibir acuse.
- **Compras en curso** (`/compras/en-curso`): checklist de cada chofer en vivo con precios y fotos.
- **Solicitudes de acceso** (`/comercial/solicitudes`): KPIs, filtros, detalle con historial, cambio de estado, **crear cliente + acceso**, badge+sonido de nuevas.

## 3. Mejoras en el Portal del Chofer (implementadas ✅)
- **GPS en vivo** reportado a `driver_positions` (watchPosition).
- **"Llegué al cliente" bloqueado por cercanía** (≤300 m si el pedido tiene coordenadas; si no, exige GPS activo).
- **Navegación con Waze**.
- **Entrega con foto de factura + FIRMA del cliente** (canvas) → llegan a la Central.
- **Compras** como checklist (precio por insumo, foto, agregar productos, total vs tope, finalizar).
- **Mensajes**: badge de no leídos + **sonido/vibración global** + botones "Recibido" y "Llamar a la central" (`+56967493679`).

## 4. Organización del menú lateral (Central)
Estructura actual: **Dashboard** · **Operaciones** (Pedidos, Monitoreo en vivo, Incidencias, Mensajes a choferes, Producción, Tareas, Inventario, Despachos, Limpieza, Mantención) · **Comercial** (Solicitudes de acceso, Productos, Clientes, Campañas) · **Compras** (En curso, Proveedores) · **Finanzas** (Caja, Cobranza, Costos, Balance) · **Personas** (Usuarios, Accesos) · **Gerencia** (Marcha Blanca). Palabras corregidas (Producción/Mantención/Campañas).

## 5. Flujo ideal de pedido (definido)
`Cliente (portal/landing) → solicitud/pedido → Central (aprobar/gestionar) → Producción → Picking/Armado → Despacho (asignar chofer, ruta, GPS) → Entrega (foto+firma) → confirmación/pago`. Hoy están conectados a Supabase: pedido mayorista, pago, despacho/monitoreo, entrega. Producción/Picking/Armado en la Central siguen en demo.

## 6. Requerimientos definidos — Mayorista / Landing / Solicitud / WhatsApp
- **Landing pública** mobile-first premium: hero, quiénes somos, servicios, productos destacados (reales), video (configurable), vitrina + "dónde estamos" (clientes reales), CTA, formulario. **Implementado ✅** en `/mayoristas`.
- **Solicitud de acceso** → tabla `access_requests` con estados `nueva → en_revision → contactado → aprobado → rechazado → cuenta_creada`, número único, origen (UTM), dedup, historial. **Implementado ✅**.
- **Aprobar → crear cuenta + enviar acceso** por correo. **Implementado ✅** (a `nomafoodchile@gmail.com` hasta verificar dominio).
- **WhatsApp automatizado:** preparado (outbox + envs), **pendiente** conectar Business API. Hoy botón `wa.me`.

## 7. Requerimientos — Portal Picker / Portal Operario
- Ya existen portales por token (`/portal/picker/[token]`, `/portal/operario/[token]`) con APIs (item, incidencia, reporte, task). **Pendiente:** revisar, conectar plenamente al flujo central y validar. (No se rehicieron en esta sesión.)

## 8. Requerimientos — GPS / rutas / compras chofer / incidencias / evidencias / cumplimiento
- **GPS:** implementado (reporte + mapa que sigue al camión). **Pendiente 2E:** velocidad/ETA/km/historial.
- **Rutas:** `routes`/`route_stops` + `iniciar_ruta`/`finalizar_ruta` (bloquea con pendientes).
- **Compras del chofer:** ✅ precio/foto/checklist visible en la Central en vivo.
- **Incidencias:** ✅ reporte del chofer + repositorio + gestión (resolver/reasignar/nota) desde la Central.
- **Evidencias:** ✅ foto de factura + firma del cliente en `entregas` (Storage), visibles en la Central.
- **Cumplimiento:** ✅ `calcular_cumplimiento` (puntualidad de entregas) mostrado por chofer.
- **Bonos:** ⚪ no implementado (sin requerimiento concreto aún).

## 9. Implementado vs solo diseño/pendiente
- **Implementado y conectado a Supabase:** landing, solicitudes, cuentas mayorista, monitoreo/GPS, incidencias, mensajes, compras chofer, entregas con evidencia, pago Mercado Pago.
- **Solo demo (lib):** Dashboard, Pedidos, Producción, Tareas, Inventario, Despachos, Limpieza, Mantención, Finanzas, Comercial (productos/clientes/campañas), Personas, Gerencia.
- **Config externa hecha esta sesión:** credenciales de producción MP + webhook; SMTP Supabase con Resend; recuperación de acceso SuperAdmin. **En proceso:** verificación de dominio `nomafood.cl` en Resend (registros DNS en NIC Chile — quedó a mitad).

## 10. Incidencias operativas resueltas en la sesión
- Bug webhook MP (nombre de env `MERCADO_PAGO_ACCESS_TOKEN`) → corregido.
- Botón "Actualizar" sin feedback → corregido.
- KPI "Entregas de hoy" siempre 0 (filtro excluía entregados) → corregido.
- "no vinculada" en la cuenta del cliente (mismo correo en varios mayoristas) → parche `limit(1)`.
- Registro de solicitudes daba 500 → causa: `SUPABASE_SERVICE_ROLE_KEY` quedó con la llave equivocada al editar envs; **corregida por Nataly** y verificada (registro vuelve a funcionar).

## 11. Próxima fase recomendada (orden de prioridad)
1. **Terminar verificación de dominio en Resend** (Nataly, con guía) → correos a clientes reales.
2. **Probar un pago real** con otra tarjeta/persona.
3. **Endurecer RLS** de `mayoristas`/`mayorista_pedidos` (seguridad, bloqueante de producción).
4. **Ingreso automático en Caja** al aprobarse un pago (Caja real en base).
5. **Fase 2 Portal Mayorista** (catálogo+specs+pago+promos dentro de la cuenta).
6. **Migrar páginas demo de la Central a Supabase** (Pedidos → Producción → Picking → Despacho end-to-end real).
7. **Limpiar datos demo** y preparar merge a `main`.
