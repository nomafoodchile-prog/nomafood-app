# Checklist maestro — NOMMA FOOD

_Actualizado 2026-07-05. `[x]` hecho · `[ ]` pendiente. Prioridad: Crítica / Alta / Media / Baja. Responsable: Nataly / Desarrollo / Sistema._

## 1. Base técnica, seguridad y permisos
- [x] Next.js 14 + Supabase + Vercel + deploy por rama (Desarrollo)
- [x] Auth Supabase + trigger `handle_new_user` + roles `app_role` (incl. `Mayorista`) (Desarrollo)
- [x] Helpers RLS `is_admin/get_my_driver_id/get_my_mayorista_id` (Desarrollo)
- [x] Storage buckets `entregas/incidencias/comprobantes` (Sistema)
- [x] Realtime en tablas clave (Sistema)
- [ ] **Endurecer RLS** `mayoristas`/`mayorista_pedidos`/`items` (hoy `to authenticated using(true)`) — **Crítica** · Desarrollo · _Terminado = cada cliente solo ve lo suyo; central/chofer intactos_
- [ ] Firma de webhook MP (x-signature) — Media · Desarrollo
- [ ] Rotar/limpiar variables y confirmar `SUPABASE_SERVICE_ROLE_KEY` correcta — Alta · Nataly · _Terminado = registro funciona (✅ verificado)_

## 2. Central Administrativa
- [x] Dashboard rediseñado (demo) · componentes base `components/central`
- [x] Monitoreo en vivo (GPS, choferes, pedidos, incidencias, entregas) — Supabase
- [x] Incidencias (repositorio) — Supabase
- [x] Mensajes a choferes (acuse + badge/sonido) — Supabase
- [x] Compras en curso — Supabase
- [x] Alerta global "¡INCIDENCIA!" + sonido
- [ ] Migrar Pedidos a Supabase — Alta · Desarrollo · _Terminado = pedidos reales, no demo_
- [ ] Migrar Producción/Tareas a Supabase — Alta · Desarrollo
- [ ] Migrar Inventario a Supabase — Alta · Desarrollo
- [ ] Migrar Finanzas (Caja/Cobranza/Costos/Balance) a Supabase — Alta · Desarrollo
- [ ] Migrar Comercial (Productos/Clientes/Campañas) a Supabase — Media · Desarrollo
- [ ] Personas (Usuarios/Accesos) reales por rol — Media · Desarrollo
- [ ] Aplicar estilo Dashboard al resto de páginas — Baja · Desarrollo

## 3. Portal Mayorista y landing pública
- [x] Landing `/mayoristas` mobile-first + SEO/OG + productos reales
- [x] Formulario de solicitud + dedup + estados + historial + origen UTM
- [x] Panel Comercial de solicitudes (KPIs, filtros, acciones)
- [x] Crear cuenta cliente (Auth) + vínculo `mayoristas.profile_id` + rol Mayorista
- [x] Invitación + recuperación de contraseña por correo (SMTP Resend)
- [x] Plantillas de correo con marca (Invite/Reset)
- [ ] **Verificar dominio `nomafood.cl` en Resend** (DNS NIC Chile) — **Crítica** · Nataly · _Terminado = correos llegan a cualquier cliente_
- [ ] Fase 2 cuenta: catálogo+especificaciones+pago+promos dentro del login — Alta · Desarrollo
- [ ] Marcar 3–6 productos `destacado` + fotos/desc pública — Media · Nataly
- [ ] `landing_config`: video, zonas de cobertura reales — Baja · Nataly

## 4. Portal Cliente (mayorista con cuenta)
- [x] Login email+contraseña · crear contraseña · recuperar
- [x] Cuenta: descuento, pedidos en curso, historial (Realtime)
- [ ] Catálogo + pago + promociones DENTRO de la cuenta (hoy reusa portal token) — Alta · Desarrollo

## 5. Portal Picker
- [ ] Revisar portal `/portal/picker/[token]` existente — Alta · Desarrollo · _Terminado = picking real conectado a la Central_
- [ ] Checklist de armado por pedido, faltantes, evidencia — Alta · Desarrollo

## 6. Portal Operario
- [ ] Revisar portal `/portal/operario/[token]` existente — Alta · Desarrollo
- [ ] Tareas/ADT, reporte con validación de supervisor, evidencia — Alta · Desarrollo

## 7. Portal Chofer
- [x] Login + dashboard operativo
- [x] Entregas con stepper + foto factura + firma cliente
- [x] "Llegué al cliente" bloqueado por cercanía GPS
- [x] Navegación Waze
- [x] Compras (precio/foto/checklist/finalizar)
- [x] Mensajes (badge + sonido + Recibido + Llamar central)
- [x] Reporte GPS en vivo
- [ ] Badges numéricos en el menú + Perfil con vehículo real — Baja · Desarrollo

## 8. Inventario, recetas, preelaboraciones y merma
- [ ] Inventario real (movimientos, stock, alertas) en Supabase — Alta · Desarrollo
- [ ] Recetas por tanda + preelaboraciones + costos reales — Media · Desarrollo
- [ ] Registro de merma/vencidos/ajustes — Media · Desarrollo

## 9. Producción, picking y calidad
- [ ] Órdenes de producción reales — Alta · Desarrollo
- [ ] ADT por área/operario — Media · Desarrollo
- [ ] Control de calidad + validación supervisor — Media · Desarrollo

## 10. Compras y proveedores
- [x] Compras del chofer (checklist en vivo)
- [ ] Proveedores reales + lista de precios (hoy demo) — Media · Desarrollo
- [ ] Comprobante/boleta de compra + estados — Media · Desarrollo

## 11. Despachos, GPS y comprobantes
- [x] Asignación chofer, rutas, dos pistas de estado
- [x] GPS en vivo (mapa que sigue al camión)
- [x] Comprobante de entrega (foto + firma) visible en Central
- [ ] GPS avanzado (velocidad/ETA/km/historial) sobre `location_pings` — Media · Desarrollo
- [ ] Geocodificación fina / pin manual para direcciones difíciles — Media · Desarrollo

## 12. Finanzas y Mercado Pago
- [x] Checkout Mercado Pago (preferencia + init_point)
- [x] Credenciales de PRODUCCIÓN en Vercel (Nataly)
- [x] Webhook MP corregido y registrado (modo productivo, "Pagos")
- [ ] **Probar pago real** (otra cuenta/tarjeta o usuarios de prueba) — **Alta** · Nataly · _Terminado = pedido pasa a "Pagado"_
- [ ] **Ingreso automático en Caja** al aprobarse pago — **Alta** · Desarrollo · _Terminado = ingreso real en Caja_
- [ ] Caja real en base (no demo) + Cobranza/crédito — Alta · Desarrollo

## 13. WhatsApp, notificaciones y automatizaciones
- [x] `notifications_outbox` + botón `wa.me` de un toque
- [x] Sonido/badge/alertas en Central y Chofer
- [ ] WhatsApp Business API real (worker + plantillas) — Media · Nataly+Desarrollo
- [ ] Correo transaccional a cualquier cliente (depende de dominio Resend) — Crítica · Nataly

## 14. Limpieza y mantención
- [ ] Calendario de limpieza real (hoy demo) — Baja · Desarrollo
- [ ] Calendario de mantención de máquinas real (hoy demo) — Baja · Desarrollo

## 15. QA, datos demo y producción
- [ ] Limpiar solicitudes/cuentas/pedidos/compras/mensajes de prueba — Alta · Nataly+Desarrollo
- [ ] Reemplazar toda la data demo de `lib/` por datos reales — Alta · Desarrollo
- [ ] Merge PR #1 y PR #2; llevar `feature/portal-chofer` a `main` — Alta · Nataly+Desarrollo
- [ ] `NEXT_PUBLIC_SITE_URL` en Vercel — Media · Nataly
- [ ] Pruebas end-to-end por rol — Alta · Desarrollo

## 16. PWA / futura app móvil
- [ ] Convertir portales (chofer/picker/operario) en PWA instalable — Baja · Desarrollo
- [ ] Notificaciones push nativas — Baja · Desarrollo
