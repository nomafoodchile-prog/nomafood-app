-- ════════════════════════════════════════════════════════════════════
--  PORTAL OPERARIO · O-D — asistencia + turnos + GeoVictoria (preparado)
--  GeoVictoria queda listo para conectar (sin credenciales hardcodeadas).
-- ════════════════════════════════════════════════════════════════════

-- id externo de GeoVictoria por operario (para mapear marcaciones)
alter table public.operarios add column if not exists geovictoria_id text;

-- ── Turnos programados ──────────────────────────────────────────────
create table if not exists public.op_turnos (
  id                uuid primary key default gen_random_uuid(),
  operario_id       uuid not null references public.profiles(id) on delete cascade,
  fecha             date not null,
  turno_nombre      text,
  entrada_esperada  time,
  salida_esperada   time,
  es_libre          boolean not null default false,
  created_at        timestamptz not null default now()
);
create unique index if not exists uq_turno_operario_dia on public.op_turnos(operario_id, fecha);

-- ── Asistencia diaria ───────────────────────────────────────────────
create table if not exists public.op_asistencia (
  id               uuid primary key default gen_random_uuid(),
  operario_id      uuid not null references public.profiles(id) on delete cascade,
  fecha            date not null,
  estado           text not null default 'asistio',
  entrada_real     timestamptz,
  salida_real      timestamptz,
  entrada_esperada time,
  salida_esperada  time,
  atraso_min       integer not null default 0,
  horas_trabajadas numeric,
  justificacion    text,
  justificacion_url text,
  validado_por     uuid,
  validado_at      timestamptz,
  fuente           text not null default 'manual',
  created_at       timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_asist_estado') then
    alter table public.op_asistencia add constraint chk_asist_estado
      check (estado in ('asistio','atraso','ausente','justificada','injustificada','libre'));
  end if;
  if not exists (select 1 from pg_constraint where conname='chk_asist_fuente') then
    alter table public.op_asistencia add constraint chk_asist_fuente
      check (fuente in ('manual','geovictoria','jornada'));
  end if;
end $$;
create unique index if not exists uq_asist_operario_dia on public.op_asistencia(operario_id, fecha);
create index if not exists idx_asist_operario on public.op_asistencia(operario_id, fecha desc);

-- ── Config de integración GeoVictoria (estado, sin secretos) ────────
create table if not exists public.geovictoria_config (
  id           int primary key default 1,
  estado       text not null default 'pendiente',
  ultima_sync  timestamptz,
  mensaje      text,
  activo       boolean not null default false,
  updated_at   timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_gv_estado') then
    alter table public.geovictoria_config add constraint chk_gv_estado
      check (estado in ('pendiente','sincronizado','error','manual'));
  end if;
end $$;
insert into public.geovictoria_config (id, estado, mensaje)
values (1, 'pendiente', 'Integración pendiente. Las credenciales se cargan por variables de entorno.')
on conflict (id) do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.op_turnos        enable row level security;
alter table public.op_asistencia    enable row level security;
alter table public.geovictoria_config enable row level security;

drop policy if exists turnos_sel on public.op_turnos;
create policy turnos_sel on public.op_turnos for select
  using (operario_id = auth.uid() or public.op_es_central());
drop policy if exists turnos_central on public.op_turnos;
create policy turnos_central on public.op_turnos for all
  using (public.op_es_central()) with check (public.op_es_central());

drop policy if exists asist_sel on public.op_asistencia;
create policy asist_sel on public.op_asistencia for select
  using (operario_id = auth.uid() or public.op_es_central());
drop policy if exists asist_central on public.op_asistencia;
create policy asist_central on public.op_asistencia for all
  using (public.op_es_central()) with check (public.op_es_central());

drop policy if exists gv_central on public.geovictoria_config;
create policy gv_central on public.geovictoria_config for all
  using (public.op_es_central()) with check (public.op_es_central());
drop policy if exists gv_read on public.geovictoria_config;
create policy gv_read on public.geovictoria_config for select using (auth.role() = 'authenticated');
