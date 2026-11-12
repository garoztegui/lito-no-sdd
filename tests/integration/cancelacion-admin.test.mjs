import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const contenedor = process.env.STORY15_DB_CONTAINER ?? 'supabase_db_litov2';
const ejecutar = sql => execFileSync('docker', ['exec', '-i', contenedor, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

test('solo un administrador cancela una cita confirmada vigente con motivo y libera el horario', () => {
  const sql = `begin;
    create temp table prueba_cancelacion_admin (admin uuid, cliente uuid, futura uuid, cerca uuid, propuesta uuid, pendiente uuid, fecha timestamptz);
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009951', 'story15-admin@example.test', '{"nombre":"Admin Prueba","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009952', 'story15-cliente@example.test', '{"nombre":"Cliente Prueba","telefono":"456","sexo":"Hombre"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009951';
    do $$ declare f uuid; c uuid; p uuid; s uuid; fecha_futura timestamptz := now() + interval '300 days'; begin
      insert into public.citas (cliente_id, inicio, servicio, estado) values
        ('00000000-0000-0000-0000-000000009952', fecha_futura, 'Espalda', 'confirmada') returning id into f;
      insert into public.citas (cliente_id, inicio, servicio, estado) values
        ('00000000-0000-0000-0000-000000009952', now() + interval '23 hours 17 seconds', 'Espalda', 'confirmada') returning id into c;
      insert into public.citas (cliente_id, inicio, servicio, estado) values
        ('00000000-0000-0000-0000-000000009952', fecha_futura + interval '1 minute', 'Espalda', 'propuesta') returning id into p;
      insert into public.citas (cliente_id, inicio, servicio, estado) values
        ('00000000-0000-0000-0000-000000009952', fecha_futura + interval '2 minutes', 'Espalda', 'pendiente') returning id into s;
      insert into prueba_cancelacion_admin values ('00000000-0000-0000-0000-000000009951', '00000000-0000-0000-0000-000000009952', f, c, p, s, fecha_futura);
    end $$;
    grant select on prueba_cancelacion_admin to authenticated;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', (select cliente::text from prueba_cancelacion_admin), true);
    do $$ begin
      begin perform public.cancelar_cita_administrador((select futura from prueba_cancelacion_admin), 'Motivo'); raise exception 'Cliente pudo cancelar como administrador';
      exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub', (select admin::text from prueba_cancelacion_admin), true);
    do $$ declare r prueba_cancelacion_admin%rowtype; begin
      select * into r from prueba_cancelacion_admin;
      begin perform public.cancelar_cita_administrador(r.futura, '   '); raise exception 'Se aceptó un motivo vacío';
      exception when invalid_parameter_value then null; end;
      if public.cancelar_cita_administrador(r.cerca, 'Motivo') <> 'fuera_de_plazo' then raise exception 'No se respetó el límite'; end if;
      if public.cancelar_cita_administrador(r.propuesta, 'Motivo') <> 'no_disponible' then raise exception 'Se alteró una propuesta'; end if;
      if public.cancelar_cita_administrador(r.pendiente, 'Motivo') <> 'no_disponible' then raise exception 'Se alteró una solicitud'; end if;
      if public.cancelar_cita_administrador(r.futura, '  Motivo de prueba  ') <> 'cancelada' then raise exception 'No se canceló la cita'; end if;
      if exists (select 1 from public.horarios_ocupados(r.fecha, r.fecha + interval '1 minute')) then raise exception 'El horario sigue ocupado'; end if;
    end $$;
    reset role;
    do $$ begin
      if not exists (select 1 from public.citas c join prueba_cancelacion_admin p on c.id = p.futura where c.estado = 'cancelada' and c.motivo_cancelacion = 'Motivo de prueba') then raise exception 'No se conservó el motivo'; end if;
      if not exists (select 1 from public.citas c join prueba_cancelacion_admin p on c.id = p.cerca where c.estado = 'confirmada') then raise exception 'Se modificó la cita dentro del plazo'; end if;
      if not exists (select 1 from public.citas c join prueba_cancelacion_admin p on c.id = p.propuesta where c.estado = 'propuesta') then raise exception 'Se modificó la propuesta'; end if;
    end $$;
    rollback;`;
  assert.match(ejecutar(sql), /ROLLBACK/);
});
