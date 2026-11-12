import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('los destinatarios incluyen a cada administrador y excluyen a los demás', () => {
  const sql = `begin;
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009971','admin-uno@example.test','{"nombre":"Uno","telefono":"123","sexo":"Hombre"}'),
      ('00000000-0000-0000-0000-000000009972','admin-dos@example.test','{"nombre":"Dos","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009973','cliente-tres@example.test','{"nombre":"Tres","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id in ('00000000-0000-0000-0000-000000009971','00000000-0000-0000-0000-000000009972');
    do $$ begin
      if (select count(*) from private.emails_administradores() where email in ('admin-uno@example.test','admin-dos@example.test')) <> 2 then raise exception 'faltan administradores'; end if;
      if exists (select 1 from private.emails_administradores() where email = 'cliente-tres@example.test') then raise exception 'cliente incluido'; end if;
      if has_function_privilege('authenticated', 'private.emails_administradores()', 'execute') then raise exception 'destinatarios expuestos'; end if;
    end $$;
    rollback;`;
  const result = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(result, /ROLLBACK/);
});
