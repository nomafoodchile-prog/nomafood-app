-- ════════════════════════════════════════════════════════════════════
--  RLS · minorista_pedidos — lectura/gestión para ADMIN (staff)
--  ------------------------------------------------------------------
--  Problema: el badge/alerta del menú lee minorista_pedidos desde el
--  cliente (navegador), pero la tabla no tenía política que permita al
--  admin leerla por RLS (sí la tiene mayorista_pedidos → por eso el
--  badge de mayorista funciona y el de minorista salía 0). Las páginas
--  la muestran igual porque usan API server-side (service role, ignora RLS).
--
--  Fix: política gemela a `pedidos_admin_all` de mayorista_pedidos,
--  usando el helper existente public.is_admin(). Habilita además el
--  realtime (postgres_changes respeta RLS) para el "ping" instantáneo.
--
--  Idempotente. Resultado esperado: "Success. No rows returned".
--  No afecta a las APIs (service role ignora RLS). La REVERSA está al pie.
-- ════════════════════════════════════════════════════════════════════

alter table public.minorista_pedidos enable row level security;

drop policy if exists minorista_pedidos_admin_all on public.minorista_pedidos;
create policy minorista_pedidos_admin_all on public.minorista_pedidos
  for all using (public.is_admin()) with check (public.is_admin());

-- (Opcional) Realtime instantáneo: que la tabla emita cambios en vivo.
-- Si ya está en la publicación, este bloque no hace nada.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'minorista_pedidos'
  ) then
    alter publication supabase_realtime add table public.minorista_pedidos;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  REVERSA (ejecutar SOLO si algo se rompe):
--    drop policy if exists minorista_pedidos_admin_all on public.minorista_pedidos;
--    alter publication supabase_realtime drop table public.minorista_pedidos;
-- ════════════════════════════════════════════════════════════════════
