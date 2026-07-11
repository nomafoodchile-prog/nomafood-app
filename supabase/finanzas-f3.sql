-- ════════════════════════════════════════════════════════════════════
--  FINANZAS · F3 — Cartolas del banco + conciliación con la Caja
--  Aditivo. Usa los helpers fin_puede_ver / fin_puede_editar (F1).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.fin_cartolas (
  id            uuid primary key default gen_random_uuid(),
  banco         text,
  archivo_url   text,
  periodo       text,
  total_lineas  int default 0,
  created_by    uuid,
  created_email text,
  created_at    timestamptz not null default now()
);

create table if not exists public.fin_cartola_movimientos (
  id                  uuid primary key default gen_random_uuid(),
  cartola_id          uuid not null references public.fin_cartolas(id) on delete cascade,
  fecha               date,
  descripcion         text,
  monto               numeric not null default 0,
  tipo                text not null default 'cargo',
  conciliado          boolean not null default false,
  movimiento_id       uuid references public.fin_movimientos(id) on delete set null,
  motivo_conciliacion text,
  created_at          timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_fcm_tipo') then
    alter table public.fin_cartola_movimientos add constraint chk_fcm_tipo check (tipo in ('cargo','abono'));
  end if;
end $$;
create index if not exists idx_fcm_cartola on public.fin_cartola_movimientos(cartola_id);

alter table public.fin_cartolas             enable row level security;
alter table public.fin_cartola_movimientos  enable row level security;

drop policy if exists fcart_sel on public.fin_cartolas;
create policy fcart_sel on public.fin_cartolas for select using (public.fin_puede_ver());
drop policy if exists fcart_all on public.fin_cartolas;
create policy fcart_all on public.fin_cartolas for all using (public.fin_puede_editar()) with check (public.fin_puede_editar());

drop policy if exists fcm_sel on public.fin_cartola_movimientos;
create policy fcm_sel on public.fin_cartola_movimientos for select using (public.fin_puede_ver());
drop policy if exists fcm_all on public.fin_cartola_movimientos;
create policy fcm_all on public.fin_cartola_movimientos for all using (public.fin_puede_editar()) with check (public.fin_puede_editar());
