-- ════════════════════════════════════════════════════════════════════
--  MÓDULO RECETAS Y FORMULACIONES — NOMMA FOOD
--  Aditivo. Usa products (Maestro) como fuente oficial de componentes.
--  Idempotente. Respaldo: esquema respaldo.* + rama backup/pre-limpieza-datos.
-- ════════════════════════════════════════════════════════════════════

-- ── recetas (cabecera: 1 por producto) ──────────────────────────────
create table if not exists public.recetas (
  id                uuid primary key default gen_random_uuid(),
  codigo            text unique,
  nombre            text not null,
  product_id        uuid references public.products(id),
  tipo_receta       text not null default 'producto_terminado',
  area              text,
  descripcion       text,
  foto_url          text,
  version_activa_id uuid,
  created_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_tipo_receta') then
    alter table public.recetas add constraint chk_tipo_receta
      check (tipo_receta in ('producto_terminado','preelaboracion','base','salsa','masa','relleno','proteina','kit'));
  end if;
end $$;
-- una receta por producto
create unique index if not exists uq_recetas_product on public.recetas(product_id) where product_id is not null;

-- ── receta_versiones ────────────────────────────────────────────────
create table if not exists public.receta_versiones (
  id                    uuid primary key default gen_random_uuid(),
  receta_id             uuid not null references public.recetas(id) on delete cascade,
  version               int not null default 1,
  estado                text not null default 'borrador',
  -- Rendimiento
  rendimiento_cantidad  numeric,
  rendimiento_unidad    text,
  porcion_estandar_g    numeric,
  -- Tiempos (separados)
  tiempo_trabajo_min    integer,   -- trabajo humano efectivo
  tiempo_reposo_min     integer,   -- reposo/enfriado (no cuenta como trabajo)
  operarios_ideal       integer,
  -- Merma operativa por lote (distinta de la merma por ingrediente)
  merma_operativa_pct   numeric default 0,
  -- Calidad
  requiere_lote         boolean default true,
  requiere_vencimiento  boolean default true,
  requiere_fechado      boolean default true,
  requiere_etiqueta     boolean default true,
  condicion_almacenamiento text,
  vida_util_dias        integer,
  temperatura_objetivo  numeric,
  dias_min_despacho     integer,
  alergenos             text,
  checklist_calidad     jsonb,
  criterios_retencion   text,
  -- Costos: snapshot congelado al aprobar
  costo_mp              numeric,
  costo_preelab         numeric,
  costo_envases         numeric,
  costo_merma           numeric,
  costo_mano_obra       numeric,
  costo_total_lote      numeric,
  costo_unidad_base     numeric,
  costo_unidad_venta    numeric,
  costo_hora_mo         numeric,   -- config para mano de obra
  -- Aprobación / vigencia
  aprobado_por          uuid,
  aprobado_at           timestamptz,
  vigente_desde         timestamptz,
  motivo_cambio         text,
  created_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (receta_id, version)
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_receta_ver_estado') then
    alter table public.receta_versiones add constraint chk_receta_ver_estado
      check (estado in ('borrador','en_revision','aprobada','obsoleta','archivada'));
  end if;
end $$;
-- Solo UNA versión aprobada activa por receta (= por producto)
create unique index if not exists uq_receta_ver_aprobada on public.receta_versiones(receta_id) where estado='aprobada';
create index if not exists idx_receta_ver_receta on public.receta_versiones(receta_id);

-- FK diferida de recetas.version_activa_id
do $$ begin
  if not exists (select 1 from pg_constraint where conname='fk_recetas_version_activa') then
    alter table public.recetas add constraint fk_recetas_version_activa
      foreign key (version_activa_id) references public.receta_versiones(id) on delete set null;
  end if;
end $$;

-- ── receta_ingredientes (componentes, SOLO del Maestro) ─────────────
create table if not exists public.receta_ingredientes (
  id              uuid primary key default gen_random_uuid(),
  version_id      uuid not null references public.receta_versiones(id) on delete cascade,
  producto_id     uuid not null references public.products(id),
  tipo_componente text not null default 'materia_prima',
  cantidad        numeric not null,
  unidad          text,
  merma_pct       numeric default 0,
  obligatorio     boolean default true,
  sustituto_de    uuid references public.receta_ingredientes(id) on delete set null,
  observacion     text,
  orden           int default 0,
  -- Snapshot de costo al aprobar
  costo_unitario_snap numeric,
  costo_total_snap    numeric
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_tipo_componente') then
    alter table public.receta_ingredientes add constraint chk_tipo_componente
      check (tipo_componente in ('materia_prima','preelaboracion','receta','envase','etiqueta','insumo'));
  end if;
end $$;
create index if not exists idx_receta_ing_version on public.receta_ingredientes(version_id);

-- ── receta_pasos ────────────────────────────────────────────────────
create table if not exists public.receta_pasos (
  id              uuid primary key default gen_random_uuid(),
  version_id      uuid not null references public.receta_versiones(id) on delete cascade,
  numero          int not null,
  instruccion     text,
  tiempo_min      integer,
  area            text,
  componentes     jsonb,           -- [{producto_id, cantidad}] consumidos en el paso
  justificacion   text,            -- requerido si difiere de la cantidad del ingrediente
  foto_url        text,
  control_calidad text,
  riesgo          text,
  registro_operario text,
  orden           int default 0
);
create index if not exists idx_receta_pasos_version on public.receta_pasos(version_id);

-- ── receta_audit_log ────────────────────────────────────────────────
create table if not exists public.receta_audit_log (
  id             uuid primary key default gen_random_uuid(),
  receta_id      uuid references public.recetas(id) on delete cascade,
  version_id     uuid,
  usuario_id     uuid,
  usuario_email  text,
  campo          text not null,
  valor_anterior text,
  valor_nuevo    text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_receta_audit on public.receta_audit_log(receta_id, created_at desc);

-- ── FK products.receta_id → recetas (activa el vínculo del Maestro) ──
do $$ begin
  if not exists (select 1 from pg_constraint where conname='fk_products_receta') then
    alter table public.products add constraint fk_products_receta
      foreign key (receta_id) references public.recetas(id) on delete set null;
  end if;
end $$;

-- ── RLS: gestión solo roles internos (operarios leerán aprobadas después) ──
alter table public.recetas             enable row level security;
alter table public.receta_versiones    enable row level security;
alter table public.receta_ingredientes enable row level security;
alter table public.receta_pasos        enable row level security;
alter table public.receta_audit_log    enable row level security;
do $$
declare t text;
begin
  foreach t in array array['recetas','receta_versiones','receta_ingredientes','receta_pasos','receta_audit_log']
  loop
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format('create policy %I_admin on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;
