-- ════════════════════════════════════════════════════════════════════
--  LIMPIEZA DE DATOS DEMO — NOMMA FOOD  (v2, orden FK corregido)
--  Una sola transacción: si algo falla, se revierte TODO (0 filas).
--  Respaldo: esquema respaldo.* (29 tablas) + rama backup/pre-limpieza-datos.
--  Conserva: Vicente (pedido MAY-20260705-6305) + 1 producto ejemplo (Empanadas, may-005).
--  NO toca Auth users ni Storage.
-- ════════════════════════════════════════════════════════════════════

-- A) Entregas/incidencias de PEDIDOS demo y del CHOFER demo (antes de pedidos y rutas)
delete from public.entregas    where pedido_id in (select p.id from public.mayorista_pedidos p join public.mayoristas m on m.id=p.mayorista_id where lower(m.email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));
delete from public.incidencias where pedido_id in (select p.id from public.mayorista_pedidos p join public.mayoristas m on m.id=p.mayorista_id where lower(m.email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));
delete from public.entregas    where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.incidencias where driver_id in (select id from public.drivers where nombre='Carlos Chofer');

-- B) Hijos del CHOFER demo (por driver)
delete from public.driver_messages where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.jornada_resumen where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.location_pings  where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.driver_positions where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.compra_items         where compra_id in (select id from public.compras where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.compra_comprobantes  where compra_id in (select id from public.compras where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.compras_sin_factura  where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.compras              where driver_id in (select id from public.drivers where nombre='Carlos Chofer');

-- C) PEDIDOS demo (items e historial en cascada)
delete from public.mayorista_pedidos where mayorista_id in (select id from public.mayoristas where lower(email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));

-- D) RUTAS del chofer demo: primero hijos por route_id, luego routes (route_stops en cascada)
delete from public.jornada_resumen where route_id in (select id from public.routes where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.location_pings  where route_id in (select id from public.routes where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.driver_positions where route_id in (select id from public.routes where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.routes where driver_id in (select id from public.drivers where nombre='Carlos Chofer');

-- E) TURNOS del chofer demo (ahora que routes ya no los referencia)
delete from public.driver_shifts where driver_id in (select id from public.drivers where nombre='Carlos Chofer');

-- F) CHOFER demo
delete from public.drivers where nombre='Carlos Chofer';

-- G) Solicitudes y clientes demo (access_request_events en cascada)
delete from public.access_requests where mayorista_id in (select id from public.mayoristas where lower(email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));
delete from public.access_requests where lower(email) in ('natyladera0406@gmail.com','nomafoodchile@gmail.com','pablo.ladera@osumed.net') or email ilike '%@test.cl';
delete from public.mayoristas where lower(email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net');

-- H) PRODUCTOS: dejar solo Empanadas (may-005) como ejemplo; el resto fuera
--    (product_price_history y product_audit_log se borran en cascada)
delete from public.products where sku is distinct from 'may-005';
