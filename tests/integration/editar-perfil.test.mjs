import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('el cliente modifica solo sus datos permitidos', () => {
  const sql = `begin;
    insert into auth.users (id,email,raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009941','perfil-a@example.test','{"nombre":"Cliente A","telefono":"111","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009942','perfil-b@example.test','{"nombre":"Cliente B","telefono":"222","sexo":"Hombre"}');
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009941', true);
    update public.perfiles set nombre='Nombre nuevo', telefono='333', sexo='Hombre' where id='00000000-0000-0000-0000-000000009941';
    update public.perfiles set nombre='Ajeno' where id='00000000-0000-0000-0000-000000009942';
    do $$ begin
      begin update public.perfiles set es_administrador=true where id='00000000-0000-0000-0000-000000009941'; raise exception 'escalada permitida'; exception when insufficient_privilege then null; end;
    end $$;
    reset role;
    do $$ begin
      if not exists (select 1 from public.perfiles where id='00000000-0000-0000-0000-000000009941' and nombre='Nombre nuevo' and telefono='333' and sexo='Hombre' and not es_administrador) then raise exception 'perfil propio no actualizado'; end if;
      if not exists (select 1 from public.perfiles where id='00000000-0000-0000-0000-000000009942' and nombre='Cliente B') then raise exception 'perfil ajeno modificado'; end if;
    end $$;
    rollback;`;
  const resultado = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(resultado, /ROLLBACK/);
});
