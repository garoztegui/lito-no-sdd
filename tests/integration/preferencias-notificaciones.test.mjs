import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('preferencias privadas, destinatarios y horario de agenda', () => {
  const agenda = readFileSync('supabase/migrations/20261119111837_agenda_diaria.sql', 'utf8');
  const preferencias = readFileSync('supabase/migrations/20261119193918_preferencias_notificaciones.sql', 'utf8');
  const sql = `begin;
${agenda}
${preferencias}
insert into auth.users (id,email,raw_user_meta_data,raw_app_meta_data) values
 ('11111111-1111-4111-8111-111111111111','preferencias-admin-uno@example.test','{"nombre":"Admin Uno","telefono":"099111111","sexo":"Mujer"}','{}'),
 ('22222222-2222-4222-8222-222222222222','preferencias-admin-dos@example.test','{"nombre":"Admin Dos","telefono":"099222222","sexo":"Mujer"}','{}'),
 ('33333333-3333-4333-8333-333333333333','preferencias-cliente@example.test','{"nombre":"Cliente","telefono":"099333333","sexo":"Mujer"}','{}');
update public.perfiles set es_administrador=true where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare p jsonb; begin
 p := public.preferencias_notificaciones();
 if p <> '{"agenda_habilitada":true,"hora_agenda":"06:00","solicitudes_habilitadas":true}'::jsonb then raise exception 'Valores iniciales incorrectos: %', p; end if;
 perform public.preferencias_notificaciones(true, '00:00', false);
 if not public.preferencia_agenda_diaria() then raise exception 'RPC previa incompatible'; end if;
 perform public.preferencia_agenda_diaria(false);
 if (public.preferencias_notificaciones()->>'agenda_habilitada')::boolean then raise exception 'RPC previa no actualiza'; end if;
 perform public.preferencias_notificaciones(true, '00:00', false);
 begin
   perform public.preferencias_notificaciones(true, '08:37:30', true);
   raise exception 'Se aceptaron segundos';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 if not (public.preferencias_notificaciones()->>'solicitudes_habilitadas')::boolean then raise exception 'Preferencia compartida'; end if;
 perform public.preferencias_notificaciones(false, '23:59', true);
end $$;
delete from private.disponibilidad_semanal;
insert into private.disponibilidad_semanal (dia,hora) values (extract(isodow from now() at time zone 'America/Montevideo')::integer, 7);
do $$ declare hoy date := (clock_timestamp() at time zone 'America/Montevideo')::date; ahora time := (clock_timestamp() at time zone 'America/Montevideo')::time; begin
 if ahora < time '23:59' then
   update private.preferencias_agenda_diaria set hora = time '23:59' where administrador_id = '11111111-1111-4111-8111-111111111111';
   if exists(select 1 from public.reclamar_agenda_diaria() where destinatario='preferencias-admin-uno@example.test') then raise exception 'Agenda enviada antes de la hora'; end if;
   update private.preferencias_agenda_diaria set hora = time '00:00' where administrador_id = '11111111-1111-4111-8111-111111111111';
 end if;
 if not exists(select 1 from public.reclamar_agenda_diaria() where destinatario='preferencias-admin-uno@example.test') then raise exception 'Agenda habilitada no reclamada'; end if;
 if exists(select 1 from public.reclamar_agenda_diaria() where destinatario='preferencias-admin-dos@example.test') then raise exception 'Agenda deshabilitada reclamada'; end if;
 perform public.finalizar_agenda_diaria('11111111-1111-4111-8111-111111111111',hoy,false);
 if not exists(select 1 from public.reclamar_agenda_diaria() where destinatario='preferencias-admin-uno@example.test') then raise exception 'No se reintentó'; end if;
 perform public.finalizar_agenda_diaria('11111111-1111-4111-8111-111111111111',hoy,true);
 if exists(select 1 from public.reclamar_agenda_diaria() where destinatario='preferencias-admin-uno@example.test') then raise exception 'Envío duplicado'; end if;
end $$;
do $$ begin
 if not exists(select 1 from cron.job where jobname='enviar-agenda-diaria' and schedule='* * * * *') then raise exception 'Cron no contempla minutos arbitrarios'; end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
 begin perform public.preferencias_notificaciones(); raise exception 'Cliente accedió'; exception when insufficient_privilege then null; end;
end $$;
alter table public.citas disable trigger user;
alter table public.citas enable trigger registrar_email_cita;
insert into public.citas (id,cliente_id,inicio,servicio,estado) values ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333',clock_timestamp()+interval '5 days','Espalda','pendiente');
do $$ begin
 if not exists(select 1 from private.eventos_email_citas where cita_id='44444444-4444-4444-8444-444444444444' and tipo='solicitud_cliente') then raise exception 'Falta email cliente'; end if;
 if exists(select 1 from private.eventos_email_citas where cita_id='44444444-4444-4444-8444-444444444444' and destinatario='preferencias-admin-uno@example.test') then raise exception 'Email deshabilitado enviado'; end if;
 if not exists(select 1 from private.eventos_email_citas where cita_id='44444444-4444-4444-8444-444444444444' and destinatario='preferencias-admin-dos@example.test') then raise exception 'Email habilitado ausente'; end if;
end $$;
rollback;`;
  const output = execFileSync('docker', ['exec','-i','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(output, /ROLLBACK/);
});
