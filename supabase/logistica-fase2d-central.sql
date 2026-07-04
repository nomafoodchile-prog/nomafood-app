-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — LOGÍSTICA · FASE 2D · GESTIÓN DE INCIDENCIAS DESDE CENTRAL
--  La Central (is_admin) responde / marca en revisión / cierra incidencias
--  y reasigna pedidos con entrega fallida a otro chofer.
--  Requiere Fase 0/1/2A. Idempotente. Correr en Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════

-- ── Respuesta de la Central en la incidencia ─────────────────────────
alter table public.incidencias add column if not exists respuesta_central text;
alter table public.incidencias add column if not exists respondido_by uuid references public.profiles(id);

-- ── Resolver / avanzar una incidencia (abierta → en_revision → resuelta)
create or replace function public.resolver_incidencia(
  p_incidencia_id uuid, p_estado text, p_respuesta text default null
) returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then raise exception 'Solo la Central puede gestionar incidencias'; end if;
  if p_estado not in ('en_revision','resuelta') then raise exception 'Estado inválido: %', p_estado; end if;
  update public.incidencias
     set estado_resolucion = p_estado,
         respuesta_central  = coalesce(nullif(trim(p_respuesta), ''), respuesta_central),
         respondido_by      = case when nullif(trim(p_respuesta), '') is not null then auth.uid() else respondido_by end,
         resolved_by        = case when p_estado = 'resuelta' then auth.uid() else resolved_by end,
         resolved_at        = case when p_estado = 'resuelta' then now() else resolved_at end
   where id = p_incidencia_id;
  if not found then raise exception 'Incidencia no encontrada'; end if;
end; $$;

-- ── Reasignar un pedido a otro chofer (p. ej. tras entrega fallida) ──
create or replace function public.reasignar_pedido(
  p_pedido_id uuid, p_chofer_id uuid
) returns void language plpgsql security definer as $$
declare v_actual text;
begin
  if not public.is_admin() then raise exception 'Solo la Central puede reasignar pedidos'; end if;
  if not exists (select 1 from public.drivers where id = p_chofer_id and activo) then
    raise exception 'Chofer no válido o inactivo'; end if;
  select estado_entrega::text into v_actual from public.mayorista_pedidos where id = p_pedido_id;
  if v_actual is null then raise exception 'El pedido no existe'; end if;
  update public.mayorista_pedidos
     set chofer_id = p_chofer_id, estado_entrega = 'pendiente', route_id = null,
         hora_llegada_real = null, hora_entrega_real = null, estado_updated_at = now()
   where id = p_pedido_id;
  insert into public.pedido_estado_historial (pedido_id, estado_anterior, estado_nuevo, changed_by, origen)
  values (p_pedido_id, v_actual, 'reasignado', auth.uid(), 'central');
end; $$;

grant execute on function public.resolver_incidencia(uuid, text, text) to authenticated;
grant execute on function public.reasignar_pedido(uuid, uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════
--  FIN FASE 2D. Resultado esperado: "Success. No rows returned".
-- ════════════════════════════════════════════════════════════════════
