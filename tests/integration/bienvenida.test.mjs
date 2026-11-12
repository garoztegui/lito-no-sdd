import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('cada usuario autenticado puede reclamar un solo intento de bienvenida', () => {
  const sql = `begin;
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009961', 'welcome-one@example.test', '{"nombre":"Uno","telefono":"123","sexo":"Hombre"}'),
      ('00000000-0000-0000-0000-000000009962', 'welcome-two@example.test', '{"nombre":"Dos","telefono":"123","sexo":"Mujer"}');
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009961', true);
    do $$ begin
      if public.reclamar_bienvenida() is not true then raise exception 'primer intento rechazado'; end if;
      if public.reclamar_bienvenida() is not false then raise exception 'segundo intento permitido'; end if;
      if has_table_privilege('authenticated', 'private.bienvenidas', 'select') then raise exception 'tabla expuesta'; end if;
      if has_function_privilege('anon', 'public.reclamar_bienvenida()', 'execute') then raise exception 'acceso anónimo'; end if;
    end $$;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009962', true);
    do $$ begin
      if public.reclamar_bienvenida() is not true then raise exception 'otro usuario rechazado'; end if;
    end $$;
    rollback;`;
  const output = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(output, /ROLLBACK/);
});
