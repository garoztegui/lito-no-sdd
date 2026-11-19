import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('eliminar una cuenta conserva el historial anónimo y elimina sus datos y citas futuras', () => {
  const migracion = readFileSync('supabase/migrations/20261119120000_eliminar_cuenta.sql', 'utf8');
  const sql = `begin;
grant supabase_auth_admin to postgres;
set local role postgres;
${migracion}
insert into auth.users (id,email,raw_user_meta_data,raw_app_meta_data) values
 ('44444444-4444-4444-8444-444444444444','cliente-eliminar@example.test','{"nombre":"Cliente Prueba","telefono":"099123456","sexo":"Mujer"}','{}'),
 ('55555555-5555-4555-8555-555555555555','admin-eliminar@example.test','{"nombre":"Admin Prueba","telefono":"099123456","sexo":"Mujer"}','{}'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','google-eliminar@example.test','{"full_name":"Google Prueba"}','{"provider":"google","providers":["google"]}');
insert into auth.identities (user_id,provider_id,provider,identity_data) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','google-test-id','google','{"sub":"google-test-id"}');
alter table public.citas disable trigger user;
insert into public.citas (id,cliente_id,inicio,servicio,estado) values
 ('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','2001-01-01 10:00+00','Espalda','cancelada'),
 ('77777777-7777-4777-8777-777777777777','44444444-4444-4444-8444-444444444444','2098-01-01 10:00+00','Espalda','pendiente'),
 ('88888888-8888-4888-8888-888888888888','44444444-4444-4444-8444-444444444444','2098-01-02 10:00+00','Espalda','propuesta'),
 ('99999999-9999-4999-8999-999999999999','44444444-4444-4444-8444-444444444444','2098-01-03 10:00+00','Espalda','confirmada');
update public.citas set motivo_cancelacion='Cliente Prueba: cliente-eliminar@example.test' where id='66666666-6666-4666-8666-666666666666';
alter table public.citas enable trigger user;
insert into private.eventos_email_citas (cita_id,actor_id,tipo,destinatario,inicio,servicio,nombre)
values ('66666666-6666-4666-8666-666666666666','55555555-5555-4555-8555-555555555555','confirmacion','cliente-eliminar@example.test','2001-01-01 10:00+00','Espalda','Cliente Prueba');
set local role supabase_auth_admin;
delete from auth.users where id='44444444-4444-4444-8444-444444444444';
delete from auth.users where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
reset role;
do $$ begin
 if exists(select 1 from auth.users where id='44444444-4444-4444-8444-444444444444') then raise exception 'Cuenta conservada'; end if;
 if exists(select 1 from public.perfiles where id='44444444-4444-4444-8444-444444444444') then raise exception 'Perfil conservado'; end if;
 if exists(select 1 from public.citas where id in ('77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888','99999999-9999-4999-8999-999999999999')) then raise exception 'Cita futura conservada'; end if;
 if not exists(select 1 from public.citas where id='66666666-6666-4666-8666-666666666666' and cliente_id is null and nombre_cliente_historico='USUARIO ELIMINADO' and servicio='Espalda' and estado='cancelada' and motivo_cancelacion is null) then raise exception 'Historial o motivo no anonimizado'; end if;
 if exists(select 1 from private.eventos_email_citas where destinatario='cliente-eliminar@example.test' or nombre='Cliente Prueba') then raise exception 'Datos personales conservados en eventos'; end if;
 if exists(select 1 from auth.identities where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'Identidad de Google conservada'; end if;
end $$;
update public.perfiles set es_administrador=true where id='55555555-5555-4555-8555-555555555555';
do $$ begin
 begin
   delete from auth.users where id='55555555-5555-4555-8555-555555555555';
   raise exception 'Cuenta administradora eliminada';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
do $$ begin
 if not exists(select 1 from public.citas_usuarios_eliminados() where id='66666666-6666-4666-8666-666666666666' and nombre='USUARIO ELIMINADO') then raise exception 'Administrador no puede consultar el historial anónimo'; end if;
end $$;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$ begin
 begin
   perform * from public.citas_usuarios_eliminados();
   raise exception 'Usuario sin permisos pudo consultar el historial';
 exception when insufficient_privilege then null; end;
end $$;
rollback;`;
  const output = execFileSync('docker', ['exec','-i','supabase_db_litov2','psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(output, /ROLLBACK/);
});
