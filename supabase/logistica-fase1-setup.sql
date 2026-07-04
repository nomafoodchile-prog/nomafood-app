-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — LOGÍSTICA · FASE 1 · SETUP PARA PROBAR EL PORTAL CHOFER
--  Ejecutar en Supabase SQL Editor DESPUÉS de crear el usuario chofer.
--  Incluye: lógica de negocio + datos de prueba (bodega, chofer, pedidos).
--  Requiere la Fase 0 aplicada. Idempotente.
--
--  ANTES de correr esto: crea en Authentication → Users un usuario:
--     email:  chofer1@nommafood.cl   ·   password: (una que anotes)
--     Auto Confirm User: ACTIVADO
-- ════════════════════════════════════════════════════════════════════

-- ── RLS de pedidos: aislar por chofer (quitar política permisiva) ────
alter table public.mayorista_pedidos enable row level security;
drop policy if exists "admins_pedidos" on public.mayorista_pedidos;
drop policy if exists pedidos_chofer_sel on public.mayorista_pedidos;
create policy pedidos_chofer_sel on public.mayorista_pedidos
  for select using (public.is_admin() or chofer_id = public.get_my_driver_id());

-- ── Lógica de negocio (máquina de estados + operaciones) ─────────────
create or replace function public.transicion_valida(p_actual text, p_nuevo text)
returns boolean language sql immutable as $$
  select (p_actual, p_nuevo) in (
    ('confirmado','pagado'),('pagado','en_preparacion'),
    ('en_preparacion','despachado'),('despachado','entregado'),
    ('confirmado','cancelado'),('pagado','cancelado'),
    ('en_preparacion','cancelado'),('despachado','cancelado'));
$$;

create or replace function public.avanzar_estado_pedido(
  p_pedido_id uuid, p_nuevo_estado text, p_lat numeric default null, p_lng numeric default null
) returns void language plpgsql security definer as $$
declare v_actual text; v_rol public.app_role; v_driver uuid; v_pedido_driver uuid;
begin
  select estado, chofer_id into v_actual, v_pedido_driver from public.mayorista_pedidos where id = p_pedido_id;
  if v_actual is null then raise exception 'El pedido no existe'; end if;
  v_rol := public.get_my_role(); v_driver := public.get_my_driver_id();
  if not public.transicion_valida(v_actual, p_nuevo_estado) then
    raise exception 'Transición no permitida: % → %', v_actual, p_nuevo_estado; end if;
  if v_rol = 'SuperAdmin' then null;
  elsif v_rol = 'Chofer' then
    if v_driver is null or v_pedido_driver is distinct from v_driver then
      raise exception 'No autorizado: pedido no asignado a este chofer'; end if;
    if p_nuevo_estado not in ('despachado','entregado') then
      raise exception 'El chofer solo puede marcar Despachado o Entregado'; end if;
  else raise exception 'No autorizado para cambiar el estado'; end if;
  update public.mayorista_pedidos set estado = p_nuevo_estado, estado_updated_at = now() where id = p_pedido_id;
  insert into public.pedido_estado_historial (pedido_id, estado_anterior, estado_nuevo, changed_by, origen, lat, lng)
  values (p_pedido_id, v_actual, p_nuevo_estado, auth.uid(), 'portal_chofer', p_lat, p_lng);
end; $$;

create or replace function public.registrar_entrega(
  p_pedido_id uuid, p_receptor text, p_foto_url text,
  p_obs text default null, p_lat numeric default null, p_lng numeric default null
) returns void language plpgsql security definer as $$
declare v_driver uuid;
begin
  if p_foto_url is null or length(trim(p_foto_url))=0 then raise exception 'La foto de respaldo es obligatoria'; end if;
  if p_receptor is null or length(trim(p_receptor))=0 then raise exception 'Registra quién recibe'; end if;
  v_driver := public.get_my_driver_id();
  insert into public.entregas (pedido_id, driver_id, receptor_nombre, observaciones, foto_url, lat, lng)
  values (p_pedido_id, v_driver, p_receptor, p_obs, p_foto_url, p_lat, p_lng);
  perform public.avanzar_estado_pedido(p_pedido_id, 'entregado', p_lat, p_lng);
end; $$;

create or replace function public.reportar_incidencia(
  p_pedido_id uuid, p_tipo public.incidencia_tipo, p_comentario text default null,
  p_foto_url text default null, p_lat numeric default null, p_lng numeric default null
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  insert into public.incidencias (pedido_id, driver_id, tipo, comentario, foto_url, lat, lng)
  values (p_pedido_id, public.get_my_driver_id(), p_tipo, p_comentario, p_foto_url, p_lat, p_lng)
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.iniciar_ruta() returns uuid language plpgsql security definer as $$
declare v_driver uuid; v_shift uuid; v_route uuid;
begin
  v_driver := public.get_my_driver_id();
  if v_driver is null then raise exception 'Usuario sin chofer asociado'; end if;
  select id into v_shift from public.driver_shifts where driver_id=v_driver and fecha=current_date limit 1;
  if v_shift is null then
    insert into public.driver_shifts(driver_id, estado, hora_ingreso) values (v_driver,'en_ruta',now()) returning id into v_shift;
  else update public.driver_shifts set estado='en_ruta', hora_ingreso=coalesce(hora_ingreso,now()) where id=v_shift; end if;
  insert into public.routes(driver_id, shift_id, estado, hora_inicio) values (v_driver,v_shift,'en_ruta',now()) returning id into v_route;
  return v_route;
end; $$;

create or replace function public.finalizar_ruta(p_route_id uuid) returns void language plpgsql security definer as $$
declare v_driver uuid; v_shift uuid;
begin
  v_driver := public.get_my_driver_id();
  select shift_id into v_shift from public.routes where id=p_route_id and (driver_id=v_driver or public.is_super_admin());
  if not found then raise exception 'Ruta no encontrada o no autorizada'; end if;
  update public.routes set estado='finalizada', hora_fin=now(), tiempo_total=now()-hora_inicio where id=p_route_id;
  update public.driver_shifts set estado='finalizado', hora_salida=now(), tiempo_trabajado=now()-hora_ingreso where id=v_shift;
end; $$;

grant execute on function public.avanzar_estado_pedido(uuid,text,numeric,numeric) to authenticated;
grant execute on function public.registrar_entrega(uuid,text,text,text,numeric,numeric) to authenticated;
grant execute on function public.reportar_incidencia(uuid,public.incidencia_tipo,text,text,numeric,numeric) to authenticated;
grant execute on function public.iniciar_ruta() to authenticated;
grant execute on function public.finalizar_ruta(uuid) to authenticated;

-- ── DATOS DE PRUEBA: bodega + chofer + asignación de pedidos ─────────
do $$
declare v_profile uuid; v_wh uuid; v_driver uuid;
begin
  select id into v_profile from public.profiles where email = 'chofer1@nommafood.cl';
  if v_profile is null then
    raise notice 'Falta el usuario chofer1@nommafood.cl. Créalo en Authentication → Users y vuelve a correr esto.';
    return;
  end if;

  -- Bodega
  select id into v_wh from public.warehouses where nombre = 'Bodega Central' limit 1;
  if v_wh is null then
    insert into public.warehouses(nombre, direccion) values ('Bodega Central','Santiago') returning id into v_wh;
  end if;

  -- Chofer (marca el perfil como Chofer y crea su registro de driver)
  update public.profiles set role = 'Chofer' where id = v_profile;
  select id into v_driver from public.drivers where profile_id = v_profile;
  if v_driver is null then
    insert into public.drivers(profile_id, nombre, telefono, warehouse_id)
    values (v_profile, 'Carlos Chofer', '+56 9 1234 5678', v_wh) returning id into v_driver;
  end if;

  -- Asigna TODOS los pedidos de prueba a este chofer, listos para despachar
  update public.mayorista_pedidos
     set chofer_id = v_driver,
         warehouse_id = v_wh,
         estado = 'en_preparacion',
         estado_updated_at = now(),
         hora_programada = coalesce(hora_programada, now() + interval '1 hour'),
         telefono_entrega = coalesce(telefono_entrega, '+56 9 8765 4321')
   where estado not in ('entregado','cancelado');

  raise notice 'Listo: chofer % con % pedidos asignados.', v_driver,
    (select count(*) from public.mayorista_pedidos where chofer_id = v_driver);
end $$;

-- FIN. Deberías ver un aviso "Listo: chofer ... con N pedidos asignados."
