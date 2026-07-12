-- ════════════════════════════════════════════════════════════════════
--  MARKETING · M1 Email — campañas, audiencias, cupones, plantillas
--  Aditivo. Esquema mkt_*. Email por Resend. WhatsApp queda preparado.
-- ════════════════════════════════════════════════════════════════════

alter type app_role add value if not exists 'Comercial';

-- Permisos: ver/crear borradores = admin/gerencia/comercial ; enviar = admin/gerencia
create or replace function public.mkt_puede_ver() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.role::text in ('SuperAdmin','Administracion','Gerencia','Comercial'));
$$;
create or replace function public.mkt_puede_enviar() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.role::text in ('SuperAdmin','Administracion','Gerencia'));
$$;

-- Tags de segmentación (asignables desde la ficha) + precio de marketing
alter table public.mayoristas add column if not exists tipo           text;
alter table public.mayoristas add column if not exists categoria      text;
alter table public.mayoristas add column if not exists baja_marketing boolean not null default false;
alter table public.products   add column if not exists precio_venta   numeric;

-- ── Cupones ─────────────────────────────────────────────────────────
create table if not exists public.mkt_cupones (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  tipo       text not null default 'porcentaje',
  valor      numeric not null default 0,
  desde      date,
  hasta      date,
  limite_uso integer,
  usos       integer not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_cupon_tipo') then
    alter table public.mkt_cupones add constraint chk_cupon_tipo check (tipo in ('porcentaje','monto'));
  end if;
end $$;

-- ── Plantillas ──────────────────────────────────────────────────────
create table if not exists public.mkt_plantillas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  asunto        text,
  contenido_html text,
  es_sistema    boolean not null default false,
  created_at    timestamptz not null default now()
);
insert into public.mkt_plantillas (nombre, asunto, es_sistema)
select * from (values
  ('Bienvenida cliente nuevo', '¡Bienvenido a NOMMA FOOD! 🌿', true),
  ('Nuevo menú semanal', 'Nuevo menú de la semana', true),
  ('Promoción mayorista', 'Oferta especial para mayoristas', true),
  ('Lanzamiento de producto', 'Nuevo producto NOMMA FOOD', true),
  ('Cliente inactivo', 'Te extrañamos 💚', true),
  ('Primera compra', 'Gracias por tu primera compra', true),
  ('Recordatorio de pago', 'Recordatorio de tu cuenta', true),
  ('Campaña pastelería', 'Dulces novedades 🧁', true),
  ('Campaña línea asiática', 'Sabores de Asia, estilo NOMMA', true)
) as v(nombre, asunto, es_sistema)
where not exists (select 1 from public.mkt_plantillas where es_sistema);

-- ── Campañas ────────────────────────────────────────────────────────
create table if not exists public.mkt_campanas (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null default 'Campaña sin título',
  canal            text not null default 'email',
  asunto           text,
  preheader        text,
  remitente_nombre text default 'NOMMA FOOD',
  contenido_html   text,
  tipografia       text default 'Poppins',
  imagen_url       text,
  video_url        text,
  boton_texto      text,
  boton_url        text,
  productos        jsonb,
  cupon_id         uuid references public.mkt_cupones(id) on delete set null,
  audiencia        jsonb,
  estado           text not null default 'borrador',
  programada_para  timestamptz,
  prueba_enviada   boolean not null default false,
  stats            jsonb not null default '{}'::jsonb,
  created_by       uuid,
  created_email    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_camp_canal') then
    alter table public.mkt_campanas add constraint chk_camp_canal check (canal in ('email','whatsapp'));
  end if;
  if not exists (select 1 from pg_constraint where conname='chk_camp_estado') then
    alter table public.mkt_campanas add constraint chk_camp_estado
      check (estado in ('borrador','programada','enviada','pausada','anulada','error'));
  end if;
end $$;
create index if not exists idx_mkt_camp_estado on public.mkt_campanas(estado, created_at desc);

-- ── Envíos (historial por contacto) ─────────────────────────────────
create table if not exists public.mkt_envios (
  id             uuid primary key default gen_random_uuid(),
  campana_id     uuid not null references public.mkt_campanas(id) on delete cascade,
  contacto_ref   text,
  contacto_email text,
  contacto_nombre text,
  estado         text not null default 'pendiente',
  error          text,
  provider_id    text,
  entregado      boolean not null default false,
  abierto        boolean not null default false,
  clic           boolean not null default false,
  compro         boolean not null default false,
  baja           boolean not null default false,
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_mkt_env_camp on public.mkt_envios(campana_id);

-- ── RLS: acceso al módulo = mkt_puede_ver (envío se gatilla en el API) ─
do $$
declare t text;
begin
  foreach t in array array['mkt_cupones','mkt_plantillas','mkt_campanas','mkt_envios']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_ver on public.%I', t, t);
    execute format('create policy %I_ver on public.%I for all using (public.mkt_puede_ver()) with check (public.mkt_puede_ver())', t, t);
  end loop;
end $$;
