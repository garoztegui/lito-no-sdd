import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

test('conserva la cuenta anterior y permite gestionar cuentas solo al administrador', () => {
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const file = readdirSync(dir).find(name => name.endsWith('_cuentas_bancarias.sql'));
  assert.ok(file, 'Falta la migración de cuentas bancarias');
  const previo = readFileSync(new URL('20261119193925_contacto_config.sql', dir), 'utf8');
  const migration = readFileSync(new URL(file, dir), 'utf8');
  const sql = `begin;
    ${previo}
    ${migration}
    do $$ begin
      if not exists(select 1 from public.cuentas_bancarias where entidad='BANCO REPUBLICA' and titular='José Luis' and moneda='Pesos' and numero='00040248300001') then raise exception 'Cuenta anterior perdida'; end if;
    end $$;
    insert into auth.users (id,email,raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009941','banco-admin@example.test','{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009942','banco-cliente@example.test','{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador=true where id='00000000-0000-0000-0000-000000009941';
    set local role authenticated;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009941',true);
    insert into public.cuentas_bancarias(entidad,titular,moneda,numero) values ('Banco Prueba','Persona Prueba','Dólares','123');
    update public.cuentas_bancarias set moneda='Pesos y dólares' where numero='123';
    do $$ begin if not exists(select 1 from public.cuentas_bancarias where numero='123' and moneda='Pesos y dólares') then raise exception 'No se guardó edición'; end if; end $$;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009942',true);
    do $$ begin
      if (select count(*) from public.cuentas_bancarias) <> 2 then raise exception 'Cliente no ve cuentas'; end if;
      update public.cuentas_bancarias set numero='999' where numero='123'; if found then raise exception 'Cliente modificó cuenta'; end if;
      delete from public.cuentas_bancarias where numero='123'; if found then raise exception 'Cliente eliminó cuenta'; end if;
      begin insert into public.cuentas_bancarias(entidad,titular,moneda,numero) values ('Banco','Persona','Pesos','1'); raise exception 'Cliente creó cuenta'; exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009941',true);
    delete from public.cuentas_bancarias where numero='123';
    do $$ begin if exists(select 1 from public.cuentas_bancarias where numero='123') then raise exception 'No se eliminó cuenta'; end if; end $$;
    rollback;`;
  const result = execFileSync('docker', ['exec','-i','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'], { input: sql, encoding:'utf8' });
  assert.match(result, /ROLLBACK/);
});

test('rechaza el formato anterior ambiguo sin inventar datos', () => {
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  const file = readdirSync(dir).find(name => name.endsWith('_cuentas_bancarias.sql'));
  const previo = readFileSync(new URL('20261119193925_contacto_config.sql', dir), 'utf8');
  const migration = readFileSync(new URL(file, dir), 'utf8');
  const sql = `begin; ${previo} update public.contacto_config set cuenta_bancaria='Datos sin formato'; ${migration} commit;`;
  assert.throws(() => execFileSync('docker', ['exec','-i','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'], { input: sql, encoding:'utf8', stdio: ['pipe','pipe','pipe'] }), /No se puede separar/);
});
