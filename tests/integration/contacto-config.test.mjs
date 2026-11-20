import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('solo el administrador puede actualizar el contacto y los clientes pueden leerlo', () => {
  const migration = readFileSync(new URL('../../supabase/migrations/20261119193925_contacto_config.sql', import.meta.url), 'utf8').replace(/^\uFEFF/, '');
  const exists = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-Atc', "select to_regclass('public.contacto_config') is not null"], { encoding: 'utf8' }).trim() === 't';
  const sql = `begin;
    ${exists ? '' : migration}
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009931', 'contacto-admin@example.test', '{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009932', 'contacto-cliente@example.test', '{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009931';
    insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
      ('00000000-0000-0000-0000-000000009933', 'contacto-incompleto@example.test', '{"full_name":"Incompleto"}', '{"provider":"google"}');
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009933', true);
    do $$ begin if exists(select 1 from public.contacto_config) then raise exception 'Perfil incompleto pudo leer contacto'; end if; end $$;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009932', true);
    do $$ begin
      if (select telefono from public.contacto_config where id = true) is null then raise exception 'No puede leer contacto'; end if;
      update public.contacto_config set telefono = '099 111 222' where id = true;
      if found then raise exception 'Cliente pudo modificar contacto'; end if;
    end $$;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009931', true);
    do $$ begin
      begin update public.contacto_config set telefono = '123' where id = true; raise exception 'Se aceptó un teléfono sin enlace WhatsApp';
      exception when check_violation then null; end;
    end $$;
    update public.contacto_config set telefono = '099 111 222', direccion = 'Calle Ficticia 123', titular_cuenta = 'Persona Ejemplo', cuenta_bancaria = 'Banco Ejemplo 123' where id = true;
    do $$ begin if (select direccion from public.contacto_config where id = true) <> 'Calle Ficticia 123' then raise exception 'No se guardó'; end if; end $$;
    rollback;`;
  const salida = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(salida, /ROLLBACK/);
});
