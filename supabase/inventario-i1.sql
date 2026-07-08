-- ════════════════════════════════════════════════════════════════════
--  INVENTARIO POR LOTES · I1 (base) — NOMMA FOOD
--  Aditivo. products (Maestro) sigue siendo la fuente; inventario solo
--  maneja stock/lotes/ubicaciones/movimientos. Índices para rendimiento.
-- ════════════════════════════════════════════════════════════════════

-- ── bodegas / cámaras / ubicaciones ─────────────────────────────────
create table if not exists public.bodegas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  tipo       text not null default 'bodega',
  condicion_almacenamiento text,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_bodega_tipo') then
    alter table public.bodegas add constraint chk_bodega_tipo check (tipo in ('bodega','camara'));
  end if;
end $$;

-- ── inventario_lotes (saldos precalculados por lote) ────────────────
create table if not exists public.inventario_lotes (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id),
  lote_codigo       text,
  es_externo        boolean default false,
  fecha_elaboracion date,
  fecha_vencimiento date,
  bodega_id         uuid references public.bodegas(id),
  stock_inicial     numeric not null default 0,
  stock_disponible  numeric not null default 0,
  stock_reservado   numeric not null default 0,
  stock_retenido    numeric not null default 0,
  stock_bloqueado   numeric not null default 0,
  stock_vencido     numeric not null default 0,
  unidad            text,
  estado            text not null default 'disponible',
  motivo            text,
  documento_url     text,
  usuario_id        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_lote_estado') then
    alter table public.inventario_lotes add constraint chk_lote_estado
      check (estado in ('disponible','retenido','bloqueado','vencido','agotado'));
  end if;
end $$;
create index if not exists idx_inv_lote_product on public.inventario_lotes(product_id);
create index if not exists idx_inv_lote_bodega  on public.inventario_lotes(bodega_id);
create index if not exists idx_inv_lote_estado  on public.inventario_lotes(estado);
create index if not exists idx_inv_lote_venc    on public.inventario_lotes(fecha_vencimiento);

-- ── inventario_movimientos (fuente oficial del stock) ───────────────
create table if not exists public.inventario_movimientos (
  id                  uuid primary key default gen_random_uuid(),
  lote_id             uuid references public.inventario_lotes(id),
  product_id          uuid references public.products(id),
  tipo_movimiento     text not null,
  cantidad            numeric not null,
  unidad              text,
  motivo              text not null,
  bodega_origen_id    uuid references public.bodegas(id),
  bodega_destino_id   uuid references public.bodegas(id),
  pedido_id           uuid,
  compra_id           uuid,
  orden_produccion_id uuid,
  usuario_id          uuid,
  usuario_email       text,
  observacion         text,
  documento_url       text,
  created_at          timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_tipo_movimiento') then
    alter table public.inventario_movimientos add constraint chk_tipo_movimiento
      check (tipo_movimiento in ('entrada_compra','entrada_produccion','salida_consumo','salida_venta','reserva','liberacion_reserva','merma','ajuste_positivo','ajuste_negativo','traspaso','retencion','liberacion_calidad','bloqueo','desbloqueo'));
  end if;
end $$;
create index if not exists idx_inv_mov_lote on public.inventario_movimientos(lote_id, created_at desc);
create index if not exists idx_inv_mov_prod on public.inventario_movimientos(product_id, created_at desc);
create index if not exists idx_inv_mov_tipo on public.inventario_movimientos(tipo_movimiento);

-- ── Regla de visibilidad del Maestro: solo vendibles se publican ────
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_visible_solo_vendibles') then
    alter table public.products add constraint chk_visible_solo_vendibles
      check (visible_catalogo = false or tipo_producto in ('terminado_fabricado','reventa','kit'));
  end if;
end $$;

-- ── RLS: solo roles internos (operarios leerán después) ─────────────
alter table public.bodegas                enable row level security;
alter table public.inventario_lotes       enable row level security;
alter table public.inventario_movimientos enable row level security;
do $$
declare t text;
begin
  foreach t in array array['bodegas','inventario_lotes','inventario_movimientos']
  loop
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format('create policy %I_admin on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- ── Semilla mínima de bodegas (puedes editarlas) ────────────────────
insert into public.bodegas (nombre, tipo, condicion_almacenamiento) values
  ('Bodega seca 1', 'bodega', 'ambiente'),
  ('Cámara refrigerada 1', 'camara', 'refrigerado'),
  ('Cámara congelado 1', 'camara', 'congelado')
on conflict do nothing;
