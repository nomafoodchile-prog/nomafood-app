-- ============================================================================
-- ALDEA VEGETAL · Facturación — facturas que NOMMA emite a las cafeterías
-- Aditivo, tabla propia de Aldea.
-- ============================================================================
create table if not exists public.aldea_facturas (
  id               uuid primary key default gen_random_uuid(),
  mayorista_id     uuid not null references public.mayoristas(id) on delete cascade,  -- la sucursal
  organizacion_id  uuid references public.organizaciones(id),
  solicitud_id     uuid references public.aldea_solicitudes(id) on delete set null,
  numero           text,
  monto            numeric not null default 0,
  fecha_emision    date,
  fecha_vencimiento date,
  estado           text not null default 'por_pagar',   -- por_pagar | pagada
  pdf_url          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_aldea_fact_suc on public.aldea_facturas(mayorista_id);
alter table public.aldea_facturas enable row level security;
