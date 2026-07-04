-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — FASE 2D · Firma del cliente en la entrega
--  Guarda la firma en entregas.firma_url y habilita entregas en Realtime
--  para que la Central vea los comprobantes al instante. Idempotente.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.guardar_firma_entrega(p_pedido_id uuid, p_firma_url text)
returns void language plpgsql security definer as $$
begin
  if not public._pedido_es_mio(p_pedido_id) then raise exception 'Pedido no asignado a este chofer'; end if;
  update public.entregas
     set firma_url = p_firma_url
   where id = (select id from public.entregas where pedido_id = p_pedido_id order by entregado_at desc limit 1);
end; $$;

grant execute on function public.guardar_firma_entrega(uuid, text) to authenticated;

do $$ begin
  begin execute 'alter publication supabase_realtime add table public.entregas';
  exception when duplicate_object then null; end;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  FIN. Resultado esperado: "Success. No rows returned".
-- ════════════════════════════════════════════════════════════════════
