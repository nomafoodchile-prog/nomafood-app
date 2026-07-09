-- ════════════════════════════════════════════════════════════════════
--  DEMO Portal Operario — tareas de ejemplo (es_demo = true)
--  Se borran con portal-operario-demo-limpiar.sql
-- ════════════════════════════════════════════════════════════════════
insert into public.op_tareas
  (operario_id, fecha, tipo, prioridad, area, titulo, cantidad_asignada, unidad, tiempo_estimado_min, hora_programada, instrucciones, es_demo)
select p.id, current_date, t.tipo, t.prioridad, t.area, t.titulo, t.cant, t.unidad, t.mins, t.hora::time, t.instr, true
from public.profiles p,
(values
  ('produccion',    'alta',  'Cocina caliente', 'Salsa bolonesa veg',      40::numeric, 'kg',  90, '09:00', 'Seguir receta v3 aprobada. Controlar temperatura >= 75C.'),
  ('preelaboracion','media', 'Cocina caliente', 'Preelaboracion sofrito',   8::numeric, 'kg',  30, '11:00', 'Cortar y sofreir. Registrar merma al cierre.'),
  ('limpieza',      'media', 'Cocina',          'Limpieza meson acero',  null::numeric, null,  20, '13:30', 'Retirar residuos, detergente, enjuagar, sanitizar, secar.'),
  ('orden',         'baja',  'Camara fria',     'Orden de camara fria',  null::numeric, null,  15, '14:00', 'Ordenar por FEFO y revisar temperaturas.')
) as t(tipo, prioridad, area, titulo, cant, unidad, mins, hora, instr)
where p.email = 'pruebaoperario@nommafood.cl';
