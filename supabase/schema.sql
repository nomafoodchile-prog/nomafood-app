create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum (
      'Gerencia',
      'Administracion',
      'EncargadoProduccion',
      'Operario',
      'Armado',
      'Chofer'
    );
  end if;
end $$;

alter type app_role add value if not exists 'Gerencia';
alter type app_role add value if not exists 'Administracion';
alter type app_role add value if not exists 'EncargadoProduccion';
alter type app_role add value if not exists 'Operario';
alter type app_role add value if not exists 'Armado';
alter type app_role add value if not exists 'Chofer';

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  role app_role not null default 'Operario',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  code text not null unique,
  name text not null,
  category text not null,
  subcategory text,
  unit text not null,
  current_stock numeric not null default 0 check (current_stock >= 0),
  minimum_stock numeric not null default 0 check (minimum_stock >= 0),
  location text,
  supplier text,
  cost numeric not null default 0 check (cost >= 0),
  batch text,
  expiration date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id text primary key,
  date date not null default current_date,
  type text not null check (type in ('Entrada', 'Salida', 'Merma', 'Vencido', 'Ajuste', 'Traslado')),
  product_id text not null references public.products(id),
  product_name text not null,
  quantity numeric not null,
  responsible text not null,
  source_destination text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_catalog_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (
    item_type in ('categories', 'subcategories', 'suppliers', 'locations', 'units', 'responsibles')
  ),
  name text not null,
  created_at timestamptz not null default now(),
  unique (item_type, name)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row
execute function public.touch_updated_at();

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
as $$
declare
  delta numeric := 0;
begin
  if new.type = 'Entrada' then
    delta := abs(new.quantity);
  elsif new.type in ('Salida', 'Merma', 'Vencido') then
    delta := -abs(new.quantity);
  elsif new.type = 'Ajuste' then
    delta := new.quantity;
  else
    delta := 0;
  end if;

  update public.products
  set current_stock = greatest(0, current_stock + delta),
      updated_at = now()
  where id = new.product_id;

  return new;
end;
$$;

drop trigger if exists inventory_movements_apply_stock on public.inventory_movements;
create trigger inventory_movements_apply_stock
after insert on public.inventory_movements
for each row
execute function public.apply_inventory_movement();

create or replace function public.prevent_inventory_movement_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Los movimientos de inventario no se pueden modificar ni borrar.';
end;
$$;

drop trigger if exists inventory_movements_no_update on public.inventory_movements;
create trigger inventory_movements_no_update
before update on public.inventory_movements
for each row
execute function public.prevent_inventory_movement_changes();

drop trigger if exists inventory_movements_no_delete on public.inventory_movements;
create trigger inventory_movements_no_delete
before delete on public.inventory_movements
for each row
execute function public.prevent_inventory_movement_changes();

insert into public.inventory_catalog_items (item_type, name) values
  ('categories', 'Materias primas secas'),
  ('categories', 'Refrigerados'),
  ('categories', 'Congelados'),
  ('categories', 'Frutas y verduras'),
  ('categories', 'Proteínas vegetales'),
  ('categories', 'Preelaboraciones'),
  ('categories', 'Panadería'),
  ('categories', 'Pastelería'),
  ('categories', 'Condimentos y salsas'),
  ('categories', 'Packaging y envases'),
  ('categories', 'Limpieza y sanitización'),
  ('categories', 'EPP y operación'),
  ('categories', 'Otros'),
  ('subcategories', 'Harinas'),
  ('subcategories', 'Legumbres'),
  ('subcategories', 'Verduras frescas'),
  ('subcategories', 'Salsas base'),
  ('subcategories', 'Envases compostables'),
  ('subcategories', 'Químicos limpieza'),
  ('suppliers', 'Distribuidora Central'),
  ('suppliers', 'Campo Vivo'),
  ('suppliers', 'Veggie Proteins'),
  ('suppliers', 'Packaging Sur'),
  ('suppliers', 'Alma Food'),
  ('locations', 'Bodega seca'),
  ('locations', 'Cámara refrigerada'),
  ('locations', 'Cámara congelada'),
  ('locations', 'Producción'),
  ('locations', 'Zona despacho'),
  ('units', 'kg'),
  ('units', 'g'),
  ('units', 'lt'),
  ('units', 'ml'),
  ('units', 'unidad'),
  ('units', 'caja'),
  ('units', 'bolsa'),
  ('responsibles', 'Camila Soto'),
  ('responsibles', 'Javier Rojas'),
  ('responsibles', 'Equipo Producción'),
  ('responsibles', 'Administrador')
on conflict (item_type, name) do nothing;

insert into public.products (
  id, code, name, category, subcategory, unit, current_stock, minimum_stock,
  location, supplier, cost, batch, expiration, notes
) values
  (
    'prod-001', 'AF-MP-001', 'Harina integral', 'Materias primas secas', 'Harinas',
    'kg', 8, 25, 'Bodega seca', 'Distribuidora Central', 1250, 'HI-2406-A',
    '2026-07-04', 'Saco abierto en uso.'
  ),
  (
    'prod-002', 'AF-REF-014', 'Tofu firme', 'Proteínas vegetales', 'Legumbres',
    'kg', 14, 12, 'Cámara refrigerada', 'Veggie Proteins', 3400, 'TF-0716',
    '2026-06-26', 'Priorizar en producción semanal.'
  ),
  (
    'prod-003', 'AF-FV-021', 'Tomate pera', 'Frutas y verduras', 'Verduras frescas',
    'kg', 5, 15, 'Cámara refrigerada', 'Campo Vivo', 980, 'TP-1906',
    '2026-06-18', 'Producto vencido, revisar merma.'
  ),
  (
    'prod-004', 'AF-PKG-006', 'Bowl compostable 750 ml', 'Packaging y envases',
    'Envases compostables', 'unidad', 420, 300, 'Bodega seca', 'Packaging Sur',
    145, 'BC-750-09', null, 'Sin vencimiento.'
  ),
  (
    'prod-005', 'AF-SAL-002', 'Salsa de tomate base', 'Preelaboraciones',
    'Salsas base', 'lt', 18, 20, 'Producción', 'Alma Food',
    2100, 'STB-2206', '2026-07-18', 'Rotar antes de abrir nuevo lote.'
  )
on conflict (id) do nothing;

insert into public.inventory_movements (
  id, date, type, product_id, product_name, quantity, responsible, source_destination, notes
) values
  (
    'mov-001', '2026-06-19', 'Entrada', 'prod-001', 'Harina integral',
    20, 'Javier Rojas', 'Distribuidora Central', 'Recepción parcial OC-154.'
  ),
  (
    'mov-002', '2026-06-19', 'Salida', 'prod-002', 'Tofu firme',
    6, 'Equipo Producción', 'Línea producción', 'Batch menú semanal.'
  ),
  (
    'mov-003', '2026-06-18', 'Merma', 'prod-003', 'Tomate pera',
    5, 'Camila Soto', 'Control calidad', 'Golpes y sobremaduración.'
  )
on conflict (id) do nothing;

create or replace view public.inventory_alerts as
select
  p.id as product_id,
  p.code,
  p.name,
  p.category,
  p.location,
  p.current_stock,
  p.minimum_stock,
  p.expiration,
  case
    when p.current_stock <= 0 then 'Producto agotado'
    when p.current_stock <= p.minimum_stock then 'Stock bajo'
    when p.expiration < current_date then 'Producto vencido'
    when p.expiration in (current_date + 30, current_date + 15, current_date + 7)
      or p.expiration <= current_date + 7 then 'Próximo a vencer'
    else null
  end as alert_type
from public.products p
where
  p.current_stock <= p.minimum_stock
  or p.expiration < current_date
  or p.expiration in (current_date + 30, current_date + 15, current_date + 7)
  or p.expiration <= current_date + 7;

create table if not exists public.operators (
  id text primary key,
  name text not null,
  area text not null,
  shift text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  name text not null,
  channel text not null check (channel in ('B2B', 'Retail', 'Eventos')),
  address text,
  contact text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.production_items (
  id text primary key,
  product_id text references public.products(id),
  name text not null,
  item_type text not null check (
    item_type in ('Materia prima', 'Envase', 'Preelaboracion', 'Producto terminado')
  ),
  unit text not null,
  stock numeric not null default 0,
  minimum_stock numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id text primary key,
  product_item_id text not null references public.production_items(id),
  product_name text not null,
  yield_quantity numeric not null,
  yield_unit text not null,
  area text not null,
  preparation_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id text primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  item_id text not null references public.production_items(id),
  item_name text not null,
  quantity numeric not null,
  unit text not null,
  stage text not null default 'Montaje',
  available_stock numeric not null default 0
);

create table if not exists public.recipe_steps (
  id text primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  step_order integer not null,
  area text not null,
  title text not null,
  detail text not null,
  minutes integer not null default 0,
  assigned_role text not null
);

create table if not exists public.orders (
  id text primary key,
  code text not null unique,
  customer_id text not null references public.customers(id),
  customer_name text not null,
  status text not null check (status in ('Confirmado', 'Reservado', 'En produccion', 'Armado', 'Despachado')),
  delivery_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_lines (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_item_id text not null references public.production_items(id),
  product_name text not null,
  quantity numeric not null,
  unit text not null
);

create table if not exists public.production_orders (
  id text primary key,
  code text not null unique,
  order_id text references public.orders(id),
  product_item_id text references public.production_items(id),
  product_name text not null,
  quantity numeric not null,
  unit text not null,
  area text not null,
  status text not null check (status in ('Pendiente', 'En proceso', 'Completada')),
  due_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.adt_tasks (
  id text primary key,
  task_date date not null,
  operator_id text references public.operators(id),
  operator_name text not null,
  area text not null,
  task text not null,
  detail text,
  recipe_id text references public.recipes(id),
  status text not null check (status in ('Pendiente', 'En proceso', 'Lista')),
  estimated_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.picking_tasks (
  id text primary key,
  order_id text not null references public.orders(id),
  customer_name text not null,
  basket_code text not null,
  checklist jsonb not null default '[]'::jsonb,
  status text not null check (status in ('Pendiente', 'En armado', 'Listo')),
  created_at timestamptz not null default now()
);

create table if not exists public.dispatches (
  id text primary key,
  order_id text not null references public.orders(id),
  customer_name text not null,
  driver_name text not null,
  route text not null,
  status text not null check (status in ('Programado', 'En ruta', 'Entregado')),
  evidence text,
  evidence_url text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_entries (
  id text primary key,
  entry_date date not null,
  entry_type text not null check (entry_type in ('Ingreso', 'Egreso')),
  category text not null,
  description text not null,
  amount numeric not null check (amount >= 0),
  payment_method text not null,
  responsible text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_receivables (
  id text primary key,
  invoice_number text not null,
  customer_name text not null,
  issue_date date not null,
  due_date date not null,
  amount numeric not null check (amount >= 0),
  paid_amount numeric not null default 0 check (paid_amount >= 0),
  payment_terms text not null,
  status text not null check (status in ('Pendiente', 'Por vencer', 'Vencida', 'Pagada')),
  contact_name text not null,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_customers (
  id text primary key,
  customer_id text references public.customers(id),
  contact_name text not null,
  business_name text not null,
  business_type text not null,
  active boolean not null default true,
  last_purchase date,
  commune text,
  payment_status text not null,
  purchased_products text[] not null default '{}',
  marketing_consent boolean not null default false,
  consent_date date,
  authorized_channels text[] not null default '{}',
  unsubscribed boolean not null default false,
  portal_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_templates (
  id text primary key,
  name text not null,
  channel text not null check (channel in ('Email marketing', 'WhatsApp Business')),
  subject text,
  body text not null,
  featured_products text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id text primary key,
  name text not null,
  channel text not null check (channel in ('Email marketing', 'WhatsApp Business')),
  status text not null check (status in ('Borrador', 'Programada', 'Enviada', 'Cancelada')),
  segment_name text not null,
  template_id text references public.campaign_templates(id),
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_deliveries (
  id text primary key,
  campaign_id text not null references public.marketing_campaigns(id) on delete cascade,
  marketing_customer_id text references public.marketing_customers(id),
  customer_name text not null,
  business_name text not null,
  channel text not null check (channel in ('Email marketing', 'WhatsApp Business')),
  status text not null check (status in ('enviado', 'entregado', 'abierto/clic', 'respondido', 'cancelado')),
  last_event_at timestamptz not null default now(),
  provider_message_id text,
  error_message text
);

insert into public.operators (id, name, area, shift) values
  ('op-001', 'Marisol Fuentes', 'Cocina caliente', '07:00-15:00'),
  ('op-002', 'Rodrigo Campos', 'Frio', '07:00-15:00'),
  ('op-003', 'Nicolas Araya', 'Panaderia', '08:00-16:00'),
  ('op-004', 'Daniela Perez', 'Armado', '09:00-17:00'),
  ('op-005', 'Hector Silva', 'Despacho', '10:00-18:00')
on conflict (id) do nothing;

insert into public.customers (id, name, channel, address, contact, phone) values
  ('cli-001', 'Clinica Santa Emilia', 'B2B', 'Av. Providencia 1800, Santiago', 'Paula Herrera', '+56 9 4422 1100'),
  ('cli-002', 'Cafe Raiz', 'Retail', 'Italia 1320, Nunoa', 'Martin Leiva', '+56 9 7718 2030'),
  ('cli-003', 'Evento Green Summit', 'Eventos', 'Centro Parque, Las Condes', 'Antonia Vidal', '+56 9 6621 8840')
on conflict (id) do nothing;

insert into public.production_items (id, product_id, name, item_type, unit, stock, minimum_stock) values
  ('prod-001', 'prod-001', 'Harina integral', 'Materia prima', 'kg', 28, 25),
  ('prod-002', 'prod-002', 'Tofu firme', 'Materia prima', 'kg', 8, 12),
  ('prod-004', 'prod-004', 'Bowl compostable 750 ml', 'Envase', 'unidad', 420, 300),
  ('prod-005', 'prod-005', 'Salsa de tomate base', 'Preelaboracion', 'lt', 18, 20),
  ('pt-001', null, 'Lasagna vegana individual', 'Producto terminado', 'unidad', 36, 40),
  ('pt-002', null, 'Bowl thai tofu', 'Producto terminado', 'unidad', 22, 30),
  ('pt-003', null, 'Focaccia integral', 'Producto terminado', 'unidad', 48, 40)
on conflict (id) do nothing;

insert into public.recipes (id, product_item_id, product_name, yield_quantity, yield_unit, area, preparation_minutes) values
  ('rec-001', 'pt-001', 'Lasagna vegana individual', 24, 'unidad', 'Cocina caliente', 150),
  ('rec-002', 'pt-002', 'Bowl thai tofu', 30, 'unidad', 'Frio', 110)
on conflict (id) do nothing;

insert into public.recipe_ingredients (id, recipe_id, item_id, item_name, quantity, unit, stage, available_stock) values
  ('ri-001', 'rec-001', 'prod-005', 'Salsa de tomate base', 8, 'lt', 'Preelaboracion', 18),
  ('ri-002', 'rec-001', 'prod-002', 'Tofu firme', 4, 'kg', 'Premezcla', 8),
  ('ri-003', 'rec-001', 'prod-004', 'Bowl compostable 750 ml', 24, 'unidad', 'Envase', 420),
  ('ri-004', 'rec-002', 'prod-002', 'Tofu firme', 6, 'kg', 'Premezcla', 8),
  ('ri-005', 'rec-002', 'prod-004', 'Bowl compostable 750 ml', 30, 'unidad', 'Envase', 420)
on conflict (id) do nothing;

insert into public.recipe_steps (id, recipe_id, step_order, area, title, detail, minutes, assigned_role) values
  ('rs-001', 'rec-001', 1, 'Cocina caliente', 'Sanitizar puesto y mise en place', 'Preparar bandejas, utensilios, etiquetas de lote y controlar temperatura de insumos refrigerados.', 15, 'Operario cocina'),
  ('rs-002', 'rec-001', 2, 'Cocina caliente', 'Dosificar preelaboraciones', 'Usar 8 lt de salsa base y 4 kg de tofu por batch de 24 unidades. Registrar lote de salsa y tofu.', 35, 'Operario cocina'),
  ('rs-003', 'rec-001', 3, 'Cocina caliente', 'Montar lasañas por unidad', 'Armar 24 bowls por batch, controlar gramaje visual y evitar mezclar lotes.', 55, 'Operario cocina'),
  ('rs-004', 'rec-001', 4, 'Armado', 'Etiquetar y liberar producto terminado', 'Etiquetar con cliente, fecha, lote y conservar en cámara según ruta de despacho.', 45, 'Armado'),
  ('rs-005', 'rec-002', 1, 'Frio', 'Preparar base fria', 'Retirar tofu firme, controlar vencimiento y cortar segun ficha tecnica.', 30, 'Operario frio'),
  ('rs-006', 'rec-002', 2, 'Frio', 'Mezclar componentes', 'Dosificar tofu y vegetales por bowl, mantener cadena de frio y registrar lote.', 45, 'Operario frio'),
  ('rs-007', 'rec-002', 3, 'Armado', 'Cerrar, etiquetar y ordenar por cliente', 'Cerrar bowls, pegar etiqueta, separar por cesta y validar checklist de despacho.', 35, 'Armado')
on conflict (id) do nothing;

insert into public.orders (id, code, customer_id, customer_name, status, delivery_date) values
  ('ord-001', 'PED-1024', 'cli-001', 'Clinica Santa Emilia', 'Confirmado', '2026-06-21'),
  ('ord-002', 'PED-1025', 'cli-002', 'Cafe Raiz', 'Reservado', '2026-06-21'),
  ('ord-003', 'PED-1026', 'cli-003', 'Evento Green Summit', 'En produccion', '2026-06-22')
on conflict (id) do nothing;

insert into public.order_lines (id, order_id, product_item_id, product_name, quantity, unit) values
  ('ol-001', 'ord-001', 'pt-001', 'Lasagna vegana individual', 60, 'unidad'),
  ('ol-002', 'ord-001', 'pt-003', 'Focaccia integral', 35, 'unidad'),
  ('ol-003', 'ord-002', 'pt-002', 'Bowl thai tofu', 42, 'unidad'),
  ('ol-004', 'ord-003', 'pt-001', 'Lasagna vegana individual', 80, 'unidad'),
  ('ol-005', 'ord-003', 'pt-002', 'Bowl thai tofu', 80, 'unidad')
on conflict (id) do nothing;

insert into public.production_orders (
  id, code, order_id, product_item_id, product_name, quantity, unit, area, status, due_date
) values
  ('oprod-001', 'OP-2201', 'ord-001', 'pt-001', 'Lasagna vegana individual', 120, 'unidad', 'Cocina caliente', 'Pendiente', '2026-06-20'),
  ('oprod-002', 'OP-2202', 'ord-002', 'pt-002', 'Bowl thai tofu', 120, 'unidad', 'Frio', 'En proceso', '2026-06-20')
on conflict (id) do nothing;

insert into public.adt_tasks (
  id, task_date, operator_id, operator_name, area, task, detail, recipe_id, status, estimated_minutes
) values
  ('adt-001', '2026-06-20', 'op-001', 'Marisol Fuentes', 'Cocina caliente', 'Lasagna vegana: ejecutar pasos 1 a 3 de receta REC-001', 'Produccion requerida: 120 unidades. Rinde 24 por batch: preparar 5 batches. Verificar 40 lt salsa base, 20 kg tofu y 120 envases antes de iniciar.', 'rec-001', 'Pendiente', 300),
  ('adt-002', '2026-06-20', 'op-002', 'Rodrigo Campos', 'Frio', 'Bowl thai tofu: preparar base fria y mezcla', 'Produccion requerida: 120 unidades. Rinde 30 por batch: preparar 4 batches. Revisar disponibilidad de tofu antes de liberar.', 'rec-002', 'En proceso', 220),
  ('adt-003', '2026-06-20', 'op-004', 'Daniela Perez', 'Armado', 'Armado: separar cestas por cliente y validar checklist', 'Priorizar Clinica Santa Emilia CSE-01 y Cafe Raiz CR-01. No despachar sin etiqueta, lote y conteo final.', null, 'Pendiente', 160)
on conflict (id) do nothing;

insert into public.picking_tasks (id, order_id, customer_name, basket_code, checklist, status) values
  ('pick-001', 'ord-001', 'Clinica Santa Emilia', 'CSE-01', '[{"label":"60 lasagnas","done":false},{"label":"35 focaccias","done":true},{"label":"Etiquetas cliente","done":true}]', 'En armado'),
  ('pick-002', 'ord-002', 'Cafe Raiz', 'CR-01', '[{"label":"42 bowls thai","done":false},{"label":"Salsas y cubiertos","done":false}]', 'Pendiente')
on conflict (id) do nothing;

insert into public.dispatches (id, order_id, customer_name, driver_name, route, status, evidence) values
  ('des-001', 'ord-001', 'Clinica Santa Emilia', 'Hector Silva', 'Ruta Oriente 1', 'Programado', 'Pendiente foto entrega'),
  ('des-002', 'ord-002', 'Cafe Raiz', 'Hector Silva', 'Ruta Nunoa', 'Programado', 'Pendiente firma cliente')
on conflict (id) do nothing;

insert into public.cash_entries (
  id, entry_date, entry_type, category, description, amount, payment_method, responsible, notes
) values
  ('cash-001', '2026-06-20', 'Ingreso', 'Venta mayorista', 'Pedido Cafe Raiz MAY-2108', 286450, 'Transferencia', 'Camila Soto', 'Pago recibido antes de despacho'),
  ('cash-002', '2026-06-20', 'Egreso', 'Compra materia prima', 'Compra tofu firme y verduras', 124800, 'Transferencia', 'Valentina Morales', 'Proveedor Verde Origen'),
  ('cash-003', '2026-06-19', 'Ingreso', 'Venta retail', 'Ventas vitrina local', 168900, 'Tarjeta', 'Camila Soto', 'Cierre diario POS'),
  ('cash-004', '2026-06-18', 'Egreso', 'Transporte y despacho', 'Ruta Oriente y Nunoa', 42000, 'Efectivo', 'Hector Silva', 'Combustible y estacionamientos')
on conflict (id) do nothing;

insert into public.customer_receivables (
  id, invoice_number, customer_name, issue_date, due_date, amount, paid_amount, payment_terms,
  status, contact_name, contact_email, contact_phone, notes
) values
  ('rec-001', 'FAC-1842', 'Clinica Santa Emilia', '2026-06-10', '2026-06-25', 742560, 0, 'Credito 15 dias', 'Por vencer', 'Paula Herrera', 'pagos@santaemilia.cl', '+56 9 4422 1100', 'Enviar respaldo de despacho junto a recordatorio'),
  ('rec-002', 'FAC-1815', 'Cafe Raiz', '2026-05-26', '2026-06-15', 358900, 0, 'Credito 20 dias', 'Vencida', 'Martin Leiva', 'administracion@caferaiz.cl', '+56 9 7718 2030', 'Cliente comprometio pago esta semana'),
  ('rec-003', 'FAC-1850', 'Evento Green Summit', '2026-06-18', '2026-06-21', 1290000, 650000, '50% anticipo, saldo contra entrega', 'Pendiente', 'Antonia Vidal', 'produccion@greensummit.cl', '+56 9 6621 8840', 'Saldo pendiente antes de liberar proximo evento'),
  ('rec-004', 'FAC-1799', 'Retail Saludable Norte', '2026-05-18', '2026-06-02', 214300, 214300, 'Credito 15 dias', 'Pagada', 'Felipe Andrade', 'compras@saludablenorte.cl', '+56 9 3355 7081', 'Pagada por transferencia')
on conflict (id) do nothing;

insert into public.marketing_customers (
  id, customer_id, contact_name, business_name, business_type, active, last_purchase, commune,
  payment_status, purchased_products, marketing_consent, consent_date, authorized_channels,
  unsubscribed, portal_url
) values
  ('mcli-001', 'cli-001', 'Paula Herrera', 'Clinica Santa Emilia', 'Clinica', true, '2026-06-18', 'Providencia', 'Al dia', array['Lasagna vegana individual','Focaccia integral'], true, '2026-05-15', array['Email marketing','WhatsApp Business'], false, 'https://portal.almafood.cl/pedido/clinica-santa-emilia'),
  ('mcli-002', 'cli-002', 'Martin Leiva', 'Cafe Raiz', 'Cafe', true, '2026-05-08', 'Nunoa', 'Al dia', array['Bowl thai tofu','Salsa de tomate base'], true, '2026-04-20', array['WhatsApp Business'], false, 'https://portal.almafood.cl/pedido/cafe-raiz'),
  ('mcli-003', 'cli-003', 'Antonia Vidal', 'Evento Green Summit', 'Eventos', true, null, 'Las Condes', 'Prospecto', array[]::text[], true, '2026-06-01', array['Email marketing'], false, 'https://portal.almafood.cl/pedido/green-summit')
on conflict (id) do nothing;

insert into public.campaign_templates (id, name, channel, subject, body, featured_products) values
  ('tpl-001', 'Reposición semanal mayorista', 'Email marketing', 'Hola {{nombre_cliente}}, arma tu pedido semanal Alma Food', 'Hola {{nombre_cliente}}, tenemos disponibilidad para {{nombre_negocio}}. Productos destacados: {{productos_destacados}}. Próximo despacho: {{fecha_despacho}}. Haz tu pedido aquí: {{link_portal}}', array['Lasagna vegana individual','Bowl thai tofu','Focaccia integral']),
  ('tpl-002', 'WhatsApp recompra 30 dias', 'WhatsApp Business', null, 'Hola {{nombre_cliente}}, soy Alma Food. Vimos que {{nombre_negocio}} no compra hace un tiempo. Tenemos {{productos_destacados}} para despacho {{fecha_despacho}}. Pedido: {{link_portal}}', array['Bowl thai tofu','Salsa de tomate base'])
on conflict (id) do nothing;

insert into public.marketing_campaigns (id, name, channel, status, segment_name, template_id, scheduled_at) values
  ('camp-001', 'Reactivación clientes 30 días', 'WhatsApp Business', 'Programada', 'Clientes sin compra en 30 días', 'tpl-002', '2026-06-21T09:00:00'),
  ('camp-002', 'Pedido semanal B2B', 'Email marketing', 'Borrador', 'Clientes activos', 'tpl-001', null)
on conflict (id) do nothing;

insert into public.campaign_deliveries (
  id, campaign_id, marketing_customer_id, customer_name, business_name, channel, status, last_event_at
) values
  ('del-001', 'camp-001', 'mcli-002', 'Martin Leiva', 'Cafe Raiz', 'WhatsApp Business', 'respondido', '2026-06-20T12:15:00'),
  ('del-002', 'camp-002', 'mcli-001', 'Paula Herrera', 'Clinica Santa Emilia', 'Email marketing', 'abierto/clic', '2026-06-20T12:30:00')
on conflict (id) do nothing;

-- Arquitectura central Alma Food 2026.
-- Estas tablas amplian la demo sin borrar informacion existente. Permiten conectar
-- Portal Mayorista, pagos, caja, cobranza, produccion, ADT, inventario y despacho.

alter table public.orders add column if not exists payment_status text default 'Pendiente';
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists subtotal numeric not null default 0;
alter table public.orders add column if not exists tax numeric not null default 0;
alter table public.orders add column if not exists total numeric not null default 0;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists approved_credit boolean not null default false;
alter table public.orders add column if not exists source_portal text not null default 'Admin';

create table if not exists public.payments (
  id text primary key,
  order_id text references public.orders(id),
  customer_id text references public.customers(id),
  amount numeric not null check (amount >= 0),
  currency text not null default 'CLP',
  method text not null,
  provider text not null,
  provider_transaction_id text not null,
  status text not null check (status in ('Pendiente', 'Aprobado', 'Rechazado', 'Anulado')),
  paid_at timestamptz,
  cash_entry_id text references public.cash_entries(id),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_transaction_id)
);

create table if not exists public.payment_webhook_events (
  id text primary key,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payment_id text references public.payments(id),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.credit_rules (
  id text primary key,
  name text not null,
  max_days integer not null default 15,
  default_credit_limit numeric not null default 0,
  block_if_overdue boolean not null default true,
  block_if_over_limit boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_credit_limits (
  id text primary key,
  customer_id text not null references public.customers(id),
  credit_limit numeric not null default 0,
  current_debt numeric not null default 0,
  blocked boolean not null default false,
  block_reason text,
  payment_terms text not null default 'Credito 15 dias',
  updated_at timestamptz not null default now(),
  unique (customer_id)
);

create table if not exists public.stock_reservations (
  id text primary key,
  order_id text references public.orders(id),
  product_id text not null,
  product_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  warehouse_location text,
  status text not null check (status in ('Reservado', 'Liberado', 'Consumido', 'Cancelado')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_products (
  id text primary key,
  supplier_id text not null,
  supplier_name text not null,
  product_id text,
  product_name text not null,
  unit text not null,
  current_price numeric not null default 0,
  minimum_order text,
  lead_time text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_price_history (
  id text primary key,
  supplier_product_id text references public.supplier_products(id) on delete cascade,
  product_name text not null,
  supplier_name text not null,
  price numeric not null default 0,
  valid_from date not null default current_date,
  source text not null default 'Manual',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_requests (
  id text primary key,
  requested_at timestamptz not null default now(),
  requested_by text not null,
  product_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  reason text not null,
  status text not null check (status in ('Sugerida', 'Solicitada', 'Aprobada', 'Rechazada', 'Convertida en OC')),
  related_order_id text references public.orders(id),
  notes text
);

create table if not exists public.purchase_orders (
  id text primary key,
  code text not null unique,
  supplier_name text not null,
  status text not null check (status in ('Borrador', 'Enviada', 'Parcial', 'Recibida', 'Anulada')),
  total numeric not null default 0,
  expected_date date,
  payment_terms text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_receipts (
  id text primary key,
  purchase_order_id text references public.purchase_orders(id),
  received_at timestamptz not null default now(),
  product_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  unit_cost numeric not null default 0,
  batch text,
  expiration date,
  inventory_movement_id text references public.inventory_movements(id),
  payable_id text references public.customer_receivables(id),
  received_by text not null
);

create table if not exists public.task_reports (
  id text primary key,
  task_id text references public.adt_tasks(id),
  operator_name text not null,
  area text not null,
  report_date date not null default current_date,
  planned_quantity numeric not null default 0,
  actual_quantity numeric not null default 0,
  planned_start time,
  planned_end time,
  real_start time,
  real_end time,
  completion_percent numeric not null default 0,
  evidence_required boolean not null default true,
  evidence_url text,
  non_compliance_reason text,
  observations text,
  validation_status text not null check (
    validation_status in ('Pendiente de revision', 'Aprobada', 'Rechazada', 'Requiere correccion')
  ) default 'Pendiente de revision',
  created_at timestamptz not null default now()
);

create table if not exists public.task_validations (
  id text primary key,
  task_report_id text not null references public.task_reports(id) on delete cascade,
  supervisor_name text not null,
  status text not null check (status in ('Aprobada', 'Rechazada', 'Requiere correccion')),
  comment text,
  validated_at timestamptz not null default now()
);

create table if not exists public.task_evidence_files (
  id text primary key,
  task_report_id text references public.task_reports(id) on delete cascade,
  file_url text not null,
  file_type text not null check (file_type in ('Foto', 'Video', 'Documento')),
  uploaded_by text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.warehouse_locations (
  id text primary key,
  warehouse text not null,
  aisle text,
  shelf text,
  bin text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cleaning_reports (
  id text primary key,
  cleaning_task_id text,
  task_date date not null,
  area text not null,
  responsible text not null,
  before_photo_url text,
  after_photo_url text,
  observations text,
  validation_status text not null default 'Pendiente de revision',
  created_at timestamptz not null default now()
);

create table if not exists public.machine_failures (
  id text primary key,
  machine_id text,
  machine_name text not null,
  area text not null,
  severity text not null check (severity in ('Baja', 'Media', 'Alta', 'Critica')),
  description text not null,
  photo_url text,
  status text not null check (status in ('Reportada', 'En revision', 'Resuelta')),
  reported_by text not null,
  reported_at timestamptz not null default now()
);

create table if not exists public.maintenance_events (
  id text primary key,
  machine_id text,
  machine_name text not null,
  provider_name text,
  event_type text not null check (event_type in ('Preventiva', 'Correctiva')),
  scheduled_date date not null,
  completed_date date,
  cost numeric not null default 0,
  parts_used text,
  status text not null check (status in ('Programada', 'En proceso', 'Realizada', 'Atrasada')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  actor_id text,
  actor_name text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.balance_snapshots (
  id text primary key,
  period_month text not null unique,
  sales_net numeric not null default 0,
  production_cost numeric not null default 0,
  gross_margin numeric not null default 0,
  operating_expenses numeric not null default 0,
  accounts_receivable numeric not null default 0,
  accounts_payable numeric not null default 0,
  cash_flow numeric not null default 0,
  profit_loss numeric not null default 0,
  source text not null default 'Sistema',
  created_at timestamptz not null default now()
);

create table if not exists public.business_settings (
  id text primary key,
  setting_group text not null,
  name text not null,
  value jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (setting_group, name)
);

insert into public.credit_rules (
  id, name, max_days, default_credit_limit, block_if_overdue, block_if_over_limit
) values (
  'credit-rule-001', 'Credito mayorista base', 15, 500000, true, true
) on conflict (id) do nothing;

insert into public.warehouse_locations (id, warehouse, aisle, shelf, bin, description) values
  ('loc-001', 'Bodega seca', 'A', '01', 'A01-01', 'Harinas, envases y secos de alta rotacion'),
  ('loc-002', 'Camara refrigerada', 'R', '02', 'R02-03', 'Tofu, preelaboraciones y salsas base'),
  ('loc-003', 'Zona despacho', 'D', '01', 'D01-Armado', 'Pedidos listos por cliente y ruta')
on conflict (id) do nothing;
