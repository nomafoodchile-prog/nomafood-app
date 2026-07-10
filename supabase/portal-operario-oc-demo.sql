-- ════════════════════════════════════════════════════════════════════
--  DEMO O-C — receta aprobada con pasos + tareas (fecha Chile)
--  Borra la demo previa y la recrea. Limpieza: ver el final.
-- ════════════════════════════════════════════════════════════════════

delete from public.recetas where codigo = 'DEMO-OC';
delete from public.op_tareas where es_demo = true;

-- Receta demo aprobada + 3 pasos
with r as (
  insert into public.recetas (codigo, nombre, tipo_receta, area)
  values ('DEMO-OC', 'Salsa bolonesa veg (demo)', 'producto_terminado', 'Cocina caliente')
  returning id
),
v as (
  insert into public.receta_versiones
    (receta_id, version, estado, rendimiento_cantidad, rendimiento_unidad, tiempo_trabajo_min, vida_util_dias, aprobado_at)
  select id, 1, 'aprobada', 20, 'kg', 90, 5, now() from r
  returning id
)
insert into public.receta_pasos (version_id, numero, instruccion, tiempo_min, control_calidad, registro_operario, orden)
select v.id, p.numero, p.instruccion, p.tiempo, p.control, p.registro, p.numero
from v, (values
  (1, 'Lavar y cortar verduras. Pesar cada ingrediente segun receta.', 15, 'Verduras sin restos ni danos', 'Cantidad pesada (kg)'),
  (2, 'Sofreir la base y agregar el tomate. Cocinar a fuego medio revolviendo.', 40, 'Temperatura >= 75C', 'Temperatura (C)'),
  (3, 'Enfriar, envasar, fechar y etiquetar. Llevar a camara.', 25, 'Sellado y rotulado correcto', 'Lote generado')
) as p(numero, instruccion, tiempo, control, registro);

-- 4 tareas demo; la de produccion linkeada a la receta aprobada
insert into public.op_tareas
  (operario_id, fecha, tipo, prioridad, area, titulo, cantidad_asignada, unidad, tiempo_estimado_min, hora_programada, instrucciones, receta_version_id, es_demo)
select p.id, (now() at time zone 'America/Santiago')::date, t.tipo, t.prioridad, t.area, t.titulo, t.cant, t.unidad, t.mins, t.hora::time, t.instr, t.rv, true
from public.profiles p,
(values
  ('produccion',    'alta',  'Cocina caliente', 'Salsa bolonesa veg',      40::numeric, 'kg',  90, '09:00', 'Seguir la receta aprobada paso a paso.',
     (select rv.id from public.receta_versiones rv join public.recetas r on r.id = rv.receta_id where r.codigo = 'DEMO-OC' limit 1)),
  ('preelaboracion','media', 'Cocina caliente', 'Preelaboracion sofrito',   8::numeric, 'kg',  30, '11:00', 'Cortar y sofreir. Registrar merma al cierre.', null::uuid),
  ('limpieza',      'media', 'Cocina',          'Limpieza meson acero',  null::numeric, null,  20, '13:30', 'Retirar residuos, detergente, enjuagar, sanitizar, secar.', null::uuid),
  ('orden',         'baja',  'Camara fria',     'Orden de camara fria',  null::numeric, null,  15, '14:00', 'Ordenar por FEFO y revisar temperaturas.', null::uuid)
) as t(tipo, prioridad, area, titulo, cant, unidad, mins, hora, instr, rv)
where p.email = 'pruebaoperario@nommafood.cl';

select t.titulo, t.tipo, (t.receta_version_id is not null) as tiene_receta, t.fecha
from public.op_tareas where es_demo order by hora_programada;

-- ── LIMPIEZA (cuando termines de probar): ───────────────────────────
-- delete from public.recetas where codigo = 'DEMO-OC';
-- delete from public.op_tareas where es_demo = true;
