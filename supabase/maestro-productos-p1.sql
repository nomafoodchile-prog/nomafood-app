-- ════════════════════════════════════════════════════════════════════
--  MAESTRO DE PRODUCTOS · P1 — Estructura de datos
--  ------------------------------------------------------------------
--  ADITIVO: solo agrega columnas y tablas. NO renombra ni borra nada.
--  No rompe el portal, la landing ni los pedidos (siguen leyendo lo suyo).
--  Idempotente. Resultado esperado: "Success. No rows returned".
--
--  Estados: se GUARDAN los manuales (activo, visible_catalogo, estado_calidad)
--  y las ENTRADAS de los calculados; "disponible_venta/producible/
--  disponible_picking" se calculan en la app (no se guardan como flag manual).
-- ════════════════════════════════════════════════════════════════════

-- ── GENERAL ─────────────────────────────────────────────────────────
alter table public.products add column if not exists subcategoria       text;
alter table public.products add column if not exists tipo_producto      text not null default 'terminado_fabricado';
alter table public.products add column if not exists marca              text not null default 'NOMMA FOOD';
alter table public.products add column if not exists foto_oficial_url   text;
alter table public.products add column if not exists maneja_lote        boolean not null default false;
alter table public.products add column if not exists maneja_vencimiento boolean not null default false;
alter table public.products add column if not exists codigo_tipo        text not null default 'ninguno';
alter table public.products add column if not exists codigo_valor       text;

-- ── VENTA ───────────────────────────────────────────────────────────
alter table public.products add column if not exists unidad_venta               text;
alter table public.products add column if not exists cantidad_por_unidad_venta  numeric not null default 1;
alter table public.products add column if not exists unidad_inventario          text;
alter table public.products add column if not exists factor_conversion          numeric not null default 1;
alter table public.products add column if not exists pedido_minimo              numeric not null default 1;
alter table public.products add column if not exists visible_catalogo           boolean not null default true;

-- ── PRODUCCIÓN ──────────────────────────────────────────────────────
alter table public.products add column if not exists receta_id            uuid;
alter table public.products add column if not exists rendimiento_lote     numeric;
alter table public.products add column if not exists tiempo_produccion_min integer;
alter table public.products add column if not exists merma_esperada_pct   numeric;
alter table public.products add column if not exists modalidad_produccion text;
alter table public.products add column if not exists area_responsable     text;

-- ── INVENTARIO Y CALIDAD ────────────────────────────────────────────
alter table public.products add column if not exists stock_min                numeric;
alter table public.products add column if not exists stock_max                numeric;
alter table public.products add column if not exists punto_reposicion         numeric;
alter table public.products add column if not exists ubicacion                text;
alter table public.products add column if not exists condicion_almacenamiento text;
alter table public.products add column if not exists vida_util_dias           integer;
alter table public.products add column if not exists dias_min_despacho        integer;
alter table public.products add column if not exists estado_calidad           text not null default 'disponible';

-- ── PICKING Y DESPACHO ──────────────────────────────────────────────
alter table public.products add column if not exists ubicacion_picking         text;
alter table public.products add column if not exists tipo_embalaje             text;
alter table public.products add column if not exists peso_aprox_kg             numeric;
alter table public.products add column if not exists bultos_estimados          integer;
alter table public.products add column if not exists instrucciones_manipulacion text;
alter table public.products add column if not exists requiere_fechado          boolean not null default false;
alter table public.products add column if not exists requiere_etiqueta         boolean not null default false;

-- ── COSTOS ──────────────────────────────────────────────────────────
alter table public.products add column if not exists costo_envase   numeric;
alter table public.products add column if not exists costo_mano_obra numeric;
alter table public.products add column if not exists costo_receta   numeric;
alter table public.products add column if not exists costo_total    numeric;
alter table public.products add column if not exists margen_bruto   numeric;

-- ── LISTAS CONTROLADAS (CHECK, no texto libre) ──────────────────────
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'chk_tipo_producto') then
    alter table public.products add constraint chk_tipo_producto
      check (tipo_producto in ('terminado_fabricado','preelaboracion','materia_prima','envase_insumo','reventa','kit'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_unidad_venta') then
    alter table public.products add constraint chk_unidad_venta
      check (unidad_venta is null or unidad_venta in ('unidad','bandeja','caja','bolsa','pack','kilo','litro','docena'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_unidad_inventario') then
    alter table public.products add constraint chk_unidad_inventario
      check (unidad_inventario is null or unidad_inventario in ('unidad','bandeja','caja','bolsa','pack','kilo','litro','docena'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_condicion_alm') then
    alter table public.products add constraint chk_condicion_alm
      check (condicion_almacenamiento is null or condicion_almacenamiento in ('ambiente','refrigerado','congelado'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_estado_calidad') then
    alter table public.products add constraint chk_estado_calidad
      check (estado_calidad in ('disponible','retenido','bloqueado'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_modalidad_prod') then
    alter table public.products add constraint chk_modalidad_prod
      check (modalidad_produccion is null or modalidad_produccion in ('stock','contra_pedido'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_codigo_tipo') then
    alter table public.products add constraint chk_codigo_tipo
      check (codigo_tipo in ('ninguno','ean13','code128','qr'));
  end if;
end $$;

-- ── HISTORIAL DE PRECIOS (con vigencia) ─────────────────────────────
create table if not exists public.product_price_history (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  precio_neto   numeric not null,
  vigente_desde timestamptz not null default now(),
  vigente_hasta timestamptz,
  usuario_id    uuid,
  usuario_email text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_pph_product on public.product_price_history(product_id, vigente_desde desc);

-- ── HISTORIAL DE CAMBIOS (trazabilidad) ─────────────────────────────
create table if not exists public.product_audit_log (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references public.products(id) on delete cascade,
  usuario_id     uuid,
  usuario_email  text,
  campo          text not null,
  valor_anterior text,
  valor_nuevo    text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_pal_product on public.product_audit_log(product_id, created_at desc);

-- ── RLS: solo admin (el service role de la API igual pasa) ───────────
alter table public.product_price_history enable row level security;
alter table public.product_audit_log     enable row level security;
drop policy if exists pph_admin on public.product_price_history;
create policy pph_admin on public.product_price_history for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists pal_admin on public.product_audit_log;
create policy pal_admin on public.product_audit_log for all using (public.is_admin()) with check (public.is_admin());

-- ── Semilla: primera fila de historial de precios = precio actual ───
insert into public.product_price_history (product_id, precio_neto, vigente_desde)
select p.id, p.precio, now()
from public.products p
where p.precio is not null
  and not exists (select 1 from public.product_price_history h where h.product_id = p.id);
