-- ════════════════════════════════════════════════════════════════════
--  LIMPIEZA DE DATOS DEMO — NOMMA FOOD
--  Ejecutar SOLO con aprobación de Nataly. Una sola transacción:
--  si algún paso falla, Postgres revierte TODO (0 filas borradas).
--  Respaldo previo: esquema respaldo.* (29 tablas).
--  Conserva: Vicente (pedido MAY-20260705-6305), productos, catálogos.
--  NO toca Auth users ni Storage.
-- ════════════════════════════════════════════════════════════════════

-- 1) Entregas/incidencias de PEDIDOS demo
delete from public.entregas    where pedido_id in (select p.id from public.mayorista_pedidos p join public.mayoristas m on m.id=p.mayorista_id where lower(m.email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));
delete from public.incidencias where pedido_id in (select p.id from public.mayorista_pedidos p join public.mayoristas m on m.id=p.mayorista_id where lower(m.email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));

-- 2) Datos del CHOFER demo (Carlos Chofer)
delete from public.entregas        where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.incidencias     where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.driver_messages where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.driver_shifts   where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.jornada_resumen where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.location_pings  where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.compra_items         where compra_id in (select id from public.compras where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.compra_comprobantes  where compra_id in (select id from public.compras where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.compras_sin_factura  where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.compras              where driver_id in (select id from public.drivers where nombre='Carlos Chofer');
delete from public.driver_positions     where driver_id in (select id from public.drivers where nombre='Carlos Chofer');

-- 3) PEDIDOS demo (items e historial en cascada)
delete from public.mayorista_pedidos where mayorista_id in (select id from public.mayoristas where lower(email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));

-- 4) RUTAS del chofer demo (route_stops en cascada)
delete from public.jornada_resumen where route_id in (select id from public.routes where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.location_pings  where route_id in (select id from public.routes where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.driver_positions where route_id in (select id from public.routes where driver_id in (select id from public.drivers where nombre='Carlos Chofer'));
delete from public.routes where driver_id in (select id from public.drivers where nombre='Carlos Chofer');

-- 5) CHOFER demo
delete from public.drivers where nombre='Carlos Chofer';

-- 6) Solicitudes y clientes demo (access_request_events en cascada)
delete from public.access_requests where mayorista_id in (select id from public.mayoristas where lower(email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));
delete from public.access_requests where lower(email) in ('natyladera0406@gmail.com','nomafoodchile@gmail.com','pablo.ladera@osumed.net') or email ilike '%@test.cl';
delete from public.mayoristas where lower(email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net');
