-- ════════════════════════════════════════════════════════════════════
--  PORTAL OPERARIO · O-A — operarios + jornadas + mensajes (aditivo)
--  Login por operario (auth), cada uno ve SOLO lo suyo.
--  Jefatura (EncargadoProduccion) y administración ven todo.
-- ════════════════════════════════════════════════════════════════════

-- Helper: ¿el usuario actual es Central/jefatura? (security definer → lee profiles)
create or replace function public.op_es_central() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SuperAdmin','Administracion','Gerencia','EncargadoProduccion')
  );
$$;

-- ── operarios: extensión de profiles (el operario ES un usuario con login) ──
create table if not exists public.operarios (
  profile_id     uuid primary key references public.profiles(id) on delete cascade,
  area           text,
  turno_default  text,
  fecha_ingreso  date,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── op_jornadas: inicio/fin de jornada por día ──────────────────────
create table if not exists public.op_jornadas (
  id           uuid primary key default gen_random_uuid(),
  operario_id  uuid not null references public.profiles(id) on delete cascade,
  fecha        date not null default current_date,
  hora_inicio  timestamptz,
  hora_fin     timestamptz,
  estado       text not null default 'en_turno',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_jornada_estado') then
    alter table public.op_jornadas add constraint chk_jornada_estado
      check (estado in ('en_turno','pausado','finalizado'));
  end if;
end $$;
-- Una jornada por operario por día
create unique index if not exists uq_jornada_operario_dia on public.op_jornadas(operario_id, fecha);
create index if not exists idx_jornada_operario on public.op_jornadas(operario_id, fecha desc);

-- ── op_mensajes: mensajes motivacionales configurables desde Central ──
create table if not exists public.op_mensajes (
  id         uuid primary key default gen_random_uuid(),
  contexto   text not null default 'login',
  texto      text not null,
  activo     boolean not null default true,
  orden      int default 0,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_op_msg_ctx') then
    alter table public.op_mensajes add constraint chk_op_msg_ctx
      check (contexto in ('login','inicio_tarea','fin_tarea','fin_jornada'));
  end if;
end $$;

-- Semilla de mensajes (solo si la tabla está vacía)
insert into public.op_mensajes (contexto, texto, orden)
select * from (values
  ('login', 'Hoy tu trabajo ayuda a que cada pedido salga perfecto.', 1),
  ('login', 'Vamos con todo. Revisa tus tareas y comienza por la prioridad del día.', 2),
  ('login', 'Tu precisión en producción reduce mermas y mejora la calidad.', 3),
  ('login', 'Buen inicio de turno. Sigue el paso a paso y registra cada avance.', 4),
  ('inicio_tarea', 'Recuerda: calidad primero, velocidad después.', 1),
  ('fin_tarea', 'Tarea completada. Buen trabajo.', 1),
  ('fin_jornada', 'Hoy cerraste con buen cumplimiento. Gracias por tu trabajo.', 1)
) as v(contexto, texto, orden)
where not exists (select 1 from public.op_mensajes);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.operarios    enable row level security;
alter table public.op_jornadas  enable row level security;
alter table public.op_mensajes  enable row level security;

-- operarios: cada uno ve/edita lo suyo; Central ve todo
drop policy if exists operarios_self on public.operarios;
create policy operarios_self on public.operarios for select
  using (profile_id = auth.uid() or public.op_es_central());
drop policy if exists operarios_central on public.operarios;
create policy operarios_central on public.operarios for all
  using (public.op_es_central()) with check (public.op_es_central());

-- op_jornadas: el operario gestiona SU jornada; Central ve todo
drop policy if exists jornada_self_sel on public.op_jornadas;
create policy jornada_self_sel on public.op_jornadas for select
  using (operario_id = auth.uid() or public.op_es_central());
drop policy if exists jornada_self_ins on public.op_jornadas;
create policy jornada_self_ins on public.op_jornadas for insert
  with check (operario_id = auth.uid());
drop policy if exists jornada_self_upd on public.op_jornadas;
create policy jornada_self_upd on public.op_jornadas for update
  using (operario_id = auth.uid() or public.op_es_central())
  with check (operario_id = auth.uid() or public.op_es_central());

-- op_mensajes: todos los autenticados leen los activos; solo Central edita
drop policy if exists opmsg_read on public.op_mensajes;
create policy opmsg_read on public.op_mensajes for select using (auth.role() = 'authenticated');
drop policy if exists opmsg_admin on public.op_mensajes;
create policy opmsg_admin on public.op_mensajes for all
  using (public.op_es_central()) with check (public.op_es_central());
