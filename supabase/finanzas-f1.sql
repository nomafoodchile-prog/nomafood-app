-- ════════════════════════════════════════════════════════════════════
--  FINANZAS · F1 — Caja (movimientos + cierre diario + arqueo + permisos)
--  Nuevo esquema fin_* (uuid, español, conectado). Legacy queda archivado.
--  Solo Administración/Gerencia editan; Contador ve/exporta; otros no.
-- ════════════════════════════════════════════════════════════════════

alter type app_role add value if not exists 'Contador';

-- Helpers de permiso (security definer → leen profiles sin RLS)
create or replace function public.fin_puede_ver() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.role::text in ('SuperAdmin','Administracion','Gerencia','Contador'));
$$;
create or replace function public.fin_puede_editar() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.role::text in ('SuperAdmin','Administracion','Gerencia'));
$$;

-- ── Cierre diario de caja (con arqueo) ──────────────────────────────
create table if not exists public.fin_cierres_caja (
  id                    uuid primary key default gen_random_uuid(),
  fecha                 date not null unique,
  estado                text not null default 'cerrado',
  total_ingresos        numeric default 0,
  total_egresos         numeric default 0,
  saldo_sistema         numeric default 0,
  arqueo_efectivo       numeric default 0,
  arqueo_transferencias numeric default 0,
  arqueo_mp             numeric default 0,
  arqueo_egresos        numeric default 0,
  diferencia            numeric default 0,
  observaciones         text,
  cerrado_por           uuid,
  cerrado_email         text,
  cerrado_at            timestamptz not null default now(),
  reabierto_por         uuid,
  reabierto_at          timestamptz,
  motivo_reapertura     text,
  created_at            timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_cierre_estado') then
    alter table public.fin_cierres_caja add constraint chk_cierre_estado
      check (estado in ('cerrado','reabierto'));
  end if;
end $$;

-- ── Movimientos de caja ─────────────────────────────────────────────
create table if not exists public.fin_movimientos (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null default (now() at time zone 'America/Santiago')::date,
  tipo            text not null,
  categoria       text,
  descripcion     text,
  monto           numeric not null default 0,
  medio           text,
  origen          text not null default 'manual',
  ref_tipo        text,
  ref_id          uuid,
  estado          text not null default 'pendiente',
  comprobante_url text,
  cierre_id       uuid references public.fin_cierres_caja(id) on delete set null,
  creado_por      uuid,
  creado_email    text,
  created_at      timestamptz not null default now(),
  editado_por     uuid,
  editado_email   text,
  updated_at      timestamptz,
  motivo_edicion  text,
  anulado         boolean not null default false,
  anulado_por     uuid,
  anulado_at      timestamptz,
  motivo_anulacion text
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_fmov_tipo') then
    alter table public.fin_movimientos add constraint chk_fmov_tipo check (tipo in ('ingreso','egreso'));
  end if;
  if not exists (select 1 from pg_constraint where conname='chk_fmov_origen') then
    alter table public.fin_movimientos add constraint chk_fmov_origen check (origen in ('mercado_pago','compra','manual','banco'));
  end if;
  if not exists (select 1 from pg_constraint where conname='chk_fmov_estado') then
    alter table public.fin_movimientos add constraint chk_fmov_estado check (estado in ('pendiente','conciliado','anulado'));
  end if;
end $$;
create index if not exists idx_fmov_fecha on public.fin_movimientos(fecha desc);
-- Idempotencia: un pedido/recepción genera un solo movimiento
create unique index if not exists uq_fmov_ref on public.fin_movimientos(origen, ref_id) where ref_id is not null;

-- ── Storage: comprobantes de egresos ────────────────────────────────
insert into storage.buckets (id, name, public) values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;
drop policy if exists comprob_read on storage.objects;
create policy comprob_read on storage.objects for select using (bucket_id = 'comprobantes' and public.fin_puede_ver());
drop policy if exists comprob_write on storage.objects;
create policy comprob_write on storage.objects for insert to authenticated with check (bucket_id = 'comprobantes' and public.fin_puede_editar());

-- ── RLS: ver = admin/gerencia/contador; editar = admin/gerencia; sin delete ─
alter table public.fin_movimientos  enable row level security;
alter table public.fin_cierres_caja enable row level security;

drop policy if exists fmov_sel on public.fin_movimientos;
create policy fmov_sel on public.fin_movimientos for select using (public.fin_puede_ver());
drop policy if exists fmov_ins on public.fin_movimientos;
create policy fmov_ins on public.fin_movimientos for insert with check (public.fin_puede_editar());
drop policy if exists fmov_upd on public.fin_movimientos;
create policy fmov_upd on public.fin_movimientos for update using (public.fin_puede_editar()) with check (public.fin_puede_editar());

drop policy if exists fcierre_sel on public.fin_cierres_caja;
create policy fcierre_sel on public.fin_cierres_caja for select using (public.fin_puede_ver());
drop policy if exists fcierre_all on public.fin_cierres_caja;
create policy fcierre_all on public.fin_cierres_caja for all using (public.fin_puede_editar()) with check (public.fin_puede_editar());
