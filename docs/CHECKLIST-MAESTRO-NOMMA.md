# Checklist Maestro — NOMMA FOOD

_Actualizado 2026-07-05 tras la Auditoría Integral (ver `docs/AUDITORIA-INTEGRAL-SISTEMA-NOMMA.md`)._
_`[x]` hecho · `[ ]` pendiente. Prioridad: Crítica / Alta / Media / Baja. Responsable: Nataly / Desarrollo / Sistema._
_Formato pendiente: `[ ] Tarea — Prioridad · Responsable · Dependencia · Criterio de terminado`._

## 1. Base técnica
- [x] Next.js 14 + Supabase + Vercel + deploy por rama (Desarrollo)
- [x] Auth Supabase + roles `app_role` (incl. `Mayorista`) (Desarrollo)
- [x] Helpers RLS `is_admin/get_my_mayorista_id/_pedido_es_mio/_compra_es_mia` (Desarrollo)
- [x] Realtime en `access_requests/compra_items/entregas` (Sistema)
- [ ] Commitear migración fase0 logística + `notifications_outbox` (no están en el repo) — Media · Desarrollo · — · _Terminado = el esquema se reconstruye desde `supabase/`_
- [ ] Definir destino de `schema.sql` (archivar o aplicar por partes) — Alta · Nataly+Desarrollo · Decisión O.1 · _Terminado = una sola fuente de esquema_

## 2. Seguridad — FASE A ✅ (aplicada/probada 2026-07-05)
- [x] **Endurecer RLS** `mayoristas`/`mayorista_pedidos`/`items` (cierra `USING(true)`) — A2, `supabase/seguridad-fase-a-rls.sql` aplicado; admin verificado (Chequeo 1 ✅)
- [x] **Middleware real** (valida sesión con `getUser` + refresca token) — A3, commit `cc7ff53`
- [x] **Gate por rol en la Central** (solo roles internos) — A1, commit `83cd847` (probado: admin entra ✅)
- [x] **Validación `x-signature` en webhook MP** (activa si hay secreto) — A4, commit `cc7ff53`
- [ ] Configurar `MERCADO_PAGO_WEBHOOK_SECRET` en Vercel + MP para exigir firma — Media · Nataly · A4 · _Terminado = webhook firmado obligatorio_
- [ ] Revisar info sensible visible por rol (clientes, finanzas) — Alta · Desarrollo · RLS · _Terminado = sin fugas entre roles_

## 3. Base de datos
- [x] Tablas mayoristas/pedidos/items, access_requests, products, landing_config
- [ ] Verificar en DB qué tablas de `schema.sql` existen realmente — Alta · Nataly · — · _Terminado = inventario real de tablas_
- [ ] Modelo limpio y único para pedidos/clientes/productos (evitar duplicados) — Alta · Desarrollo · O.1 · _Terminado = sin tablas espejo_

## 4. Permisos
- [x] Enum `app_role` con roles de fábrica
- [ ] Políticas por rol para operario/picker/chofer/mayorista — Alta · Desarrollo · Seguridad · _Terminado = cada rol solo su alcance_

## 5. Central Administrativa
- [x] Monitoreo en vivo (GPS, choferes, pedidos, incidencias, entregas) — Supabase
- [x] Incidencias (repositorio) — Supabase
- [x] Mensajes a choferes (acuse + badge) — Supabase
- [x] Compras en curso (checklist chofer) — Supabase
- [ ] **Migrar Pedidos a Supabase** (mostrar/gestionar `mayorista_pedidos`) — **Alta** · Desarrollo · — · _Terminado = pedidos reales visibles y gestionables_
- [ ] Dashboard con métricas reales — Media · Desarrollo · Pedidos+Finanzas · _Terminado = KPIs desde DB_
- [ ] Despachos: unificar con logística real (quitar demo) — Media · Desarrollo · — · _Terminado = una sola vista de despacho_

## 6. Comercial
- [x] Solicitudes de acceso (KPIs, filtros, acciones)
- [ ] Clientes reales (usar `mayoristas`, no demo) — Media · Desarrollo · — · _Terminado = clientes reales editables_
- [ ] Productos reales (usar tabla `products`) — Media · Desarrollo · — · _Terminado = catálogo real gestionable_
- [ ] Campañas reales — Baja · Desarrollo

## 7. Portal Mayorista y Landing
- [x] Landing `/mayoristas` + SEO/OG + productos reales
- [x] Solicitud + dedup + estados + historial
- [x] Crear cuenta (Auth) + vínculo `profile_id` + rol Mayorista
- [x] Invitación + recuperación por correo (SMTP Resend)
- [x] **Dominio `nomafood.cl` verificado en Resend** + Sender `portal@nomafood.cl` — ✅ 2026-07-05 (correo real recibido)
- [ ] Listas de precios por cliente (hoy solo `descuento_pct`) — Alta · Desarrollo · O.4 · _Terminado = precio correcto por cliente_
- [ ] Limpiar fichas duplicadas de un mismo mayorista — Alta · Nataly+Desarrollo · — · _Terminado = una ficha por cliente_

## 8. Portal Cliente
- [x] Login + crear/recuperar contraseña
- [x] Cuenta: descuento, pedidos en curso, historial (Realtime)
- [x] Confirmación de pago (verifica con MP y marca `pagado`) — ✅ 2026-07-05
- [ ] Catálogo + pago + promociones DENTRO de la cuenta — Alta · Desarrollo · — · _Terminado = sin reusar token_

## 9. Pedidos
- [x] Creación de pedido mayorista + preferencia MP
- [ ] Pedidos reales en la Central + estados operativos — Alta · Desarrollo · #5 · _Terminado = ciclo de pedido gestionable_
- [ ] Enlazar pedido → producción/inventario — Alta · Desarrollo · #11,#12 · _Terminado = el pedido dispara requerimientos_

## 10. Producción
- [ ] Órdenes de producción reales — Alta · Desarrollo · #12 recetas · _Terminado = producción calculada desde pedidos_
- [ ] Portal Operario nuevo conectado — Alta · Desarrollo · — · _Terminado = operario opera con datos reales_
- [ ] Producto terminado disponible para picking — Alta · Desarrollo · — · _Terminado = stock PT real_

## 11. Inventario
- [ ] Inventario real (movimientos, stock, alertas) — Alta · Desarrollo · — · _Terminado = stock confiable con trazabilidad_
- [ ] Reserva/descuento de stock al pagar pedido — Alta · Desarrollo · #9 · _Terminado = no se vende sin stock_

## 12. Recetas
- [ ] Recetas por producto (ingredientes + pasos) — Media · Desarrollo · #11 · _Terminado = receta usable en producción_

## 13. Preelaboraciones
- [ ] Preelaboraciones y su consumo/rendimiento — Media · Desarrollo · #12 · _Terminado = preelaboración descuenta insumos_

## 14. Portal Operario
- [ ] Reemplazar portal viejo `/portal/operario/[token]` (tablas no aplicadas) — Alta · Desarrollo · — · _Terminado = turno, tareas, receta paso a paso, producido, merma, calidad_
- [ ] Rendimiento diario + cumplimiento — Media · Desarrollo · #29 · _Terminado = métricas reales_

## 15. Portal Picker
- [ ] Reemplazar portal viejo `/portal/picker/[token]` (tablas no aplicadas) — Alta · Desarrollo · — · _Terminado = lista exacta, check por producto, validación cantidades/fechado/etiquetado, foto, cierre validado_
- [ ] Alertas de error + cierre solo con validaciones completas — Alta · Desarrollo · — · _Terminado = no cierra con errores_

## 16. Calidad
- [ ] Fechado/etiquetado/temperaturas/checklists/no conformidades — Alta · Desarrollo · #14,#15 · _Terminado = evidencia y responsable por lote_

## 17. Merma
- [ ] Registro de merma con motivo/responsable/acción correctiva — Alta · Desarrollo · #16 · _Terminado = merma trazable e impacta costos_

## 18. Portal Chofer
- [x] Login + dashboard operativo
- [x] Entregas con foto factura + firma cliente
- [x] "Llegué al cliente" bloqueado por GPS + navegación Waze
- [x] Compras (precio/foto/checklist)
- [x] Mensajes (badge + sonido + Recibido + Llamar central)
- [x] Reporte GPS en vivo
- [ ] Deprecage portal chofer viejo `/portal/chofer/[token]` — Media · Desarrollo · — · _Terminado = una sola versión_

## 19. Despacho
- [x] Asignación chofer, rutas, dos pistas de estado
- [x] Comprobante de entrega (foto+firma) en Central
- [ ] Liberar despacho desde picking cerrado — Alta · Desarrollo · #15 · _Terminado = despacho nace de picking real_

## 20. GPS
- [x] GPS en vivo (mapa que sigue al camión)
- [ ] GPS avanzado (velocidad/ETA/km/historial de recorrido) — Media · Desarrollo · — · _Terminado = historial por ruta_

## 21. Compras
- [x] Compras del chofer (checklist en vivo)
- [ ] Compras impactan inventario y costos — Alta · Desarrollo · #11 · _Terminado = stock/costos actualizados_
- [ ] Solicitudes de compra + boletas/facturas + estados — Media · Desarrollo

## 22. Proveedores
- [ ] Proveedores reales + lista de precios + comparación — Media · Desarrollo · — · _Terminado = decisión de compra con datos reales_

## 23. Finanzas
- [x] Checkout Mercado Pago (preferencia + pago real confirmado)
- [ ] **Ingreso automático en Caja** al aprobarse pago — **Alta** · Desarrollo · #9 · _Terminado = ingreso real en Caja_
- [ ] Caja/Cobranza/Costos/Balance reales — Alta · Desarrollo · — · _Terminado = finanzas desde DB_

## 24. Mercado Pago
- [x] Credenciales de producción + webhook + verificación al volver
- [x] **Primer pago real exitoso** (op. #167380926558) — ✅ 2026-07-05
- [ ] `NEXT_PUBLIC_SITE_URL` = dominio real + webhook firmado — Alta · Nataly+Desarrollo · O.6 · _Terminado = webhook llega y validado_
- [ ] Probar más pagos reales de clientes — Alta · Nataly

## 25. WhatsApp
- [x] `notifications_outbox` + botón `wa.me`
- [ ] WhatsApp Business API + worker de envío — Media · Nataly+Desarrollo · — · _Terminado = mensajes automáticos_

## 26. Notificaciones
- [x] Sonido/badge/alertas en Central y Chofer
- [ ] Procesador del outbox (correo/WhatsApp automático por evento) — Media · Desarrollo · — · _Terminado = eventos disparan avisos solos_

## 27. Limpieza
- [ ] Calendario de limpieza real — Baja · Desarrollo

## 28. Mantención
- [ ] Calendario de mantención de máquinas real — Baja · Desarrollo

## 29. Indicadores
- [ ] Indicadores de cumplimiento (tiempo, calidad, merma) reales — Media · Desarrollo · #16,#17,#20 · _Terminado = KPIs por rol desde DB_

## 30. Bonos
- [ ] Bonos por **calidad + cantidades correctas + sin reclamos + fechado/etiquetado + merma controlada + tiempo** (no solo rapidez) — Media · Desarrollo · #29 · _Terminado = bono calculado con criterios de calidad_

## 31. QA
- [ ] Pruebas end-to-end por rol — Alta · Desarrollo · — · _Terminado = flujos validados_
- [ ] Merge de ramas y llevar a `main` — Alta · Nataly+Desarrollo

## 32. Datos demo
- [ ] Limpiar clientes/choferes/pedidos ficticios de producción (Verde Vivo, Raíces Veganas, Carlos Chofer, seeds) — Alta · Nataly+Desarrollo · O.5 · _Terminado = solo datos reales_
- [ ] Reemplazar data demo de `lib/` por datos reales — Alta · Desarrollo

## 33. Producción real
- [ ] Dominio productivo + variables + protección de despliegue correcta — Alta · Nataly · O.6
- [ ] Checklist de go-live por área — Alta · Nataly+Desarrollo

## 34. PWA y futura app móvil
- [ ] Portales (chofer/picker/operario) como PWA instalable — Baja · Desarrollo
- [ ] Notificaciones push nativas — Baja · Desarrollo
