-- ════════════════════════════════════════════════════════════════════
--  NOTIFICACIONES · I2 — Alertas + Campanita de la Central
--  Aditivo. Fuente de la campanita, dashboard y centros de control.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.notificaciones (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null,
  prioridad        text not null default 'media',
  area             text,
  titulo           text not null,
  mensaje          text,
  accion_sugerida  text,
  estado           text not null default 'nueva',
  clave            text,            -- dedup (ej. stock:<product_id>)
  ref_tipo         text,
  ref_id           uuid,
  usuario_atiende  text,
  comentario_cierre text,
  suena            boolean not null default false,  -- true para crítica/alta
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_notif_prioridad') then
    alter table public.notificaciones add constraint chk_notif_prioridad check (prioridad in ('critica','alta','media','baja'));
  end if;
  if not exists (select 1 from pg_constraint where conname='chk_notif_estado') then
    alter table public.notificaciones add constraint chk_notif_estado check (estado in ('nueva','vista','en_revision','resuelta'));
  end if;
end $$;
create index if not exists idx_notif_estado on public.notificaciones(estado, created_at desc);
create index if not exists idx_notif_clave  on public.notificaciones(clave);

alter table public.notificaciones enable row level security;
drop policy if exists notif_admin on public.notificaciones;
create policy notif_admin on public.notificaciones for all using (public.is_admin()) with check (public.is_admin());
