-- ============================================================================
-- MIGRACIÓN 0002 — Limpieza esquema muerto, Parte 2 (Fase 0 · SaaS)
-- ============================================================================
-- Elimina las 4 tablas que usaban los PORTALES VIEJOS POR TOKEN
-- (/portal/{chofer,operario,picker}/[token]), ya retirados del código en este
-- mismo commit. Esos portales fueron reemplazados por los nuevos con LOGIN
-- (/chofer/login, /operario/login, /picker/login).
--
-- Verificado: las 4 tablas tienen 0 filas y ya NO se referencian en el código.
-- Ejecutar DESPUÉS de desplegar el retiro de los portales viejos.
-- Idempotente (IF EXISTS). Recomendado: copia de prueba primero, luego prod.
-- ============================================================================

begin;

drop table if exists public.task_reports   cascade;  -- reportes del portal operario viejo
drop table if exists public.adt_tasks       cascade;  -- tareas del portal operario viejo
drop table if exists public.picking_tasks   cascade;  -- picking del portal picker viejo
drop table if exists public.operators       cascade;  -- trabajadores del esquema viejo (vive: operarios)

commit;

-- Con esto el esquema en inglés queda totalmente eliminado (28 tablas en total).
-- Para VERIFICAR (no confiar en la caché de PostgREST), correr:
--   select coalesce(string_agg(table_name,', '),'✅ NINGUNA') from information_schema.tables
--   where table_schema='public' and table_name in
--     ('operators','adt_tasks','picking_tasks','task_reports');
