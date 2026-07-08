-- ════════════════════════════════════════════════════════════════════
--  PROVEEDORES · P-A — Ficha operacional (aditivo, no rompe existentes)
--  Amplía proveedores (generales + condiciones + evaluación)
--  y proveedor_productos (equivalencia, alternativo, activo, fecha precio).
-- ════════════════════════════════════════════════════════════════════

-- ── proveedores: datos generales ────────────────────────────────────
alter table public.proveedores add column if not exists razon_social         text;
alter table public.proveedores add column if not exists nombre_comercial     text;
alter table public.proveedores add column if not exists giro                 text;
alter table public.proveedores add column if not exists direccion_tributaria text;
alter table public.proveedores add column if not exists comuna               text;
alter table public.proveedores add column if not exists ciudad               text;
alter table public.proveedores add column if not exists contacto_comercial   text;
alter table public.proveedores add column if not exists contacto_despacho    text;
alter table public.proveedores add column if not exists contacto_cobranza    text;
alter table public.proveedores add column if not exists whatsapp             text;
alter table public.proveedores add column if not exists email_pedidos        text;
alter table public.proveedores add column if not exists email_facturacion    text;
alter table public.proveedores add column if not exists sitio_web            text;
alter table public.proveedores add column if not exists estado               text not null default 'activo';

-- ── proveedores: condiciones comerciales ────────────────────────────
alter table public.proveedores add column if not exists forma_pago            text;
alter table public.proveedores add column if not exists plazo_pago            text;
alter table public.proveedores add column if not exists pedido_minimo         numeric;
alter table public.proveedores add column if not exists dias_despacho         text;
alter table public.proveedores add column if not exists horario_atencion      text;
alter table public.proveedores add column if not exists tiempo_entrega_dias   numeric;
alter table public.proveedores add column if not exists despacha_a_planta     boolean not null default false;
alter table public.proveedores add column if not exists requiere_retiro_chofer boolean not null default false;
alter table public.proveedores add column if not exists emite_factura         boolean not null default true;
alter table public.proveedores add column if not exists permite_sin_factura   boolean not null default false;
alter table public.proveedores add column if not exists condiciones_especiales text;

-- ── proveedores: evaluación ─────────────────────────────────────────
alter table public.proveedores add column if not exists eval_puntualidad   numeric;
alter table public.proveedores add column if not exists eval_calidad       numeric;
alter table public.proveedores add column if not exists eval_precio        numeric;
alter table public.proveedores add column if not exists eval_cumplimiento  numeric;
alter table public.proveedores add column if not exists incidencias        integer not null default 0;
alter table public.proveedores add column if not exists devoluciones       integer not null default 0;
alter table public.proveedores add column if not exists nivel_confianza    text not null default 'normal';
alter table public.proveedores add column if not exists comentarios_evaluacion text;

-- ── CHECKs controlados (estado + nivel_confianza) ───────────────────
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chk_prov_estado') then
    alter table public.proveedores add constraint chk_prov_estado
      check (estado in ('activo','pausado','bloqueado','archivado'));
  end if;
  if not exists (select 1 from pg_constraint where conname='chk_prov_confianza') then
    alter table public.proveedores add constraint chk_prov_confianza
      check (nivel_confianza in ('recomendado','normal','observacion','bloqueado'));
  end if;
end $$;

-- Sincroniza estado con el boolean activo heredado (compatibilidad)
update public.proveedores set estado = case when activo = false then 'pausado' else 'activo' end
  where estado is null;

-- ── proveedor_productos: campos operacionales ───────────────────────
alter table public.proveedor_productos add column if not exists equivalencia_inventario numeric;
alter table public.proveedor_productos add column if not exists fecha_ultimo_precio      date;
alter table public.proveedor_productos add column if not exists es_alternativo           boolean not null default false;
alter table public.proveedor_productos add column if not exists activo                   boolean not null default true;

-- ── Historial de precios por proveedor-producto (variación) ─────────
create table if not exists public.proveedor_precio_historial (
  id                   uuid primary key default gen_random_uuid(),
  proveedor_producto_id uuid references public.proveedor_productos(id) on delete cascade,
  product_id           uuid references public.products(id),
  proveedor_id         uuid references public.proveedores(id),
  precio               numeric,
  fecha                date not null default current_date,
  origen               text default 'manual',
  created_at           timestamptz not null default now()
);
create index if not exists idx_pph_prov_prod on public.proveedor_precio_historial(proveedor_producto_id, fecha desc);

alter table public.proveedor_precio_historial enable row level security;
drop policy if exists pph_admin on public.proveedor_precio_historial;
create policy pph_admin on public.proveedor_precio_historial for all
  using (public.is_admin()) with check (public.is_admin());
