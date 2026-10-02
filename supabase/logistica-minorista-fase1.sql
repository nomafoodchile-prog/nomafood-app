-- ════════════════════════════════════════════════════════════════════
--  NOMMA / BROTES — RUTAS DE DESPACHO MINORISTA · FASE 1
--  Agrega ruteo de última milla a los pedidos de la web (retail).
--
--  SEGURO: solo AGREGA columnas/tablas (nada se borra ni se modifica).
--  IDEMPOTENTE: se puede correr varias veces sin romper nada.
--  Reutiliza lo que ya existe: enum public.estado_entrega, tabla
--  public.drivers, helpers is_admin()/is_super_admin()/get_my_driver_id().
--  Requiere las fases de logística mayorista ya aplicadas (Fase 0/1/2A).
-- ════════════════════════════════════════════════════════════════════

-- ── 1) Campos de geocodificación + despacho en los pedidos minorista ──
alter table public.minorista_pedidos add column if not exists lat numeric;
alter table public.minorista_pedidos add column if not exists lng numeric;
-- geo_status: null (sin geocodificar) | 'ok' | 'revisar' | 'corregida'
alter table public.minorista_pedidos add column if not exists geo_status text;
-- dirección realmente usada para ubicar en el mapa (puede diferir de la original)
alter table public.minorista_pedidos add column if not exists dir_normalizada text;
-- trazabilidad de corrección manual de dirección (punto 2 del requerimiento)
alter table public.minorista_pedidos add column if not exists geo_corregido_por uuid references auth.users(id);
alter table public.minorista_pedidos add column if not exists geo_corregido_at timestamptz;
-- vínculo con la ruta y el chofer (estado de DESPACHO, separado del estado comercial)
alter table public.minorista_pedidos add column if not exists route_id uuid;
alter table public.minorista_pedidos add column if not exists chofer_id uuid references public.drivers(id);
-- reutiliza el MISMO enum de la pista del chofer que ya usa mayorista
alter table public.minorista_pedidos add column if not exists estado_entrega public.estado_entrega not null default 'pendiente';

create index if not exists idx_min_pedidos_route on public.minorista_pedidos(route_id);
create index if not exists idx_min_pedidos_estado_entrega on public.minorista_pedidos(estado_entrega);

-- ── 2) Tabla de RUTAS de despacho (cabecera) ─────────────────────────
create table if not exists public.delivery_routes (
  id                    uuid primary key default gen_random_uuid(),
  codigo                text unique,                 -- R-2026-10-02-01
  fecha                 date not null default current_date,
  marca                 text,                        -- informativo (Brotes / NOMMA / mixta)
  warehouse_id          uuid references public.warehouses(id),
  origen_nombre         text,
  origen_lat            numeric,
  origen_lng            numeric,
  chofer_id             uuid references public.drivers(id),
  vehiculo              text,                        -- opcional (preparado para multi-vehículo)
  hora_salida_plan      timestamptz,
  km_estimados          numeric,
  duracion_min_estimada int,
  service_min_parada    int default 8,               -- tiempo por entrega (configurable)
  estado                text not null default 'planificada', -- planificada|asignada|en_ruta|finalizada|cancelada
  provider              text default 'osrm',         -- motor de ruteo usado (desacoplado)
  creado_por            uuid references auth.users(id),
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ── 3) PARADAS de la ruta (ordenadas, con ETA por cliente) ───────────
--  Referencia genérica al pedido (preparada para absorber mayorista a
--  futuro); en esta fase se usa solo 'minorista'.
create table if not exists public.delivery_route_stops (
  id                   uuid primary key default gen_random_uuid(),
  route_id             uuid not null references public.delivery_routes(id) on delete cascade,
  orden                int  not null,
  order_tipo           text not null default 'minorista',   -- 'minorista' | 'mayorista'
  minorista_pedido_id  uuid references public.minorista_pedidos(id) on delete cascade,
  cliente_nombre       text,
  direccion            text,
  comuna               text,
  telefono             text,
  lat                  numeric,
  lng                  numeric,
  eta                  timestamptz,         -- hora estimada de llegada
  hora_llegada_real    timestamptz,
  hora_entrega_real    timestamptz,
  estado_entrega       public.estado_entrega not null default 'pendiente',
  observaciones        text,
  -- ventana horaria (preparado; aún no se usa en el optimizador)
  ventana_inicio       time,
  ventana_fin          time,
  created_at           timestamptz default now()
);
create index if not exists idx_route_stops_route on public.delivery_route_stops(route_id, orden);
create index if not exists idx_route_stops_pedido on public.delivery_route_stops(minorista_pedido_id);

-- ── 4) FK de minorista_pedidos.route_id → delivery_routes (idempotente) ──
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'minorista_pedidos_route_fk') then
    alter table public.minorista_pedidos
      add constraint minorista_pedidos_route_fk
      foreign key (route_id) references public.delivery_routes(id) on delete set null;
  end if;
end $$;

-- ── 5) Configuración (sin hardcodear): tiempo por parada, salida, origen ──
--  Ajusta estos valores a tu bodega real desde Gerencia cuando quieras.
insert into public.app_config (clave, valor)
select v.clave, v.valor from (values
  ('despacho_service_min',   '8'),
  ('despacho_hora_salida',   '10:00'),
  ('despacho_origen_nombre', 'Centro de despacho'),
  ('despacho_origen_lat',    '-33.4015'),
  ('despacho_origen_lng',    '-70.7260')
) as v(clave, valor)
where not exists (select 1 from public.app_config a where a.clave = v.clave);

-- ── 6) RLS: la Central escribe vía service-role (bypassa RLS). El chofer
--  solo puede VER su propia ruta y sus paradas (privacidad de clientes). ──
alter table public.delivery_routes       enable row level security;
alter table public.delivery_route_stops  enable row level security;

drop policy if exists routes_admin_all on public.delivery_routes;
create policy routes_admin_all on public.delivery_routes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists routes_chofer_sel on public.delivery_routes;
create policy routes_chofer_sel on public.delivery_routes
  for select using (chofer_id = public.get_my_driver_id());

drop policy if exists stops_admin_all on public.delivery_route_stops;
create policy stops_admin_all on public.delivery_route_stops
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists stops_chofer_sel on public.delivery_route_stops;
create policy stops_chofer_sel on public.delivery_route_stops
  for select using (
    exists (select 1 from public.delivery_routes r
            where r.id = delivery_route_stops.route_id
              and r.chofer_id = public.get_my_driver_id())
  );

-- FIN FASE 1 MINORISTA. Esperado: "Success. No rows returned".
