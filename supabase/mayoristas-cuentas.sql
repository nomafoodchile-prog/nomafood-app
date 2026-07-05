-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — Cuentas de cliente mayorista (Supabase Auth)
--  Rol 'Mayorista', vínculo profile↔mayorista y helper. Idempotente.
--  La creación de la cuenta se hace por API server-side (service role).
-- ════════════════════════════════════════════════════════════════════

alter type app_role add value if not exists 'Mayorista';

alter table public.mayoristas add column if not exists profile_id uuid references public.profiles(id);
create index if not exists idx_mayoristas_profile on public.mayoristas(profile_id);

-- id del mayorista del usuario logueado (para el portal con cuenta)
create or replace function public.get_my_mayorista_id()
returns uuid language sql security definer stable as $$
  select id from public.mayoristas where profile_id = auth.uid()
$$;
grant execute on function public.get_my_mayorista_id() to authenticated;

-- El cliente ve su propia ficha (los admins ya tienen acceso)
drop policy if exists may_self on public.mayoristas;
create policy may_self on public.mayoristas for select using (profile_id = auth.uid() or public.is_admin());

-- ════════════════════════════════════════════════════════════════════
--  FIN. Resultado esperado: "Success. No rows returned".
-- ════════════════════════════════════════════════════════════════════
