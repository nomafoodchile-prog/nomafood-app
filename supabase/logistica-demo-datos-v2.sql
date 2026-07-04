-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — DATOS DE DEMOSTRACIÓN (para vivir la experiencia)
--  3 clientes con entregas pendientes + 1 compra con lista + 1 mensaje.
--  Idempotente: no duplica si ya existen (marcados con @demo.nomma).
-- ════════════════════════════════════════════════════════════════════
do $$
declare
  v_driver uuid; v_wh uuid; v_may uuid; v_ped uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_compra uuid;
begin
  select id into v_driver from public.drivers order by created_at limit 1;
  select id into v_wh from public.warehouses limit 1;
  if v_driver is null then raise notice 'No hay chofer. Corre antes el setup del chofer.'; return; end if;

  select id into v_p1 from public.products where sku='may-001';
  select id into v_p2 from public.products where sku='may-005';
  select id into v_p3 from public.products where sku='may-007';

  -- Solo sembrar si no existen aún los clientes demo
  if not exists (select 1 from public.mayoristas where email like '%@demo.nomma') then

    -- Cliente 1 · Café Central
    insert into public.mayoristas(nombre, empresa, email, telefono, activo)
      values ('María González','Café Central SpA','cafecentral@demo.nomma','+56 9 8765 4321', true) returning id into v_may;
    insert into public.mayorista_pedidos(mayorista_id, chofer_id, warehouse_id, estado, estado_entrega, subtotal, descuento_monto, total, direccion_entrega, telefono_entrega, bultos, hora_programada)
      values (v_may, v_driver, v_wh, 'asignado','pendiente', 15400, 0, 15400, 'Av. Italia 1234, Providencia, Santiago','+56 9 8765 4321', 4, current_date + time '10:15') returning id into v_ped;
    insert into public.mayorista_pedido_items(pedido_id, producto_id, producto_nombre, cantidad, precio_lista, precio_final, unidad) values
      (v_ped, v_p1, 'Ciabatta lomito seitan', 2, 3850, 3850, 'caja'),
      (v_ped, v_p2, 'Empanadas veganas', 5, 1450, 1450, 'bandeja');

    -- Cliente 2 · Verde Vivo
    insert into public.mayoristas(nombre, empresa, email, telefono, activo)
      values ('Rodrigo Silva','Verde Vivo Ltda','verdevivo@demo.nomma','+56 9 7654 3210', true) returning id into v_may;
    insert into public.mayorista_pedidos(mayorista_id, chofer_id, warehouse_id, estado, estado_entrega, subtotal, descuento_monto, total, direccion_entrega, telefono_entrega, bultos, hora_programada)
      values (v_may, v_driver, v_wh, 'asignado','pendiente', 20800, 0, 20800, 'Holanda 567, Ñuñoa, Santiago','+56 9 7654 3210', 6, current_date + time '10:45') returning id into v_ped;
    insert into public.mayorista_pedido_items(pedido_id, producto_id, producto_nombre, cantidad, precio_lista, precio_final, unidad) values
      (v_ped, v_p3, 'Gohan chicken crispy', 4, 5200, 5200, 'caja');

    -- Cliente 3 · Raíces Veganas
    insert into public.mayoristas(nombre, empresa, email, telefono, activo)
      values ('Camila Rojas','Raíces Veganas SpA','raices@demo.nomma','+56 9 6543 2109', true) returning id into v_may;
    insert into public.mayorista_pedidos(mayorista_id, chofer_id, warehouse_id, estado, estado_entrega, subtotal, descuento_monto, total, direccion_entrega, telefono_entrega, bultos, hora_programada)
      values (v_may, v_driver, v_wh, 'asignado','pendiente', 11550, 0, 11550, 'Irarrázaval 3456, Macul, Santiago','+56 9 6543 2109', 3, current_date + time '11:30') returning id into v_ped;
    insert into public.mayorista_pedido_items(pedido_id, producto_id, producto_nombre, cantidad, precio_lista, precio_final, unidad) values
      (v_ped, v_p2, 'Empanadas veganas', 3, 1450, 1450, 'bandeja'),
      (v_ped, v_p1, 'Ciabatta lomito seitan', 2, 3850, 3850, 'caja');
  end if;

  -- Compra asignada con lista de productos
  if not exists (select 1 from public.compras where proveedor = 'Lo Valledor') then
    insert into public.compras(driver_id, proveedor, direccion, telefono, contacto, horario_atencion, forma_pago, monto_autorizado, estado, observaciones)
      values (v_driver, 'Lo Valledor', 'Av. Salesianos 100, Pedro Aguirre Cerda', '+56 2 2555 1234', 'Sr. Pérez (puesto 42)', '06:00 - 14:00', 'Efectivo', 80000, 'asignada', 'Comprar lo más fresco disponible. Guardar boleta.')
      returning id into v_compra;
    insert into public.compra_items(compra_id, producto, cantidad, unidad, observaciones) values
      (v_compra, 'Tomate', 15, 'kg', 'Maduros, para vitrina'),
      (v_compra, 'Lechuga', 20, 'unidad', 'Costina'),
      (v_compra, 'Palta', 10, 'kg', 'Hass, punto medio'),
      (v_compra, 'Cebolla', 12, 'kg', null),
      (v_compra, 'Zanahoria', 8, 'kg', null);
  end if;

  -- Mensaje de la Central
  if not exists (select 1 from public.driver_messages where driver_id = v_driver and tipo = 'alerta') then
    insert into public.driver_messages(driver_id, tipo, texto) values
      (v_driver, 'alerta', 'Buenos días, Carlos. Prioriza la entrega de Café Central antes de las 10:30. Recuerda registrar la foto de respaldo en cada entrega. ¡Gracias por tu compromiso!');
  end if;

  raise notice 'Demo lista: % pedidos pendientes, compras y mensaje del chofer creados.',
    (select count(*) from public.mayorista_pedidos where chofer_id = v_driver and estado_entrega = 'pendiente');
end $$;
