import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('administradores reservan para clientes y personas sin cuenta, con controles de acceso', () => {
  const migration = readFileSync(new URL('../../supabase/migrations/20261125105104_reservas_administrador.sql', import.meta.url), 'utf8');
  const sql = `begin;
    select to_regprocedure('public.reservar_cita_administrador(timestamp with time zone,text,uuid,text,text,text,text)') is null as install_test_migration \\gset
    \\if :install_test_migration
    ${migration}
    \\endif
    insert into auth.users (id,email,raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009961','admin-reservas@example.test','{"nombre":"Admin","telefono":"123","sexo":"Hombre"}'),
      ('00000000-0000-0000-0000-000000009962','cliente-reservas@example.test','{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009961';
    select set_config('test.slot', (select slot::text from (select ((current_date + n)::timestamp + time '10:00') at time zone 'America/Montevideo' slot from generate_series(15,70) n) s
      where private.inicio_disponible(slot) and not exists (select 1 from public.citas c where c.inicio=slot and c.estado in ('pendiente','confirmada','propuesta')) limit 1), true);
    select set_config('test.slot2', (select slot::text from (select ((current_date + n)::timestamp + time '10:00') at time zone 'America/Montevideo' slot from generate_series(15,70) n) s
      where private.inicio_disponible(slot) and slot <> current_setting('test.slot')::timestamptz and not exists (select 1 from public.citas c where c.inicio=slot and c.estado in ('pendiente','confirmada','propuesta')) limit 1), true);
    update private.configuracion_plazos set reserva=2000 where id;
    set local role authenticated;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009962',true);
    do $$ begin
      begin perform public.reservar_cita_administrador(current_setting('test.slot')::timestamptz,'Espalda',null,'Invitado',null,null,null); raise exception 'cliente autorizado'; exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009961',true);
    do $$ declare cid uuid; begin
      cid := public.reservar_cita_administrador(current_setting('test.slot')::timestamptz,'Espalda',null,'Invitado',null,'invitado@example.test',null);
      if not exists(select 1 from public.agenda_administrador() a where a.id=cid and a.nombre='Invitado' and a.email='invitado@example.test' and a.estado='confirmada') then raise exception 'invitado ausente de agenda'; end if;
      if (select count(*) from public.reclamar_emails_cita(cid,null,'confirmacion')) <> 1 then raise exception 'falta confirmación de invitado'; end if;
      begin perform public.reservar_cita_administrador(current_setting('test.slot')::timestamptz,'Espalda','00000000-0000-0000-0000-000000009962',null,null,null,null); raise exception 'horario duplicado'; exception when unique_violation then null; end;
      begin perform public.reservar_cita_administrador(current_setting('test.slot')::timestamptz,'Espalda','00000000-0000-0000-0000-000000009961',null,null,null,null); raise exception 'autoreserva permitida'; exception when invalid_parameter_value then null; end;
      cid := public.reservar_cita_administrador(current_setting('test.slot2')::timestamptz,'Espalda','00000000-0000-0000-0000-000000009962',null,null,null,null);
      if not exists(select 1 from public.agenda_administrador() a where a.id=cid and a.nombre='Cliente' and a.estado='confirmada') then raise exception 'cliente ausente de agenda'; end if;
      if (select count(*) from public.reclamar_emails_cita(cid,null,'confirmacion')) <> 1 then raise exception 'falta confirmación de cliente'; end if;
    end $$;
    rollback;`;
  const output = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(output, /ROLLBACK/);
});
