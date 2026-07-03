-- ════════════════════════════════════════════════════════════════════
--  NOMMA FOOD — SISTEMA DE LOGÍSTICA · MIGRACIÓN FASE 0 (FUNDACIÓN)
--  Ejecutar en Supabase SQL Editor (proyecto nomafood-produccion).
--  Idempotente: se puede correr más de una vez sin romper nada.
--  No borra ni modifica datos existentes (mayoristas, pedidos, products).
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ────────────────────────────────────────────────────────────────────
--  1. ROLES Y ENUMS
-- ────────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum (
      'SuperAdmin','Gerencia','Administracion','EncargadoProduccion',
      'Operario','Armado','Chofer'
    );
  end if;
end $$;
alter type app_role add value if not exists 'SuperAdmin';

do $$ begin
  if not exists (select 1 from pg_type where typname = 'driver_shift_estado') then
    create type driver_shift_estado as enum ('disponible','en_ruta','comprando','finalizado');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'incidencia_tipo') then
    create type incidencia_tipo as enum (
      'cliente_ausente','cliente_rechaza','direccion_incorrecta','producto_danado',
      'vehiculo_averiado','problema_transito','no_entregado','otro'
    );
  end if;
end $$;

-- Trigger util: updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ────────────────────────────────────────────────────────────────────
--  2. PERFILES (identidad + rol) — ligado a Supabase Auth
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       app_role not null default 'Chofer',
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crea perfil automáticamente al registrarse un usuario nuevo
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: crea perfil para usuarios que ya existen (rol por defecto: Chofer)
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
on conflict (id) do nothing;

-- Helpers de permisos
create or replace function public.get_my_role()
returns app_role as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function public.is_admin()
returns boolean as $$
  select public.get_my_role() in ('SuperAdmin','Gerencia','Administracion')
$$ language sql security definer stable;

create or replace function public.is_super_admin()
returns boolean as $$
  select public.get_my_role() = 'SuperAdmin'
$$ language sql security definer stable;

-- ────────────────────────────────────────────────────────────────────
--  3. FLOTA — bodegas, vehículos, choferes
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.warehouses (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  direccion  text,
  lat        numeric(10,7),
  lng        numeric(10,7),
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  patente      text unique not null,
  tipo         text,
  warehouse_id uuid references public.warehouses(id),
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.drivers (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid unique not null references public.profiles(id) on delete cascade,
  nombre       text not null,
  telefono     text,
  licencia     text,
  warehouse_id uuid references public.warehouses(id),
  vehicle_id   uuid references public.vehicles(id),
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_drivers_profile on public.drivers(profile_id);
create index if not exists idx_drivers_warehouse on public.drivers(warehouse_id);

-- Devuelve el driver.id del usuario logueado (clave para el aislamiento por chofer)
create or replace function public.get_my_driver_id()
returns uuid as $$
  select id from public.drivers where profile_id = auth.uid()
$$ language sql security definer stable;

-- ────────────────────────────────────────────────────────────────────
--  4. JORNADA Y RUTAS
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.driver_shifts (
  id               uuid primary key default gen_random_uuid(),
  driver_id        uuid not null references public.drivers(id),
  fecha            date not null default current_date,
  estado           driver_shift_estado not null default 'disponible',
  hora_ingreso     timestamptz,
  hora_salida      timestamptz,
  tiempo_trabajado interval,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_shifts_driver_fecha on public.driver_shifts(driver_id, fecha);

create table if not exists public.routes (
  id              uuid primary key default gen_random_uuid(),
  driver_id       uuid not null references public.drivers(id),
  vehicle_id      uuid references public.vehicles(id),
  warehouse_id    uuid references public.warehouses(id),
  shift_id        uuid references public.driver_shifts(id),
  fecha           date not null default current_date,
  estado          text not null default 'planificada'
                    check (estado in ('planificada','en_ruta','finalizada')),
  hora_inicio     timestamptz,
  hora_fin        timestamptz,
  km_recorridos   numeric(10,2) default 0,
  tiempo_total    interval,
  tiempo_detenido interval,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_routes_driver_fecha on public.routes(driver_id, fecha);

create table if not exists public.route_stops (
  id            uuid primary key default gen_random_uuid(),
  route_id      uuid not null references public.routes(id) on delete cascade,
  pedido_id     uuid,
  orden         int not null,
  eta           timestamptz,
  hora_llegada  timestamptz,
  hora_salida   timestamptz,
  distancia_km  numeric(10,2),
  estado        text not null default 'pendiente'
                  check (estado in ('pendiente','en_camino','entregado','incidencia')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_stops_route on public.route_stops(route_id, orden);

-- ────────────────────────────────────────────────────────────────────
--  5. PEDIDOS — ampliar mayorista_pedidos + auditoría de estados
-- ────────────────────────────────────────────────────────────────────
alter table public.mayorista_pedidos add column if not exists chofer_id uuid references public.drivers(id);
alter table public.mayorista_pedidos add column if not exists route_id uuid references public.routes(id);
alter table public.mayorista_pedidos add column if not exists warehouse_id uuid references public.warehouses(id);
alter table public.mayorista_pedidos add column if not exists lat numeric(10,7);
alter table public.mayorista_pedidos add column if not exists lng numeric(10,7);
alter table public.mayorista_pedidos add column if not exists telefono_entrega text;
alter table public.mayorista_pedidos add column if not exists hora_programada timestamptz;
alter table public.mayorista_pedidos add column if not exists estado_updated_at timestamptz;
create index if not exists idx_pedidos_chofer on public.mayorista_pedidos(chofer_id);
create index if not exists idx_pedidos_estado on public.mayorista_pedidos(estado);

create table if not exists public.pedido_estado_historial (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.mayorista_pedidos(id) on delete cascade,
  estado_anterior text,
  estado_nuevo    text not null,
  changed_by      uuid references public.profiles(id),
  origen          text,
  lat             numeric(10,7),
  lng             numeric(10,7),
  created_at      timestamptz not null default now()
);
create index if not exists idx_hist_pedido on public.pedido_estado_historial(pedido_id, created_at);

-- ────────────────────────────────────────────────────────────────────
--  6. ENTREGAS (comprobante obligatorio) + INCIDENCIAS
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.entregas (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.mayorista_pedidos(id),
  route_stop_id  uuid references public.route_stops(id),
  driver_id      uuid not null references public.drivers(id),
  receptor_nombre text not null,
  observaciones  text,
  foto_url       text not null,          -- respaldo obligatorio
  firma_url      text,
  lat            numeric(10,7),
  lng            numeric(10,7),
  entregado_at   timestamptz not null default now()
);
create index if not exists idx_entregas_pedido on public.entregas(pedido_id);

create table if not exists public.incidencias (
  id                uuid primary key default gen_random_uuid(),
  pedido_id         uuid references public.mayorista_pedidos(id),
  driver_id         uuid not null references public.drivers(id),
  tipo              incidencia_tipo not null,
  comentario        text,
  foto_url          text,
  lat               numeric(10,7),
  lng               numeric(10,7),
  estado_resolucion text not null default 'abierta'
                      check (estado_resolucion in ('abierta','en_revision','resuelta')),
  resolved_by       uuid references public.profiles(id),
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_incidencias_driver on public.incidencias(driver_id, created_at);

-- ────────────────────────────────────────────────────────────────────
--  7. GPS — histórico (alta frecuencia) + posición actual (lectura rápida)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.location_pings (
  id          bigint generated always as identity primary key,
  driver_id   uuid not null references public.drivers(id),
  route_id    uuid references public.routes(id),
  lat         numeric(10,7) not null,
  lng         numeric(10,7) not null,
  velocidad   numeric(6,2),
  heading     numeric(6,2),
  accuracy    numeric(8,2),
  created_at  timestamptz not null default now()
);
create index if not exists idx_pings_driver_time on public.location_pings(driver_id, created_at desc);
create index if not exists idx_pings_route on public.location_pings(route_id);

create table if not exists public.driver_positions (
  driver_id  uuid primary key references public.drivers(id) on delete cascade,
  route_id   uuid references public.routes(id),
  lat        numeric(10,7) not null,
  lng        numeric(10,7) not null,
  velocidad  numeric(6,2),
  heading    numeric(6,2),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────
--  8. COMPRAS (asignadas al chofer) + comprobantes + sin factura
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.compras (
  id               uuid primary key default gen_random_uuid(),
  numero           text unique default 'CMP-' || to_char(now(),'YYYYMMDD') || '-' || floor(random()*9000+1000)::text,
  driver_id        uuid references public.drivers(id),
  proveedor        text,
  direccion        text,
  lat              numeric(10,7),
  lng              numeric(10,7),
  telefono         text,
  contacto         text,
  horario_atencion text,
  forma_pago       text,
  monto_autorizado numeric(12,2),
  estado           text not null default 'asignada'
                     check (estado in ('asignada','en_compra','finalizada','cancelada')),
  observaciones    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_compras_driver on public.compras(driver_id);

create table if not exists public.compra_items (
  id        uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  producto  text not null,
  cantidad  numeric(12,3),
  unidad    text,
  observaciones text
);

create table if not exists public.compra_comprobantes (
  id         uuid primary key default gen_random_uuid(),
  compra_id  uuid not null references public.compras(id) on delete cascade,
  tipo       text not null check (tipo in ('boleta','factura')),
  foto_url   text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.compras_sin_factura (
  id             uuid primary key default gen_random_uuid(),
  driver_id      uuid references public.drivers(id),
  compra_id      uuid references public.compras(id),
  producto       text not null,
  proveedor      text,
  cantidad       numeric(12,3),
  unidad         text,
  precio_unitario numeric(12,2),
  precio_total   numeric(12,2),
  observaciones  text,
  lat            numeric(10,7),
  lng            numeric(10,7),
  registrado_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────
--  9. MÉTRICAS DE JORNADA (KPIs históricos)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.jornada_resumen (
  id                      uuid primary key default gen_random_uuid(),
  driver_id               uuid not null references public.drivers(id),
  route_id                uuid references public.routes(id),
  fecha                   date not null,
  tiempo_total            interval,
  tiempo_detenido         interval,
  km_recorridos           numeric(10,2),
  entregas_completadas    int default 0,
  entregas_pendientes     int default 0,
  incidencias             int default 0,
  tiempo_promedio_entrega interval,
  created_at              timestamptz not null default now()
);
create index if not exists idx_resumen_driver on public.jornada_resumen(driver_id, fecha);

-- ────────────────────────────────────────────────────────────────────
--  10. COMUNICACIÓN — mensajes al chofer + cola de notificaciones
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.driver_messages (
  id         uuid primary key default gen_random_uuid(),
  driver_id  uuid not null references public.drivers(id),
  tipo       text not null default 'sistema' check (tipo in ('sistema','alerta','motivacional','chat')),
  texto      text not null,
  contexto   jsonb,
  leido      boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_msg_driver on public.driver_messages(driver_id, created_at desc);

create table if not exists public.notifications_outbox (
  id         uuid primary key default gen_random_uuid(),
  canal      text not null check (canal in ('whatsapp','email','push')),
  destino    text not null,
  plantilla  text,
  payload    jsonb,
  estado     text not null default 'pendiente' check (estado in ('pendiente','enviado','error')),
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
create index if not exists idx_outbox_estado on public.notifications_outbox(estado);

-- ────────────────────────────────────────────────────────────────────
--  11. TRIGGERS updated_at
-- ────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles','drivers','driver_shifts','routes','compras'] loop
    execute format('drop trigger if exists tr_%s_upd on public.%s', t, t);
    execute format('create trigger tr_%s_upd before update on public.%s for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────
--  12. RLS — aislamiento por chofer, admin lee, superadmin todo
-- ────────────────────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.drivers             enable row level security;
alter table public.driver_shifts       enable row level security;
alter table public.routes              enable row level security;
alter table public.route_stops         enable row level security;
alter table public.pedido_estado_historial enable row level security;
alter table public.entregas            enable row level security;
alter table public.incidencias         enable row level security;
alter table public.location_pings      enable row level security;
alter table public.driver_positions    enable row level security;
alter table public.compras             enable row level security;
alter table public.compra_items        enable row level security;
alter table public.compra_comprobantes enable row level security;
alter table public.compras_sin_factura enable row level security;
alter table public.jornada_resumen     enable row level security;
alter table public.driver_messages     enable row level security;

-- Perfil propio; admins ven todo
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_upd on public.profiles;
create policy profiles_self_upd on public.profiles for update using (id = auth.uid() or public.is_super_admin());

-- Patrón "el chofer ve/edita solo lo suyo; admin lee; superadmin todo"
--   Se aplica a las tablas con driver_id.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'driver_shifts','routes','entregas','incidencias','location_pings',
    'driver_positions','compras','compras_sin_factura','jornada_resumen','driver_messages'
  ] loop
    execute format('drop policy if exists %I_sel on public.%I', tbl, tbl);
    execute format($p$create policy %I_sel on public.%I for select using (
        driver_id = public.get_my_driver_id() or public.is_admin()
    )$p$, tbl, tbl);

    execute format('drop policy if exists %I_ins on public.%I', tbl, tbl);
    execute format($p$create policy %I_ins on public.%I for insert with check (
        driver_id = public.get_my_driver_id() or public.is_super_admin()
    )$p$, tbl, tbl);

    execute format('drop policy if exists %I_upd on public.%I', tbl, tbl);
    execute format($p$create policy %I_upd on public.%I for update using (
        driver_id = public.get_my_driver_id() or public.is_super_admin()
    )$p$, tbl, tbl);
  end loop;
end $$;

-- Choferes: lectura para admins/superadmin; el chofer ve su propio registro
drop policy if exists drivers_sel on public.drivers;
create policy drivers_sel on public.drivers for select using (profile_id = auth.uid() or public.is_admin());
drop policy if exists drivers_admin on public.drivers;
create policy drivers_admin on public.drivers for all using (public.is_super_admin());

-- Historial de estados: chofer ve el de sus pedidos; admin ve todo
drop policy if exists hist_sel on public.pedido_estado_historial;
create policy hist_sel on public.pedido_estado_historial for select using (
  public.is_admin() or exists (
    select 1 from public.mayorista_pedidos p
    where p.id = pedido_id and p.chofer_id = public.get_my_driver_id()
  )
);

-- Sub-tablas de compras (por relación con compras del chofer)
drop policy if exists citems_sel on public.compra_items;
create policy citems_sel on public.compra_items for select using (
  public.is_admin() or exists (select 1 from public.compras c where c.id = compra_id and c.driver_id = public.get_my_driver_id())
);
drop policy if exists crec_sel on public.compra_comprobantes;
create policy crec_sel on public.compra_comprobantes for select using (
  public.is_admin() or exists (select 1 from public.compras c where c.id = compra_id and c.driver_id = public.get_my_driver_id())
);
drop policy if exists cstops_sel on public.route_stops;
create policy cstops_sel on public.route_stops for select using (
  public.is_admin() or exists (select 1 from public.routes r where r.id = route_id and r.driver_id = public.get_my_driver_id())
);

-- ────────────────────────────────────────────────────────────────────
--  13. STORAGE — buckets privados para fotos (entregas, incidencias, boletas)
-- ────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('entregas','entregas',false),
  ('incidencias','incidencias',false),
  ('comprobantes','comprobantes',false)
on conflict (id) do nothing;

-- Suben/leen solo usuarios autenticados (afinamos por carpeta = driver en Fase 1)
drop policy if exists storage_logistica_rw on storage.objects;
create policy storage_logistica_rw on storage.objects for all to authenticated
  using (bucket_id in ('entregas','incidencias','comprobantes'))
  with check (bucket_id in ('entregas','incidencias','comprobantes'));

-- ────────────────────────────────────────────────────────────────────
--  14. TIEMPO REAL — habilitar replicación en las tablas clave
-- ────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['mayorista_pedidos','driver_positions','incidencias','driver_messages','compras'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  FIN FASE 0. Resultado esperado: "Success. No rows returned".
--  Después de correr: asignar rol SuperAdmin a tu usuario admin, ej:
--    update public.profiles set role = 'SuperAdmin' where email = 'admin@nomafood.cl';
-- ════════════════════════════════════════════════════════════════════
