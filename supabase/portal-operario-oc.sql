-- ════════════════════════════════════════════════════════════════════
--  PORTAL OPERARIO · O-C — producción paso a paso + evidencia en Storage
--  Aditivo. Los movimientos de inventario quedan PREPARADOS pero apagados
--  hasta aprobar el Planificador (no se descuenta stock automáticamente).
-- ════════════════════════════════════════════════════════════════════

-- ── Ejecución de pasos de la receta por tarea de producción ──────────
create table if not exists public.op_produccion_pasos (
  id            uuid primary key default gen_random_uuid(),
  tarea_id      uuid not null references public.op_tareas(id) on delete cascade,
  operario_id   uuid not null references public.profiles(id) on delete cascade,
  numero        int not null,
  instruccion   text,
  tiempo_min    integer,
  control_calidad text,
  completado    boolean not null default true,
  registro      jsonb,
  completado_at timestamptz not null default now()
);
create unique index if not exists uq_opprod_paso on public.op_produccion_pasos(tarea_id, numero);
create index if not exists idx_opprod_tarea on public.op_produccion_pasos(tarea_id);

-- URL real de la evidencia (Storage) en el cierre
alter table public.op_tarea_cierre add column if not exists evidencia_url text;

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.op_produccion_pasos enable row level security;
drop policy if exists opprod_sel on public.op_produccion_pasos;
create policy opprod_sel on public.op_produccion_pasos for select
  using (operario_id = auth.uid() or public.op_es_central());
drop policy if exists opprod_ins on public.op_produccion_pasos;
create policy opprod_ins on public.op_produccion_pasos for insert
  with check (operario_id = auth.uid());
drop policy if exists opprod_upd on public.op_produccion_pasos;
create policy opprod_upd on public.op_produccion_pasos for update
  using (operario_id = auth.uid()) with check (operario_id = auth.uid());

-- Operarios pueden LEER recetas aprobadas y sus pasos/ingredientes (solo lectura)
drop policy if exists recetas_read_op on public.recetas;
create policy recetas_read_op on public.recetas for select using (auth.role() = 'authenticated');
drop policy if exists recetaver_read_op on public.receta_versiones;
create policy recetaver_read_op on public.receta_versiones for select using (auth.role() = 'authenticated' and estado = 'aprobada');
drop policy if exists recetapasos_read_op on public.receta_pasos;
create policy recetapasos_read_op on public.receta_pasos for select using (auth.role() = 'authenticated');
drop policy if exists recetaing_read_op on public.receta_ingredientes;
create policy recetaing_read_op on public.receta_ingredientes for select using (auth.role() = 'authenticated');

-- ── Storage: bucket de evidencias (foto final) ──────────────────────
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

drop policy if exists evidencias_read on storage.objects;
create policy evidencias_read on storage.objects for select
  using (bucket_id = 'evidencias');
drop policy if exists evidencias_write on storage.objects;
create policy evidencias_write on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias');
