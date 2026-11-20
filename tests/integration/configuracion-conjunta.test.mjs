import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('las tres migraciones de configuración funcionan juntas y mantienen permisos', () => {
  const leer = ruta => readFileSync(`supabase/migrations/${ruta}`, 'utf8');
  const sql = `begin;
update public.citas set estado='cancelada' where inicio > clock_timestamp() and estado in ('pendiente','propuesta','confirmada')
  and (extract(month from timezone('America/Montevideo', inicio))::integer, extract(day from timezone('America/Montevideo', inicio))::integer)
    in ((1,1),(5,1),(7,18),(8,25),(12,25));
${leer('20261119111837_agenda_diaria.sql')}
${leer('20261119145602_feriados_no_laborables.sql')}
${leer('20261119193918_preferencias_notificaciones.sql')}
${leer('20261119193925_contacto_config.sql')}
${leer('20261119193932_plazos_config.sql')}
insert into auth.users (id,email,raw_user_meta_data,raw_app_meta_data) values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','config-admin@example.test','{"nombre":"Admin Prueba","telefono":"099123456","sexo":"Mujer"}','{}'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','config-cliente@example.test','{"nombre":"Cliente Prueba","telefono":"099123456","sexo":"Mujer"}','{}');
update public.perfiles set es_administrador=true where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
select public.preferencias_notificaciones(true, '08:37', false);
select public.guardar_plazos(6, 18);
update public.contacto_config set telefono='099 111 222', direccion='Calle Ficticia 123', titular_cuenta='Persona Prueba', cuenta_bancaria='Banco Prueba' where id;
do $$ begin
 if (public.preferencias_notificaciones()->>'hora_agenda') <> '08:37' then raise exception 'No se guardó la hora'; end if;
 if (public.preferencias_notificaciones()->>'solicitudes_habilitadas')::boolean then raise exception 'No se guardó la preferencia'; end if;
 if not exists(select 1 from public.plazos() where reserva=6 and cancelacion=18) then raise exception 'No se guardaron los plazos'; end if;
 if not exists(select 1 from public.contacto_config where direccion='Calle Ficticia 123') then raise exception 'No se guardó la dirección'; end if;
end $$;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-dddddddddddd',true);
do $$ begin
 if not exists(select 1 from public.contacto_config where direccion='Calle Ficticia 123') then raise exception 'Cliente no ve contacto'; end if;
 if (select count(*) from public.horarios_bloqueados('2027-12-25'::date)) <> 24 then raise exception 'La configuración alteró el bloqueo de feriados'; end if;
 begin perform public.guardar_plazos(3,3); raise exception 'Cliente modificó plazos'; exception when insufficient_privilege then null; end;
 begin perform public.preferencias_notificaciones(false,'08:37',false); raise exception 'Cliente modificó preferencias'; exception when insufficient_privilege then null; end;
end $$;
rollback;`;
  const salida = execFileSync('docker', ['exec','-i','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(salida, /ROLLBACK/);
});
