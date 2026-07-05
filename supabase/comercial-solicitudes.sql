-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — Comercial · Solicitudes de acceso mayorista + Landing
--  Tabla de solicitudes (con estados e historial), config de la landing y
--  productos destacados. Idempotente. Correr en Supabase SQL Editor.
--  Los inserts públicos entran vía API server-side (service role); las
--  lecturas/gestión desde la Central usan RLS is_admin().
-- ════════════════════════════════════════════════════════════════════

-- ── Estados de la solicitud ──────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'solicitud_estado') then
    create type solicitud_estado as enum
      ('nueva','en_revision','contactado','aprobado','rechazado','cuenta_creada');
  end if;
end $$;

-- ── Solicitudes de acceso ────────────────────────────────────────────
create table if not exists public.access_requests (
  id                uuid primary key default gen_random_uuid(),
  numero            text unique default 'SOL-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*9000+1000))::text, 4, '0'),
  nombre            text not null,
  empresa           text,
  rut               text,
  giro              text,
  comuna            text,
  direccion         text,
  telefono          text,
  email             text,
  cargo             text,
  tipo_cliente      text,
  volumen_estimado  text,
  productos_interes text,
  horario_recepcion text,
  tiene_vitrina     boolean,
  comentario        text,
  consentimiento    boolean not null default false,
  origen            text,          -- google / instagram / tiktok / whatsapp / campaña / directo / otro
  estado            solicitud_estado not null default 'nueva',
  mayorista_id      uuid references public.mayoristas(id),  -- se llena al crear la cuenta
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_ar_estado on public.access_requests(estado);
create index if not exists idx_ar_email  on public.access_requests(lower(email));
create index if not exists idx_ar_rut    on public.access_requests(rut);
create index if not exists idx_ar_tel    on public.access_requests(telefono);
create index if not exists idx_ar_creado on public.access_requests(created_at desc);

-- ── Historial de contacto / estados / mensajes (WhatsApp, notas) ─────
create table if not exists public.access_request_events (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.access_requests(id) on delete cascade,
  tipo         text not null,           -- creada / estado / nota / whatsapp / email
  estado       solicitud_estado,
  canal        text,                    -- whatsapp / email / sistema
  mensaje      text,
  autor        uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_are_request on public.access_request_events(request_id, created_at);

-- ── Config de la landing (fila única, editable desde Central) ────────
create table if not exists public.landing_config (
  id             int primary key default 1,
  hero_titulo    text default 'Alimentos vegetarianos y veganos listos para vender',
  hero_subtitulo text default 'Abastecemos cafeterías, universidades, minimarkets, oficinas y negocios con productos innovadores, prácticos y de alta rotación.',
  video_url      text,
  zonas_cobertura text[] default array['Providencia','Ñuñoa','Santiago Centro','Las Condes','Macul'],
  updated_at     timestamptz not null default now(),
  constraint landing_config_single check (id = 1)
);
insert into public.landing_config (id) values (1) on conflict (id) do nothing;

-- ── Productos: marcar destacados para la landing (sin exponer precios) ─
alter table public.products add column if not exists destacado boolean not null default false;
alter table public.products add column if not exists foto_url text;
alter table public.products add column if not exists descripcion_publica text;

-- ── updated_at automático ───────────────────────────────────────────
create or replace function public._touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_ar_touch on public.access_requests;
create trigger trg_ar_touch before update on public.access_requests
  for each row execute function public._touch_updated_at();

-- ── RLS: gestión solo para la Central (is_admin); inserts por service role ─
alter table public.access_requests       enable row level security;
alter table public.access_request_events enable row level security;
alter table public.landing_config        enable row level security;

drop policy if exists ar_admin on public.access_requests;
create policy ar_admin on public.access_requests for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists are_admin on public.access_request_events;
create policy are_admin on public.access_request_events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists lc_read on public.landing_config;
create policy lc_read on public.landing_config for select using (true);
drop policy if exists lc_admin on public.landing_config;
create policy lc_admin on public.landing_config for update using (public.is_admin()) with check (public.is_admin());

-- ── Realtime: el panel Comercial ve entrar solicitudes en vivo ──────
do $$ begin
  begin execute 'alter publication supabase_realtime add table public.access_requests';
  exception when duplicate_object then null; end;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  FIN. Resultado esperado: "Success. No rows returned".
-- ════════════════════════════════════════════════════════════════════
