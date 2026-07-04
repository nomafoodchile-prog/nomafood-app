-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — LOGÍSTICA · FASE 2A · DOS PISTAS DE ESTADO + OPERACIÓN
--  Pista Central (estado) + Pista Chofer (estado_entrega), funciones de
--  despacho, cumplimiento, bloqueos y limpieza de datos de prueba.
--  Requiere Fase 0/1 aplicadas. Idempotente.
-- ════════════════════════════════════════════════════════════════════

-- ── Enum de la pista del chofer ──────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'estado_entrega') then
    create type estado_entrega as enum
      ('pendiente','cargado','en_ruta','llego_cliente','entregado','no_entregado','incidencia');
  end if;
end $$;

-- Nuevos tipos de incidencia (idempotente)
alter type incidencia_tipo add value if not exists 'retraso';
alter type incidencia_tipo add value if not exists 'problema_pago';

-- ── Campos operativos del pedido ─────────────────────────────────────
alter table public.mayorista_pedidos add column if not exists estado_entrega estado_entrega not null default 'pendiente';
alter table public.mayorista_pedidos add column if not exists bultos int;
alter table public.mayorista_pedidos add column if not exists hora_llegada_real timestamptz;
alter table public.mayorista_pedidos add column if not exists hora_entrega_real timestamptz;
create index if not exists idx_pedidos_estado_entrega on public.mayorista_pedidos(estado_entrega);

-- ── Pista CENTRAL (solo SuperAdmin la mueve; admin solo visualiza) ───
create or replace function public.transicion_valida(p_actual text, p_nuevo text)
returns boolean language sql immutable as $$
  select (p_actual, p_nuevo) in (
    ('confirmado','pagado'),('pagado','en_preparacion'),
    ('en_preparacion','listo_para_despacho'),('listo_para_despacho','asignado'),
    ('confirmado','cancelado'),('pagado','cancelado'),
    ('en_preparacion','cancelado'),('listo_para_despacho','cancelado'),('asignado','cancelado'));
$$;

create or replace function public.avanzar_estado_pedido(
  p_pedido_id uuid, p_nuevo_estado text, p_lat numeric default null, p_lng numeric default null
) returns void language plpgsql security definer as $$
declare v_actual text;
begin
  if not public.is_super_admin() then raise exception 'Solo la Central (SuperAdmin) cambia el estado administrativo'; end if;
  select estado into v_actual from public.mayorista_pedidos where id = p_pedido_id;
  if v_actual is null then raise exception 'El pedido no existe'; end if;
  if not public.transicion_valida(v_actual, p_nuevo_estado) then
    raise exception 'Transición no permitida: % → %', v_actual, p_nuevo_estado; end if;
  update public.mayorista_pedidos set estado = p_nuevo_estado, estado_updated_at = now() where id = p_pedido_id;
  insert into public.pedido_estado_historial (pedido_id, estado_anterior, estado_nuevo, changed_by, origen, lat, lng)
  values (p_pedido_id, v_actual, p_nuevo_estado, auth.uid(), 'central', p_lat, p_lng);
end; $$;

-- ── Pista CHOFER (estado_entrega) ────────────────────────────────────
-- Verifica que el pedido pertenezca al chofer que llama
create or replace function public._pedido_es_mio(p_pedido_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.mayorista_pedidos p
                 where p.id = p_pedido_id and p.chofer_id = public.get_my_driver_id());
$$;

create or replace function public._log_entrega(p_pedido_id uuid, p_estado text, p_lat numeric, p_lng numeric)
returns void language plpgsql security definer as $$
begin
  insert into public.pedido_estado_historial (pedido_id, estado_anterior, estado_nuevo, changed_by, origen, lat, lng)
  values (p_pedido_id, null, p_estado, auth.uid(), 'portal_chofer', p_lat, p_lng);
end; $$;

-- Llegué al cliente
create or replace function public.registrar_llegada(p_pedido_id uuid, p_lat numeric default null, p_lng numeric default null)
returns void language plpgsql security definer as $$
begin
  if not public._pedido_es_mio(p_pedido_id) then raise exception 'Pedido no asignado a este chofer'; end if;
  update public.mayorista_pedidos set estado_entrega = 'llego_cliente', hora_llegada_real = now(), estado_updated_at = now()
   where id = p_pedido_id;
  perform public._log_entrega(p_pedido_id, 'llego_cliente', p_lat, p_lng);
end; $$;

-- Entregado (foto y receptor OBLIGATORIOS)
create or replace function public.registrar_entrega(
  p_pedido_id uuid, p_receptor text, p_foto_url text,
  p_obs text default null, p_lat numeric default null, p_lng numeric default null
) returns void language plpgsql security definer as $$
begin
  if not public._pedido_es_mio(p_pedido_id) then raise exception 'Pedido no asignado a este chofer'; end if;
  if p_foto_url is null or length(trim(p_foto_url))=0 then raise exception 'La foto de respaldo es obligatoria'; end if;
  if p_receptor is null or length(trim(p_receptor))=0 then raise exception 'Registra quién recibe'; end if;
  insert into public.entregas (pedido_id, driver_id, receptor_nombre, observaciones, foto_url, lat, lng)
  values (p_pedido_id, public.get_my_driver_id(), p_receptor, p_obs, p_foto_url, p_lat, p_lng);
  update public.mayorista_pedidos
     set estado_entrega = 'entregado', hora_entrega_real = now(), estado = 'entregado', estado_updated_at = now()
   where id = p_pedido_id;
  perform public._log_entrega(p_pedido_id, 'entregado', p_lat, p_lng);
end; $$;

-- No entregado (registra motivo como incidencia)
create or replace function public.marcar_no_entregado(
  p_pedido_id uuid, p_motivo text, p_lat numeric default null, p_lng numeric default null
) returns void language plpgsql security definer as $$
begin
  if not public._pedido_es_mio(p_pedido_id) then raise exception 'Pedido no asignado a este chofer'; end if;
  update public.mayorista_pedidos set estado_entrega = 'no_entregado', estado_updated_at = now() where id = p_pedido_id;
  insert into public.incidencias (pedido_id, driver_id, tipo, comentario, lat, lng)
  values (p_pedido_id, public.get_my_driver_id(), 'no_entregado', p_motivo, p_lat, p_lng);
  perform public._log_entrega(p_pedido_id, 'no_entregado', p_lat, p_lng);
end; $$;

-- Reportar incidencia (marca el pedido con estado_entrega = incidencia)
create or replace function public.reportar_incidencia(
  p_pedido_id uuid, p_tipo public.incidencia_tipo, p_comentario text default null,
  p_foto_url text default null, p_lat numeric default null, p_lng numeric default null
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  insert into public.incidencias (pedido_id, driver_id, tipo, comentario, foto_url, lat, lng)
  values (p_pedido_id, public.get_my_driver_id(), p_tipo, p_comentario, p_foto_url, p_lat, p_lng)
  returning id into v_id;
  if p_pedido_id is not null and public._pedido_es_mio(p_pedido_id) then
    update public.mayorista_pedidos set estado_entrega = 'incidencia', estado_updated_at = now() where id = p_pedido_id;
  end if;
  return v_id;
end; $$;

-- Iniciar ruta: pone en_ruta los pedidos asignados y pendientes
create or replace function public.iniciar_ruta()
returns uuid language plpgsql security definer as $$
declare v_driver uuid; v_shift uuid; v_route uuid;
begin
  v_driver := public.get_my_driver_id();
  if v_driver is null then raise exception 'Usuario sin chofer asociado'; end if;
  select id into v_shift from public.driver_shifts where driver_id=v_driver and fecha=current_date limit 1;
  if v_shift is null then
    insert into public.driver_shifts(driver_id, estado, hora_ingreso) values (v_driver,'en_ruta',now()) returning id into v_shift;
  else update public.driver_shifts set estado='en_ruta', hora_ingreso=coalesce(hora_ingreso,now()) where id=v_shift; end if;
  insert into public.routes(driver_id, shift_id, estado, hora_inicio) values (v_driver,v_shift,'en_ruta',now()) returning id into v_route;
  update public.mayorista_pedidos set estado_entrega='en_ruta', route_id=v_route, estado_updated_at=now()
   where chofer_id=v_driver and estado_entrega in ('pendiente','cargado');
  return v_route;
end; $$;

-- Finalizar ruta: BLOQUEA si quedan pedidos sin cerrar (salvo SuperAdmin)
create or replace function public.finalizar_ruta(p_route_id uuid)
returns void language plpgsql security definer as $$
declare v_driver uuid; v_shift uuid; v_pend int;
begin
  v_driver := public.get_my_driver_id();
  select shift_id into v_shift from public.routes where id=p_route_id and (driver_id=v_driver or public.is_super_admin());
  if not found then raise exception 'Ruta no encontrada o no autorizada'; end if;

  select count(*) into v_pend from public.mayorista_pedidos
   where route_id=p_route_id and estado_entrega in ('pendiente','cargado','en_ruta','llego_cliente');
  if v_pend > 0 and not public.is_super_admin() then
    raise exception 'No puedes finalizar: quedan % entrega(s) sin cerrar. Márcalas como entregadas, no entregadas o reporta una incidencia.', v_pend;
  end if;

  update public.routes set estado='finalizada', hora_fin=now(), tiempo_total=now()-hora_inicio where id=p_route_id;
  update public.driver_shifts set estado='finalizado', hora_salida=now(), tiempo_trabajado=now()-hora_ingreso where id=v_shift;
end; $$;

-- ── Cumplimiento (% entregas puntuales del día) ─────────────────────
create or replace function public.calcular_cumplimiento(p_driver uuid, p_fecha date default current_date)
returns int language sql security definer stable as $$
  with e as (
    select case when hora_entrega_real is not null and hora_programada is not null
                 and hora_entrega_real <= hora_programada + interval '15 minutes'
                then 1 else 0 end as puntual,
           1 as total
    from public.mayorista_pedidos
    where chofer_id = p_driver and estado_entrega = 'entregado'
      and hora_entrega_real::date = p_fecha)
  select coalesce(round(100.0 * sum(puntual) / nullif(sum(total),0)), 100)::int from e;
$$;

grant execute on function public.avanzar_estado_pedido(uuid,text,numeric,numeric) to authenticated;
grant execute on function public.registrar_llegada(uuid,numeric,numeric) to authenticated;
grant execute on function public.registrar_entrega(uuid,text,text,text,numeric,numeric) to authenticated;
grant execute on function public.marcar_no_entregado(uuid,text,numeric,numeric) to authenticated;
grant execute on function public.reportar_incidencia(uuid,public.incidencia_tipo,text,text,numeric,numeric) to authenticated;
grant execute on function public.iniciar_ruta() to authenticated;
grant execute on function public.finalizar_ruta(uuid) to authenticated;
grant execute on function public.calcular_cumplimiento(uuid,date) to authenticated;

-- ── LIMPIEZA: datos de prueba profesionales (fuera "Empresa Test") ──
do $$
declare v_driver uuid;
begin
  -- Borra pedidos de diagnóstico (primero sus dependencias, por las llaves foráneas)
  delete from public.entregas where pedido_id in (select id from public.mayorista_pedidos where direccion_entrega ilike 'DIAGNOSTICO%' or direccion_entrega in ('axaxa','aaaaasssss','aaaaassssss'));
  delete from public.incidencias where pedido_id in (select id from public.mayorista_pedidos where direccion_entrega ilike 'DIAGNOSTICO%' or direccion_entrega in ('axaxa','aaaaasssss','aaaaassssss'));
  delete from public.pedido_estado_historial where pedido_id in (select id from public.mayorista_pedidos where direccion_entrega ilike 'DIAGNOSTICO%' or direccion_entrega in ('axaxa','aaaaasssss','aaaaassssss'));
  delete from public.mayorista_pedido_items where pedido_id in (select id from public.mayorista_pedidos where direccion_entrega ilike 'DIAGNOSTICO%' or direccion_entrega in ('axaxa','aaaaasssss','aaaaassssss'));
  delete from public.mayorista_pedidos where direccion_entrega ilike 'DIAGNOSTICO%' or direccion_entrega in ('axaxa','aaaaasssss','aaaaassssss');

  -- Renombra el mayorista de prueba a algo presentable
  update public.mayoristas set nombre='Juan Pérez', empresa='Distribuidora Verde Ltda'
   where empresa ilike '%Test%' or nombre ilike '%Test%';

  select id into v_driver from public.drivers limit 1;

  -- Da direcciones, bultos y horarios reales a los pedidos del chofer
  update public.mayorista_pedidos set
      direccion_entrega = 'Av. Providencia 1234, Providencia, Santiago',
      telefono_entrega  = coalesce(telefono_entrega,'+56 9 8765 4321'),
      bultos            = coalesce(bultos, 4),
      hora_programada   = coalesce(hora_programada, current_date + time '10:15'),
      estado            = 'asignado',
      estado_entrega    = 'pendiente'
   where chofer_id = v_driver and estado_entrega <> 'entregado';

  raise notice 'Fase 2A lista. Pedidos operativos del chofer: %',
    (select count(*) from public.mayorista_pedidos where chofer_id = v_driver);
end $$;

-- FIN FASE 2A. "Success. No rows returned" + aviso de pedidos operativos.
