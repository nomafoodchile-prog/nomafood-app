-- ============================================================================
-- ALDEA VEGETAL · Sub-fase B — Stock por local + Catálogo autorizado
-- Aditivo. No toca products ni el portal mayorista.
-- ============================================================================

-- Stock por sucursal (read-model). Lo alimenta NOMMA provisionalmente (fuente='nomma')
-- y en el futuro Bsale / Central Aldea (fuente='bsale'). El portal SIEMPRE lee de aquí.
create table if not exists public.aldea_stock (
  id            uuid primary key default gen_random_uuid(),
  mayorista_id  uuid not null references public.mayoristas(id) on delete cascade, -- la sucursal
  product_id    text not null,        -- referencia a products.id
  stock_actual  numeric not null default 0,
  stock_min     numeric not null default 0,
  stock_ideal   numeric not null default 0,
  por_recibir   numeric not null default 0,
  fuente        text not null default 'nomma',  -- 'nomma' | 'bsale'
  updated_at    timestamptz not null default now(),
  unique (mayorista_id, product_id)
);
create index if not exists idx_aldea_stock_suc on public.aldea_stock(mayorista_id);
alter table public.aldea_stock enable row level security;

-- Catálogo autorizado: qué productos/insumos puede ver/pedir cada sucursal
create table if not exists public.aldea_catalogo (
  id            uuid primary key default gen_random_uuid(),
  mayorista_id  uuid not null references public.mayoristas(id) on delete cascade,
  product_id    text not null,
  tipo          text not null default 'producto',  -- 'producto' | 'insumo'
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (mayorista_id, product_id)
);
create index if not exists idx_aldea_catalogo_suc on public.aldea_catalogo(mayorista_id);
alter table public.aldea_catalogo enable row level security;

-- SEED (demo): autoriza a cada sucursal los productos visibles del catálogo
--             y les crea un stock provisional de ejemplo.
insert into public.aldea_catalogo (mayorista_id, product_id, tipo)
select m.id, p.id, 'producto'
from public.mayoristas m
cross join public.products p
where m.empresa = 'Aldea Vegetal' and m.es_sucursal = true
  and coalesce(p.visible_catalogo, true) = true
  and not exists (select 1 from public.aldea_catalogo c where c.mayorista_id = m.id and c.product_id = p.id);

insert into public.aldea_stock (mayorista_id, product_id, stock_actual, stock_min, stock_ideal, fuente)
select c.mayorista_id, c.product_id, 8, 10, 24, 'nomma'
from public.aldea_catalogo c
where not exists (select 1 from public.aldea_stock s where s.mayorista_id = c.mayorista_id and s.product_id = c.product_id);
