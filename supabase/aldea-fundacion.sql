-- ============================================================================
-- FUNDACIÓN ALDEA VEGETAL — estructura corporativa multi-sucursal
-- 100% ADITIVO: no modifica ni toca a los mayoristas normales
-- (organizacion_id queda NULL para todos los clientes existentes)
-- ============================================================================

-- 1) Organizaciones (clientes corporativos tipo "cadena interna")
create table if not exists public.organizaciones (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  tipo       text not null default 'cadena_interna',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.organizaciones enable row level security;

-- 2) Cada sucursal/local es un mayorista agrupado bajo una organización.
--    Los mayoristas normales quedan con organizacion_id = NULL → sin cambios.
alter table public.mayoristas add column if not exists organizacion_id uuid references public.organizaciones(id);
alter table public.mayoristas add column if not exists es_sucursal boolean not null default false;

-- 3) Usuarios de una organización (permite VARIOS usuarios por cuenta).
--    rol: 'admin_general' (ve todas las sucursales) | 'encargado_local' (solo la suya)
--    mayorista_id NULL  => admin general (toda la organización)
create table if not exists public.mayorista_usuarios (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  mayorista_id    uuid references public.mayoristas(id) on delete cascade,
  rol             text not null default 'encargado_local',
  activo          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_may_usuarios_profile on public.mayorista_usuarios(profile_id);
create index if not exists idx_mayoristas_org on public.mayoristas(organizacion_id);
alter table public.mayorista_usuarios enable row level security;

-- 4) SEED: organización Aldea Vegetal + 3 sucursales (nombres de ejemplo, editables luego)
insert into public.organizaciones (nombre, tipo)
select 'Aldea Vegetal', 'cadena_interna'
where not exists (select 1 from public.organizaciones where nombre = 'Aldea Vegetal');

with org as (select id from public.organizaciones where nombre = 'Aldea Vegetal' limit 1)
insert into public.mayoristas (nombre, empresa, organizacion_id, es_sucursal, activo)
select s.nom, 'Aldea Vegetal', org.id, true, true
from org
cross join (values
  ('Aldea Vegetal · Campus 1'),
  ('Aldea Vegetal · Campus 2'),
  ('Aldea Vegetal · Campus 3')
) as s(nom)
where not exists (
  select 1 from public.mayoristas m
  where m.empresa = 'Aldea Vegetal' and m.es_sucursal = true and m.nombre = s.nom
);

-- 5) (OPCIONAL) Vincular un usuario ADMIN GENERAL para probar el login.
--    El usuario debe existir ya en Autenticación. Reemplaza el correo.
--    Descomenta y corre este bloque cuando tengas el correo del admin:
--
-- with org as (select id from public.organizaciones where nombre='Aldea Vegetal' limit 1),
--      u   as (select id from public.profiles where email = lower('CORREO_ADMIN@ejemplo.cl') limit 1)
-- insert into public.mayorista_usuarios (profile_id, organizacion_id, mayorista_id, rol)
-- select u.id, org.id, null, 'admin_general'
-- from u, org
-- where u.id is not null
--   and not exists (
--     select 1 from public.mayorista_usuarios mu
--     where mu.profile_id = u.id and mu.organizacion_id = org.id and mu.mayorista_id is null
--   );
