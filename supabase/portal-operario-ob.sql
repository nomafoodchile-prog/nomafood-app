-- ════════════════════════════════════════════════════════════════════
--  PORTAL OPERARIO · O-B — tareas + tiempos + checklist + cierre (aditivo)
--  Cada operario ve/gestiona SOLO sus tareas. Central ve todo.
-- ════════════════════════════════════════════════════════════════════

-- ── Tareas del día ──────────────────────────────────────────────────
create table if not exists public.op_tareas (
  id                 uuid primary key default gen_random_uuid(),
  operario_id        uuid not null references public.profiles(id) on delete cascade,
  fecha              date not null default current_date,
  tipo               text not null default 'produccion',
  prioridad          text not null default 'media',
  area               text,
  titulo             text not null,
  cantidad_asignada  numeric,
  unidad             text,
  tiempo_estimado_min integer default 0,
  hora_programada    time,
  instrucciones      text,
  receta_version_id  uuid,
  estado             text not null default 'pendiente',
  es_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_optarea_tipo') then
    alter table public.op_tareas add constraint chk_optarea_tipo
      check (tipo in ('produccion','preelaboracion','limpieza','apoyo','orden','revision','especial'));
  end if;
  if not exists (select 1 from pg_constraint where conname='chk_optarea_estado') then
    alter table public.op_tareas add constraint chk_optarea_estado
      check (estado in ('pendiente','en_proceso','pausada','finalizada','finalizada_incidencia','rechazada_calidad','reasignada'));
  end if;
end $$;
create index if not exists idx_optarea_operario on public.op_tareas(operario_id, fecha desc);

-- ── Eventos de tiempo (inicio / pausa+motivo / reanudación / fin) ────
create table if not exists public.op_tarea_eventos (
  id          uuid primary key default gen_random_uuid(),
  tarea_id    uuid not null references public.op_tareas(id) on delete cascade,
  operario_id uuid not null references public.profiles(id) on delete cascade,
  tipo        text not null,
  motivo      text,
  ts          timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_optev_tipo') then
    alter table public.op_tarea_eventos add constraint chk_optev_tipo
      check (tipo in ('inicio','pausa','reanudacion','fin'));
  end if;
end $$;
create index if not exists idx_optev_tarea on public.op_tarea_eventos(tarea_id, ts);

-- ── Cierre de tarea (checklist + evidencia + campos reales + calidad) ─
create table if not exists public.op_tarea_cierre (
  id                  uuid primary key default gen_random_uuid(),
  tarea_id            uuid not null unique references public.op_tareas(id) on delete cascade,
  operario_id         uuid not null references public.profiles(id) on delete cascade,
  tiempo_estimado_min integer,
  tiempo_real_min     integer,
  checklist_respuestas jsonb,
  evidencia_cargada   boolean not null default false,
  evidencia_nombre    text,
  cantidad_producida  numeric,
  cantidad_rechazada  numeric,
  merma               numeric,
  merma_motivo        text,
  fecha_elaboracion   date,
  fecha_vencimiento   date,
  ubicacion_bodega_id uuid references public.bodegas(id),
  calidad_resultado   text,
  calidad_motivo      text,
  calidad_comentario  text,
  observaciones       text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_opcierre_operario on public.op_tarea_cierre(operario_id, created_at desc);

-- ── Plantillas de checklist por tipo (configurable desde Central) ────
create table if not exists public.op_checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null unique,
  items      jsonb not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.op_checklist_templates (tipo, items)
select * from (values
  ('produccion', '[
    {"clave":"receta","texto":"Segui la receta aprobada"},
    {"clave":"lote","texto":"Use el lote correcto"},
    {"clave":"cantidad","texto":"Cantidad y merma registradas"},
    {"clave":"f_elab","texto":"Fecha de elaboracion correcta"},
    {"clave":"f_venc","texto":"Fecha de vencimiento correcta"},
    {"clave":"etiqueta","texto":"Etiqueta correcta"},
    {"clave":"estado","texto":"Producto en buen estado"},
    {"clave":"ubicacion","texto":"Ubicacion final correcta"},
    {"clave":"foto","texto":"Foto final cargada"}
  ]'::jsonb),
  ('preelaboracion', '[
    {"clave":"receta","texto":"Segui la receta aprobada"},
    {"clave":"cantidad","texto":"Cantidad producida registrada"},
    {"clave":"merma","texto":"Merma registrada"},
    {"clave":"lote","texto":"Lote generado"},
    {"clave":"f_venc","texto":"Vencimiento definido"},
    {"clave":"rotulo","texto":"Rotulacion correcta"},
    {"clave":"ubicacion","texto":"Ubicacion final correcta"},
    {"clave":"foto","texto":"Foto final cargada"}
  ]'::jsonb),
  ('limpieza', '[
    {"clave":"residuos","texto":"Residuos retirados"},
    {"clave":"superficie","texto":"Superficie/equipo limpio"},
    {"clave":"sanitiza","texto":"Sanitizado realizado"},
    {"clave":"insumos","texto":"Insumos usados correctamente"},
    {"clave":"area","texto":"Area seca, ordenada y segura"},
    {"clave":"foto","texto":"Foto final cargada"},
    {"clave":"reporte","texto":"Problemas reportados, si existieron"}
  ]'::jsonb),
  ('general', '[
    {"clave":"realizada","texto":"Tarea realizada segun instrucciones"},
    {"clave":"area","texto":"Area quedo ordenada y segura"},
    {"clave":"foto","texto":"Foto final cargada"}
  ]'::jsonb)
) as v(tipo, items)
where not exists (select 1 from public.op_checklist_templates);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.op_tareas             enable row level security;
alter table public.op_tarea_eventos      enable row level security;
alter table public.op_tarea_cierre       enable row level security;
alter table public.op_checklist_templates enable row level security;

drop policy if exists optareas_sel on public.op_tareas;
create policy optareas_sel on public.op_tareas for select
  using (operario_id = auth.uid() or public.op_es_central());
drop policy if exists optareas_upd on public.op_tareas;
create policy optareas_upd on public.op_tareas for update
  using (operario_id = auth.uid() or public.op_es_central())
  with check (operario_id = auth.uid() or public.op_es_central());
drop policy if exists optareas_central on public.op_tareas;
create policy optareas_central on public.op_tareas for all
  using (public.op_es_central()) with check (public.op_es_central());

drop policy if exists optev_sel on public.op_tarea_eventos;
create policy optev_sel on public.op_tarea_eventos for select
  using (operario_id = auth.uid() or public.op_es_central());
drop policy if exists optev_ins on public.op_tarea_eventos;
create policy optev_ins on public.op_tarea_eventos for insert
  with check (operario_id = auth.uid());

drop policy if exists opcierre_sel on public.op_tarea_cierre;
create policy opcierre_sel on public.op_tarea_cierre for select
  using (operario_id = auth.uid() or public.op_es_central());
drop policy if exists opcierre_ins on public.op_tarea_cierre;
create policy opcierre_ins on public.op_tarea_cierre for insert
  with check (operario_id = auth.uid());

drop policy if exists opck_read on public.op_checklist_templates;
create policy opck_read on public.op_checklist_templates for select using (auth.role() = 'authenticated');
drop policy if exists opck_admin on public.op_checklist_templates;
create policy opck_admin on public.op_checklist_templates for all
  using (public.op_es_central()) with check (public.op_es_central());
