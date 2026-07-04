-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — FASE 2D+ · Mensajes central→chofer con acuse
--  y Compras con precio/foto/checklist por ítem (visible en la Central).
--  Requiere Fase 0/1/2A/2D. Idempotente. Correr en Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════

-- ── MENSAJES: acuse de recibo del chofer ─────────────────────────────
alter table public.driver_messages add column if not exists recibido_at timestamptz;

-- La Central (is_admin) envía un mensaje a un chofer
create or replace function public.enviar_mensaje_chofer(
  p_driver_id uuid, p_texto text, p_tipo text default 'alerta', p_contexto jsonb default null
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Solo la Central puede enviar mensajes'; end if;
  if p_texto is null or length(trim(p_texto)) = 0 then raise exception 'El mensaje no puede ir vacío'; end if;
  if p_tipo not in ('sistema','alerta','motivacional','chat') then p_tipo := 'alerta'; end if;
  insert into public.driver_messages (driver_id, tipo, texto, contexto)
  values (p_driver_id, p_tipo, p_texto, p_contexto) returning id into v_id;
  return v_id;
end; $$;

-- El chofer marca un mensaje como recibido
create or replace function public.marcar_mensaje_recibido(p_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.driver_messages
     set leido = true, recibido_at = coalesce(recibido_at, now())
   where id = p_id and driver_id = public.get_my_driver_id();
end; $$;

-- ── COMPRAS: precio, foto y checklist por ítem ───────────────────────
alter table public.compra_items add column if not exists precio_unitario numeric(12,2);
alter table public.compra_items add column if not exists comprado boolean not null default false;
alter table public.compra_items add column if not exists foto_url text;
alter table public.compra_items add column if not exists nota text;
alter table public.compra_items add column if not exists comprado_at timestamptz;

create or replace function public._compra_es_mia(p_compra_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.compras c
                 where c.id = p_compra_id
                   and (c.driver_id = public.get_my_driver_id() or public.is_admin()));
$$;

-- Guardar avance de un ítem (precio / comprado / foto / nota)
create or replace function public.guardar_item_compra(
  p_item_id uuid, p_precio numeric default null, p_comprado boolean default null,
  p_foto_url text default null, p_nota text default null
) returns void language plpgsql security definer as $$
declare v_compra uuid;
begin
  select compra_id into v_compra from public.compra_items where id = p_item_id;
  if v_compra is null then raise exception 'El ítem no existe'; end if;
  if not public._compra_es_mia(v_compra) then raise exception 'Compra no asignada a este chofer'; end if;
  update public.compra_items
     set precio_unitario = coalesce(p_precio, precio_unitario),
         foto_url        = coalesce(p_foto_url, foto_url),
         nota            = coalesce(p_nota, nota),
         comprado        = coalesce(p_comprado, comprado),
         comprado_at     = case when p_comprado is true then now()
                                when p_comprado is false then null
                                else comprado_at end
   where id = p_item_id;
  update public.compras set estado = 'en_compra', updated_at = now()
   where id = v_compra and estado = 'asignada';
end; $$;

-- Agregar un ítem sobre la marcha (producto no listado)
create or replace function public.agregar_item_compra(
  p_compra_id uuid, p_producto text, p_cantidad numeric default null, p_unidad text default null
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  if not public._compra_es_mia(p_compra_id) then raise exception 'Compra no asignada a este chofer'; end if;
  if p_producto is null or length(trim(p_producto)) = 0 then raise exception 'Nombra el producto'; end if;
  insert into public.compra_items (compra_id, producto, cantidad, unidad)
  values (p_compra_id, p_producto, p_cantidad, p_unidad) returning id into v_id;
  return v_id;
end; $$;

grant execute on function public.enviar_mensaje_chofer(uuid, text, text, jsonb) to authenticated;
grant execute on function public.marcar_mensaje_recibido(uuid) to authenticated;
grant execute on function public.guardar_item_compra(uuid, numeric, boolean, text, text) to authenticated;
grant execute on function public.agregar_item_compra(uuid, text, numeric, text) to authenticated;

-- ── REALTIME: la Central ve el checklist de compras en vivo ──────────
do $$ begin
  begin execute 'alter publication supabase_realtime add table public.compra_items';
  exception when duplicate_object then null; end;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  FIN FASE 2D+. Resultado esperado: "Success. No rows returned".
-- ════════════════════════════════════════════════════════════════════
