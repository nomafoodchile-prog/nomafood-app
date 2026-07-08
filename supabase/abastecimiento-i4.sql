-- ════════════════════════════════════════════════════════════════════
--  ABASTECIMIENTO · I4 — Solicitudes de compra + Recepción de mercadería
--  Aditivo. Base para el Planificador de Requerimientos (futuro).
--  Nada se compra automático: se sugiere y la Central aprueba.
-- ════════════════════════════════════════════════════════════════════

-- ── Solicitudes de compra sugeridas (agrupadas por proveedor) ───────
create table if not exists public.solicitudes_compra (
  id            uuid primary key default gen_random_uuid(),
  numero        text,
  proveedor_id  uuid references public.proveedores(id),
  estado        text not null default 'sugerida',
  prioridad     text not null default 'media',
  motivo        text,
  usuario_id    uuid,
  usuario_email text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_sc_estado') then
    alter table public.solicitudes_compra add constraint chk_sc_estado
      check (estado in ('sugerida','en_revision','aprobada','comprada','recibida','cancelada'));
  end if;
end $$;
create index if not exists idx_sc_estado on public.solicitudes_compra(estado, created_at desc);
create index if not exists idx_sc_prov on public.solicitudes_compra(proveedor_id);

create table if not exists public.solicitud_compra_items (
  id                uuid primary key default gen_random_uuid(),
  solicitud_id      uuid not null references public.solicitudes_compra(id) on delete cascade,
  product_id        uuid references public.products(id),
  stock_actual      numeric,
  stock_min         numeric,
  punto_reposicion  numeric,
  cantidad_sugerida numeric,
  unidad_compra     text
);
create index if not exists idx_sci_sol on public.solicitud_compra_items(solicitud_id);

-- ── Recepción de mercadería ─────────────────────────────────────────
create table if not exists public.recepciones (
  id            uuid primary key default gen_random_uuid(),
  numero        text,
  proveedor_id  uuid references public.proveedores(id),
  solicitud_id  uuid references public.solicitudes_compra(id),
  bodega_id     uuid references public.bodegas(id),
  documento_url text,
  observaciones text,
  usuario_id    uuid,
  usuario_email text,
  created_at    timestamptz not null default now()
);
create table if not exists public.recepcion_items (
  id                uuid primary key default gen_random_uuid(),
  recepcion_id      uuid not null references public.recepciones(id) on delete cascade,
  product_id        uuid references public.products(id),
  cantidad_pedida   numeric,
  cantidad_recibida numeric,
  lote_codigo       text,
  fecha_vencimiento date,
  estado_calidad    text default 'disponible',
  unidad            text
);
create index if not exists idx_recep_items_rec on public.recepcion_items(recepcion_id);

-- ── RLS: solo roles internos ────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['solicitudes_compra','solicitud_compra_items','recepciones','recepcion_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format('create policy %I_admin on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;
