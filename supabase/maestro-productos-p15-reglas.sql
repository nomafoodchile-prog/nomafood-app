-- ════════════════════════════════════════════════════════════════════
--  MAESTRO DE PRODUCTOS · Reglas y catálogos (fase P1.5)
--  ------------------------------------------------------------------
--  ADITIVO: agrega ciclo de vida, campos de receta (placeholder),
--  catálogos internos administrables, y aplica defaults de seguridad
--  alimentaria. NO borra ni renombra nada. Idempotente.
--  Respaldo previo: rama backup/pre-maestro-reglas (commit e01c92c).
-- ════════════════════════════════════════════════════════════════════

-- ── Ciclo de vida (SEPARADO de activo comercial) ────────────────────
alter table public.products add column if not exists estado_ciclo text not null default 'borrador';

-- ── Receta (placeholder hasta el módulo Recetas) ────────────────────
alter table public.products add column if not exists receta_estado      text not null default 'no_asignada';
alter table public.products add column if not exists receta_version     text;
alter table public.products add column if not exists rendimiento_unidad text;

-- ── Listas controladas nuevas ───────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'chk_estado_ciclo') then
    alter table public.products add constraint chk_estado_ciclo
      check (estado_ciclo in ('borrador','en_configuracion','listo_operar','descontinuado'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_receta_estado') then
    alter table public.products add constraint chk_receta_estado
      check (receta_estado in ('aprobada','borrador','obsoleta','no_asignada'));
  end if;
end $$;

-- ── Catálogos internos administrables ───────────────────────────────
create table if not exists public.catalogos (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null,
  valor      text not null,
  activo     boolean not null default true,
  orden      int not null default 0,
  created_at timestamptz not null default now(),
  unique (tipo, valor)
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'chk_catalogo_tipo') then
    alter table public.catalogos add constraint chk_catalogo_tipo
      check (tipo in ('categoria','subcategoria','ubicacion','area','condicion_almacenamiento','tipo_embalaje'));
  end if;
end $$;

alter table public.catalogos enable row level security;
drop policy if exists cat_read  on public.catalogos;
create policy cat_read  on public.catalogos for select using (true);            -- todos leen (poblar dropdowns)
drop policy if exists cat_admin on public.catalogos;
create policy cat_admin on public.catalogos for all using (public.is_admin()) with check (public.is_admin()); -- solo admin edita

-- ── Semillas de catálogos ───────────────────────────────────────────
insert into public.catalogos (tipo, valor) values
  ('condicion_almacenamiento','ambiente'),
  ('condicion_almacenamiento','refrigerado'),
  ('condicion_almacenamiento','congelado'),
  ('tipo_embalaje','Caja'),
  ('tipo_embalaje','Bandeja'),
  ('tipo_embalaje','Bolsa'),
  ('tipo_embalaje','Caja térmica'),
  ('tipo_embalaje','Pack'),
  ('area','Cocina caliente'),
  ('area','Panadería'),
  ('area','Pastelería'),
  ('area','Armado'),
  ('area','Despacho')
on conflict (tipo, valor) do nothing;

-- Categorías desde los productos que ya existen
insert into public.catalogos (tipo, valor)
select distinct 'categoria', p.categoria
from public.products p
where p.categoria is not null and btrim(p.categoria) <> ''
on conflict (tipo, valor) do nothing;

-- ── Defaults de seguridad alimentaria (productos terminados) ────────
update public.products
set maneja_lote = true, maneja_vencimiento = true, requiere_fechado = true, requiere_etiqueta = true
where tipo_producto = 'terminado_fabricado';

-- ── Normalización de ciclo de vida de productos existentes ──────────
-- Los que ya están activos comercialmente se marcan "listo_operar"
-- (venían operando); el resto queda "borrador" para revisión.
update public.products
set estado_ciclo = 'listo_operar'
where estado_ciclo = 'borrador' and activo = true;
