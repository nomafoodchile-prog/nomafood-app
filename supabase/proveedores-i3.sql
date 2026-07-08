-- ════════════════════════════════════════════════════════════════════
--  PROVEEDORES · I3 — Proveedores por producto (abastecimiento)
--  Aditivo. products (Maestro) sigue siendo la fuente; esto agrega la
--  relación producto↔proveedor con datos de compra. Base para I4.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.proveedores (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  rut          text,
  contacto     text,
  telefono     text,
  email        text,
  direccion    text,
  observaciones text,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_proveedores_nombre on public.proveedores(nombre);

create table if not exists public.proveedor_productos (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references public.products(id) on delete cascade,
  proveedor_id       uuid not null references public.proveedores(id) on delete cascade,
  es_principal       boolean not null default false,
  codigo_proveedor   text,
  unidad_compra      text,
  cantidad_minima    numeric,
  precio_referencial numeric,
  ultimo_precio      numeric,
  plazo_entrega_dias integer,
  observaciones      text,
  created_at         timestamptz not null default now(),
  unique (product_id, proveedor_id)
);
create index if not exists idx_prov_prod_product on public.proveedor_productos(product_id);
-- Solo UN proveedor principal por producto
create unique index if not exists uq_prov_prod_principal on public.proveedor_productos(product_id) where es_principal;

alter table public.proveedores        enable row level security;
alter table public.proveedor_productos enable row level security;
drop policy if exists proveedores_admin on public.proveedores;
create policy proveedores_admin on public.proveedores for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists prov_prod_admin on public.proveedor_productos;
create policy prov_prod_admin on public.proveedor_productos for all using (public.is_admin()) with check (public.is_admin());
