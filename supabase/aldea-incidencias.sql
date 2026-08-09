-- ============================================================================
-- ALDEA VEGETAL · Sub-fase D — Incidencias (auto por diferencia de recepción)
-- Tabla propia de Aldea. Aditivo.
-- ============================================================================
create table if not exists public.aldea_incidencias (
  id              uuid primary key default gen_random_uuid(),
  mayorista_id    uuid references public.mayoristas(id) on delete cascade,   -- la sucursal
  organizacion_id uuid references public.organizaciones(id),
  solicitud_id    uuid references public.aldea_solicitudes(id) on delete set null,
  tipo            text not null default 'diferencia_recepcion',
  -- tipo: diferencia_recepcion | producto_danado | producto_incorrecto | cantidad | calidad
  --       | temperatura | atraso | chofer | falta_stock | error_sistema | consulta | otro
  descripcion     text,
  estado          text not null default 'nueva',   -- nueva | en_revision | en_solucion | resuelta | cerrada
  respuesta_central text,
  foto_url        text,
  creada_por      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_aldea_inc_suc on public.aldea_incidencias(mayorista_id);
alter table public.aldea_incidencias enable row level security;
