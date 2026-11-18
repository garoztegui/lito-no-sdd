import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('las reservas y propuestas vencen a las 4 horas y las cancelaciones se limitan a 12 horas', () => {
  const sql = `begin;
    create temp table datos_plazos (cliente uuid, admin uuid, turno timestamptz, corto timestamptz);
    insert into datos_plazos
      select gen_random_uuid(), gen_random_uuid(),
        (select candidato from generate_series(date_trunc('hour', now()) + interval '6 hours', date_trunc('hour', now()) + interval '22 hours', interval '1 hour') candidato
          where not exists (select 1 from public.citas c where c.inicio = candidato and c.estado in ('pendiente', 'propuesta', 'confirmada'))
            and not exists (select 1 from private.bloqueos b where b.fecha = timezone('America/Montevideo', candidato)::date
              and extract(hour from timezone('America/Montevideo', candidato)) >= b.hora_inicio
              and extract(hour from timezone('America/Montevideo', candidato)) < b.hora_fin)
          order by candidato limit 1), date_trunc('hour', now()) + interval '3 hours';
    insert into auth.users (id, email, raw_user_meta_data)
      select cliente, cliente::text || '@example.test', '{"nombre":"Prueba","telefono":"123","sexo":"Mujer"}'::jsonb from datos_plazos
      union all select admin, admin::text || '@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'::jsonb from datos_plazos;
    update public.perfiles set es_administrador = true where id = (select admin from datos_plazos);
    insert into private.disponibilidad_semanal (dia, hora)
      select extract(isodow from timezone('America/Montevideo', t))::int, extract(hour from timezone('America/Montevideo', t))::int
      from datos_plazos, lateral (values (turno), (corto)) as fechas(t) on conflict do nothing;
    grant select on datos_plazos to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from datos_plazos), true);
    do $$ begin
      begin
        perform public.solicitar_cita((select corto from datos_plazos), 'Espalda');
        raise exception 'Se aceptó una reserva dentro de 4 horas';
      exception when insufficient_privilege then null; end;
      perform public.solicitar_cita((select turno from datos_plazos), 'Espalda');
      if not exists (select 1 from public.citas where inicio = (select turno from datos_plazos) and estado = 'pendiente') then
        raise exception 'La reserva entre 4 y 24 horas no permanece pendiente';
      end if;
      if not exists (select 1 from public.horarios_ocupados((select turno from datos_plazos), (select turno + interval '1 hour' from datos_plazos))) then
        raise exception 'La reserva pendiente no ocupa su horario';
      end if;
    end $$;
    select set_config('request.jwt.claim.sub', (select admin::text from datos_plazos), true);
    do $$ declare id_cita uuid; begin
      select id into id_cita from public.agenda_administrador() where inicio = (select turno from datos_plazos);
      if id_cita is null then raise exception 'La reserva cercana no aparece en la agenda administrativa'; end if;
      if public.resolver_solicitud_administrador(id_cita, 'aceptar') <> 'confirmada' then
        raise exception 'No se pudo aceptar la solicitud cercana';
      end if;
    end $$;
    reset role;
    select set_config('request.jwt.claim.sub', '', true);
    insert into public.citas (cliente_id, inicio, servicio, estado)
      select cliente, now() + interval '11 hours 51 seconds', 'Espalda', 'confirmada' from datos_plazos
      union all select cliente, now() + interval '13 hours 51 seconds', 'Espalda', 'confirmada' from datos_plazos
      union all select cliente, now() + interval '3 hours 51 seconds', 'Espalda', 'propuesta' from datos_plazos;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from datos_plazos), true);
    do $$ declare cerca uuid; lejos uuid; propuesta uuid; begin
      select id into cerca from public.citas where inicio = now() + interval '11 hours 51 seconds';
      select id into lejos from public.citas where inicio = now() + interval '13 hours 51 seconds';
      select id into propuesta from public.citas where inicio = now() + interval '3 hours 51 seconds';
      if public.cancelar_cita_cliente(cerca) <> 'fuera_de_plazo' then raise exception 'Cancelación dentro de 12 horas permitida'; end if;
      if public.cancelar_cita_cliente(lejos) <> 'cancelada' then raise exception 'Cancelación con más de 12 horas rechazada'; end if;
      if public.responder_propuesta(propuesta, 'aceptar') <> 'cancelada' then raise exception 'Propuesta vencida no fue cancelada'; end if;
    end $$;
    reset role;
    rollback;`;
  const salida = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(salida, /ROLLBACK/);
});

test('los plazos se comprueban con la hora actual después de esperar', () => {
  const sql = `begin;
    create temp table espera_plazos (cliente uuid, admin uuid, solicitud uuid, propuesta uuid, confirmada uuid);
    insert into espera_plazos values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
    insert into auth.users (id, email, raw_user_meta_data)
      select cliente, cliente::text || '@example.test', '{"nombre":"Prueba","telefono":"123","sexo":"Mujer"}'::jsonb from espera_plazos
      union all select admin, admin::text || '@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'::jsonb from espera_plazos;
    update public.perfiles set es_administrador = true where id = (select admin from espera_plazos);
    insert into public.citas (id, cliente_id, inicio, servicio, estado)
      select solicitud, cliente, now() + interval '4 hours 1 second', 'Espalda', 'pendiente' from espera_plazos
      union all select propuesta, cliente, now() + interval '4 hours 1.2 seconds', 'Espalda', 'propuesta' from espera_plazos
      union all select confirmada, cliente, now() + interval '12 hours 1 second', 'Espalda', 'confirmada' from espera_plazos;
    grant select on espera_plazos to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select admin::text from espera_plazos), true);
    select pg_sleep(2);
    do $$ begin
      if public.resolver_solicitud_administrador((select solicitud from espera_plazos), 'aceptar') <> 'cancelada' then
        raise exception 'Se aceptó una solicitud luego de vencer';
      end if;
    end $$;
    select set_config('request.jwt.claim.sub', (select cliente::text from espera_plazos), true);
    do $$ begin
      if public.responder_propuesta((select propuesta from espera_plazos), 'aceptar') <> 'cancelada' then
        raise exception 'Se aceptó una propuesta luego de vencer';
      end if;
      if public.cancelar_cita_cliente((select confirmada from espera_plazos)) <> 'fuera_de_plazo' then
        raise exception 'Se canceló una cita luego de vencer el plazo';
      end if;
    end $$;
    reset role;
    rollback;`;
  const salida = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(salida, /ROLLBACK/);
});
