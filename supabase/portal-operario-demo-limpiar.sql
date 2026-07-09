-- ════════════════════════════════════════════════════════════════════
--  DEMO Portal Operario — borrar TODO lo de prueba
--  Borra tareas demo (y en cascada sus eventos y cierres).
-- ════════════════════════════════════════════════════════════════════
delete from public.op_tareas where es_demo = true;

-- Opcional: limpiar las jornadas de prueba del operario demo
-- delete from public.op_jornadas j using public.profiles p
--   where j.operario_id = p.id and p.email = 'pruebaoperario@nommafood.cl';
