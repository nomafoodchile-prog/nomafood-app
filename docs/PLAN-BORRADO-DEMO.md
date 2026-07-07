# Plan de borrado de datos demo — NOMMA FOOD

_Fecha: 2026-07-06 · Etapa 3 (plan) · **NO ejecutado**. Respaldo: esquema `respaldo.*` (29 tablas) + rama `backup/pre-limpieza-datos`._

## Registros que se eliminan (confirmados por Nataly)
**Clientes (mayoristas):** Verde Vivo Ltda, Raíces Veganas SpA, Café Central SpA (demo.nomma), kkkk, Distribuidora Verde Ltda, Aldea vegetal (natyladera0406), Osumed Latam (pablo.ladera).
**Chofer:** Carlos Chofer (teléfono falso).
**Pedidos:** los de esos clientes → MAY-...-2786, 3497, 7441, 9607, 9984, 4783 (+ sus items, entregas, incidencias, historial).
**Solicitudes:** las de esos clientes + la de test `diag722932599@test.cl`.

## Se CONSERVA
- **Vicente (A.V)** + su pedido MAY-...-6305 ($1.450 pagado) + su solicitud. *(La ficha duplicada de Vicente se resuelve aparte, no en este borrado.)*
- **Todos los productos**, catálogos, historial de precios y auditoría.
- **Auth users y Storage: NO se tocan** (se limpian después, tras confirmar que no rompen nada).

## Orden de borrado (según mapa FK)
CASCADE (se borran solos): `mayorista_pedido_items`, `pedido_estado_historial`, `route_stops`, `compra_items`, `compra_comprobantes`, `access_request_events`, `driver_positions→drivers`.
NO ACTION (hay que borrar a mano primero): `entregas`, `incidencias`, `compras`, `compras_sin_factura`, `driver_messages`, `driver_shifts`, `jornada_resumen`, `location_pings`, `routes`, `mayorista_pedidos`, `access_requests`.

## Script (una sola transacción — si algo falla, se revierte TODO y no borra nada)
```sql
-- 1) Entregas/incidencias de PEDIDOS demo
delete from public.entregas    where pedido_id in (select p.id from public.mayorista_pedidos p join public.mayoristas m on m.id=p.mayorista_id where lower(m.email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));
delete from public.incidencias where pedido_id in (select p.id from public.mayorista_pedidos p join public.mayoristas m on m.id=p.mayorista_id where lower(m.email) in ('verdevivo@demo.nomma','raices@demo.nomma','cafecentral@demo.nomma','distribuidor@nomafood.cl','nomafoodchile@gmail.com','natyladera0406@gmail.com','pablo.ladera@osumed.net'));

-- 2) Datos del CHOFER demo (Carlos)
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
```

## Riesgos y mitigación
- **Una sola transacción:** si cualquier paso falla (FK, columna), Postgres revierte TODO → 0 filas borradas. Reintentamos tras ajustar.
- **Respaldo:** si tras ejecutar algo se ve mal, restauramos desde `respaldo.*`.
- **Vicente intacto:** su email no está en ninguna lista; su pedido 6305 y solicitud se conservan.
- **Storage:** las fotos/firmas/comprobantes de las entregas/compras borradas quedan como archivos **huérfanos** en los buckets (no se borran ahora, por regla). Se limpian después.
- **Auth users:** los usuarios de los clientes demo quedan en Auth (sin ficha). Se limpian después, tras confirmar que no rompen accesos.

## Pruebas post-limpieza
1. **Central → Pedidos:** solo debe quedar el de Vicente (MAY-...-6305).
2. **Central → Monitoreo:** sin Carlos ni pedidos demo; sin errores.
3. **Comercial → Productos:** todos los productos intactos.
4. **Portal Mayorista (Vicente):** su cuenta y pedido siguen visibles.
5. **Solicitudes:** solo queda la de Vicente.
