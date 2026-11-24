import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('solo administradores acceden a la lista completa, sin identificadores', () => {
  const sql = `begin;
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009961', 'story36-admin@example.test', '{"nombre":"Admin Prueba","telefono":"000","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009962', 'story36-cliente@example.test', '{"nombre":"Cliente Prueba","telefono":"123","sexo":"Hombre"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009961';
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009962', true);
    do $$ begin
      begin perform public.lista_usuarios_email(); raise exception 'Cliente accedió a lista'; exception when insufficient_privilege then null; end;
      begin perform private.lista_usuarios_email(); raise exception 'Cliente accedió a función privada'; exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009961', true);
    do $$ begin
      if not exists (select 1 from public.lista_usuarios_email() where email = 'story36-admin@example.test' and es_administrador and nombre = 'Admin Prueba') then raise exception 'Falta administrador'; end if;
      if not exists (select 1 from public.lista_usuarios_email() where email = 'story36-cliente@example.test' and not es_administrador and nombre = 'Cliente Prueba' and telefono = '123' and sexo = 'Hombre') then raise exception 'Falta cliente o datos'; end if;
      if has_function_privilege('anon', 'public.lista_usuarios_email()', 'execute') then raise exception 'Anónimo tiene acceso'; end if;
      if exists (select 1 from information_schema.parameters where specific_schema = 'public' and specific_name like 'lista_usuarios_email_%' and parameter_name = 'id') then raise exception 'El identificador está expuesto'; end if;
    end $$;
    rollback;`;
  const output = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(output, /ROLLBACK/);
});
