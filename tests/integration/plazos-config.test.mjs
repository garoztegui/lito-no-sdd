import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('plazos configurables, validación y permisos', () => {
  const sql = `begin;
    ${readFileSync('supabase/migrations/20261119193932_plazos_config.sql', 'utf8')}
    create temp table usuarios_plazos (cliente uuid, admin uuid);
    insert into usuarios_plazos values (gen_random_uuid(), gen_random_uuid());
    insert into auth.users (id, email, raw_user_meta_data)
      select cliente, cliente::text || '@example.test', '{"nombre":"Prueba","telefono":"123","sexo":"Mujer"}'::jsonb from usuarios_plazos
      union all select admin, admin::text || '@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'::jsonb from usuarios_plazos;
    update public.perfiles set es_administrador = true where id = (select admin from usuarios_plazos);
    grant select on usuarios_plazos to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from usuarios_plazos), true);
    do $$ begin
      begin perform public.guardar_plazos(6, 18); raise exception 'Cliente modificó plazos';
      exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub', (select admin::text from usuarios_plazos), true);
    do $$ begin
      begin perform public.guardar_plazos(0, 18); raise exception 'Se aceptó un plazo inválido';
      exception when invalid_parameter_value then null; end;
      perform public.guardar_plazos(6, 18);
      if not exists (select 1 from public.plazos() where reserva = 6 and cancelacion = 18) then raise exception 'Plazos no guardados'; end if;
    end $$;
    reset role;
    select set_config('request.jwt.claim.sub', '', true);
    create temp table prueba_reserva as select date_trunc('hour', now()) + interval '5 hours' as cerca,
      date_trunc('hour', now()) + interval '7 hours' as lejos;
    insert into private.disponibilidad_semanal (dia, hora)
      select extract(isodow from timezone('America/Montevideo', t))::integer, extract(hour from timezone('America/Montevideo', t))::integer
      from prueba_reserva, lateral (values (cerca), (lejos)) as fechas(t) on conflict do nothing;
    grant select on prueba_reserva to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from usuarios_plazos), true);
    do $$ begin
      begin perform public.solicitar_cita((select cerca from prueba_reserva), 'Espalda'); raise exception 'Reserva dentro del plazo aceptada';
      exception when insufficient_privilege then null; end;
      perform public.solicitar_cita((select lejos from prueba_reserva), 'Espalda');
    end $$;
    reset role;
    select set_config('request.jwt.claim.sub', '', true);
    create temp table casos_plazos (solicitud uuid, propuesta uuid, confirmada uuid, lejana uuid);
    insert into casos_plazos values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
    insert into public.citas (id, cliente_id, inicio, servicio, estado)
      select solicitud, cliente, now() + interval '5 hours 7 seconds', 'Espalda', 'pendiente' from casos_plazos, usuarios_plazos
      union all select propuesta, cliente, now() + interval '5 hours 8 seconds', 'Espalda', 'propuesta' from casos_plazos, usuarios_plazos
      union all select confirmada, cliente, now() + interval '15 hours 9 seconds', 'Espalda', 'confirmada' from casos_plazos, usuarios_plazos
      union all select lejana, cliente, now() + interval '19 hours 10 seconds', 'Espalda', 'confirmada' from casos_plazos, usuarios_plazos;
    grant select on casos_plazos to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select admin::text from usuarios_plazos), true);
    do $$ begin
      if public.resolver_solicitud_administrador((select solicitud from casos_plazos), 'aceptar') <> 'cancelada' then raise exception 'La solicitud no venci? con el nuevo plazo'; end if;
    end $$;
    select set_config('request.jwt.claim.sub', (select cliente::text from usuarios_plazos), true);
    do $$ begin
      if public.responder_propuesta((select propuesta from casos_plazos), 'aceptar') <> 'cancelada' then raise exception 'La propuesta no venci? con el nuevo plazo'; end if;
      if public.cancelar_cita_cliente((select confirmada from casos_plazos)) <> 'fuera_de_plazo' then raise exception 'Se cancel? dentro del nuevo plazo'; end if;
      if public.cancelar_cita_cliente((select lejana from casos_plazos)) <> 'cancelada' then raise exception 'No se cancel? fuera del nuevo plazo'; end if;
    end $$;
    reset role;
    set local role anon;
    do $$ begin
      if not exists (select 1 from public.plazos() where reserva = 6 and cancelacion = 18) then raise exception 'Los plazos no son p?blicos'; end if;
      begin perform public.guardar_plazos(4, 12); raise exception 'Un an?nimo modific? los plazos';
      exception when insufficient_privilege then null; end;
    end $$;
    reset role;
    rollback;`;
  const salida = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(salida, /ROLLBACK/);
});
