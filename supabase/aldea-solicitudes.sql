-- ============================================================================
-- ALDEA VEGETAL · Sub-fase C — Solicitudes de reposición + trazabilidad
-- Tablas propias de Aldea (aisladas). NO toca mayorista_pedidos.
-- ============================================================================

create table if not exists public.aldea_solicitudes (
  id              uuid primary key default gen_random_uuid(),
  folio           text not null,
  mayorista_id    uuid not null references public.mayoristas(id) on delete cascade,   -- la sucursal
  organizacion_id uuid references public.organizaciones(id),
  creada_por      uuid references public.profiles(id),
  estado          text not null default 'solicitud_enviada',
  -- estados: solicitud_enviada | en_revision | aprobada | en_preparacion | en_picking
  --          | listo_despacho | en_ruta | entregada | entregada_diferencias | cancelada
  prioridad       text not null default 'normal',   -- baja | normal | alta
  fecha_requerida date,
  observaciones   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_aldea_sol_suc on public.aldea_solicitudes(mayorista_id);
alter table public.aldea_solicitudes enable row level security;

create table if not exists public.aldea_solicitud_items (
  id                   uuid primary key default gen_random_uuid(),
  solicitud_id         uuid not null references public.aldea_solicitudes(id) on delete cascade,
  product_id           uuid not null,
  producto_nombre      text,
  unidad               text default 'un',
  cantidad_solicitada  numeric not null default 0,
  cantidad_aprobada    numeric,   -- lo llena la Central
  cantidad_preparada   numeric,   -- lo llena producción / picking
  cantidad_despachada  numeric,   -- lo llena despacho
  cantidad_recibida    numeric    -- lo llena el local en la recepción
);
create index if not exists idx_aldea_sol_items on public.aldea_solicitud_items(solicitud_id);
alter table public.aldea_solicitud_items enable row level security;
