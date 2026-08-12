-- ============================================================================
-- ALDEA VEGETAL · Reserva Aldea — stock protegido por SKU (nivel organización)
-- Interno de NOMMA. El cliente solo verá "Disponible". Aditivo.
-- ============================================================================
create table if not exists public.aldea_reserva (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid references public.organizaciones(id) on delete cascade,
  product_id      uuid not null,
  objetivo        numeric not null default 0,   -- meta de reserva
  minimo          numeric not null default 0,
  critico         numeric not null default 0,
  fisico          numeric not null default 0,   -- stock físico reservado para Aldea
  comprometido    numeric not null default 0,   -- comprometido por pedidos confirmados
  activo          boolean not null default true,
  updated_at      timestamptz not null default now(),
  unique (organizacion_id, product_id)
);
create index if not exists idx_aldea_reserva_org on public.aldea_reserva(organizacion_id);
alter table public.aldea_reserva enable row level security;
-- Reglas (calculadas en la app, no en columnas):
--   disponible  = max(0, fisico - comprometido)
--   reposicion  = max(0, objetivo - fisico)
--   estado: disponible<=critico → crítico · disponible<=minimo → reponer · si no → normal
