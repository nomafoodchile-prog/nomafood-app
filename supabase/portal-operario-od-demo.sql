-- ════════════════════════════════════════════════════════════════════
--  DEMO O-D — turnos + asistencia del mes actual para pruebaoperario
--  Genera lun-vie con algunos atrasos, una falta y una justificada.
--  Limpieza al final.
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  v_op uuid;
  v_dia date;
  v_ini date := date_trunc('month', (now() at time zone 'America/Santiago')::date)::date;
  v_hoy date := (now() at time zone 'America/Santiago')::date;
  v_dow int;
  v_estado text;
  v_atraso int;
begin
  select id into v_op from public.profiles where email = 'pruebaoperario@nommafood.cl';
  if v_op is null then raise notice 'No existe pruebaoperario'; return; end if;

  delete from public.op_turnos where operario_id = v_op and fecha >= v_ini;
  delete from public.op_asistencia where operario_id = v_op and fecha >= v_ini;

  v_dia := v_ini;
  while v_dia <= v_hoy loop
    v_dow := extract(dow from v_dia); -- 0=dom .. 6=sab
    if v_dow between 1 and 5 then
      -- turno lun-vie 08:00-17:00
      insert into public.op_turnos (operario_id, fecha, turno_nombre, entrada_esperada, salida_esperada)
      values (v_op, v_dia, 'Mañana', '08:00', '17:00');

      -- asistencia con variedad
      v_estado := 'asistio'; v_atraso := 0;
      if extract(day from v_dia)::int % 7 = 3 then v_estado := 'atraso'; v_atraso := 12; end if;
      if extract(day from v_dia)::int % 11 = 4 then v_estado := 'injustificada'; end if;
      if extract(day from v_dia)::int % 13 = 6 then v_estado := 'justificada'; end if;

      insert into public.op_asistencia
        (operario_id, fecha, estado, entrada_esperada, salida_esperada, entrada_real, salida_real, atraso_min, justificacion, fuente)
      values (
        v_op, v_dia, v_estado, '08:00', '17:00',
        case when v_estado in ('asistio','atraso') then (v_dia + time '08:00' + (v_atraso || ' minutes')::interval) else null end,
        case when v_estado in ('asistio','atraso') then (v_dia + time '17:00') else null end,
        v_atraso,
        case when v_estado = 'justificada' then 'Permiso médico presentado' else null end,
        'manual'
      );
    end if;
    v_dia := v_dia + 1;
  end loop;
end $$;

select fecha, estado, atraso_min from public.op_asistencia
where operario_id = (select id from public.profiles where email = 'pruebaoperario@nommafood.cl')
order by fecha desc limit 15;

-- ── LIMPIEZA (cuando termines de probar): ───────────────────────────
-- delete from public.op_turnos where operario_id = (select id from public.profiles where email='pruebaoperario@nommafood.cl');
-- delete from public.op_asistencia where operario_id = (select id from public.profiles where email='pruebaoperario@nommafood.cl');
