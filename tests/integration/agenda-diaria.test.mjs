import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('la agenda respeta preferencias, estados, permisos y evita envíos duplicados', () => {
  const migration = readFileSync('supabase/migrations/20261119111837_agenda_diaria.sql', 'utf8');
  const sql = `begin;
${migration}
delete from private.disponibilidad_semanal;
delete from private.bloqueos where fecha = (now() at time zone 'America/Montevideo')::date;
delete from public.citas where (inicio at time zone 'America/Montevideo')::date = (now() at time zone 'America/Montevideo')::date;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('11111111-1111-4111-8111-111111111111', 'agenda-admin-uno@example.test', '{"nombre":"Admin Uno","telefono":"099111111","sexo":"Mujer"}', '{}'),
 ('22222222-2222-4222-8222-222222222222', 'agenda-admin-dos@example.test', '{"nombre":"Admin Dos","telefono":"099222222","sexo":"Mujer"}', '{}'),
 ('33333333-3333-4333-8333-333333333333', 'agenda-cliente@example.test', '{"nombre":"Cliente Prueba","telefono":"099333333","sexo":"Mujer"}', '{}');
update public.perfiles set es_administrador = true where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  if not public.preferencia_agenda_diaria() then raise exception 'Debe estar activada por defecto'; end if;
  perform public.preferencia_agenda_diaria(false);
end $$;
insert into private.disponibilidad_semanal (dia,hora)
select extract(isodow from now() at time zone 'America/Montevideo')::integer, h from generate_series(7,11) h;
insert into private.bloqueos (fecha,hora_inicio,hora_fin) values ((now() at time zone 'America/Montevideo')::date,10,11);
alter table public.citas disable trigger user;
insert into public.citas (cliente_id,inicio,servicio,estado) select '33333333-3333-4333-8333-333333333333', (((now() at time zone 'America/Montevideo')::date + make_interval(hours => h)) at time zone 'America/Montevideo'), 'Espalda', e from (values (7,'confirmada'),(8,'pendiente'),(9,'propuesta')) v(h,e);
alter table public.citas enable trigger user;
do $$ declare resultado record; begin
  if has_function_privilege('authenticated','public.reclamar_agenda_diaria()','execute') then raise exception 'Cliente tiene acceso al envío'; end if;
  select * into resultado from public.reclamar_agenda_diaria() where destinatario = 'agenda-admin-uno@example.test';
  if resultado.destinatario <> 'agenda-admin-uno@example.test' then raise exception 'Destinatario o preferencia incorrectos'; end if;
  if jsonb_array_length(resultado.filas) <> 5 then raise exception 'Cantidad de horarios incorrecta'; end if;
  if (select array_agg(x->>'estado') from jsonb_array_elements(resultado.filas) x) <> array['confirmada','pendiente','propuesta','bloqueado','libre'] then raise exception 'Estados incorrectos'; end if;
  if exists(select 1 from public.reclamar_agenda_diaria()) then raise exception 'Envío duplicado'; end if;
  perform public.finalizar_agenda_diaria('11111111-1111-4111-8111-111111111111', resultado.fecha, false);
  if not exists(select 1 from public.reclamar_agenda_diaria() where destinatario = 'agenda-admin-uno@example.test') then raise exception 'No se reintenta el envío fallido'; end if;
  perform public.finalizar_agenda_diaria('11111111-1111-4111-8111-111111111111', resultado.fecha, true);
  if exists(select 1 from public.reclamar_agenda_diaria() where destinatario = 'agenda-admin-uno@example.test') then raise exception 'Se repitió un envío exitoso'; end if;
end $$;
do $$ begin
  if exists(select 1 from private.envios_agenda_diaria where administrador_id = '22222222-2222-4222-8222-222222222222') then raise exception 'Se envió al administrador desactivado'; end if;
end $$;
delete from private.envios_agenda_diaria;
delete from private.disponibilidad_semanal;
do $$ begin
  if exists(select 1 from public.reclamar_agenda_diaria()) then raise exception 'Se envió en día sin horarios'; end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
  begin
    perform public.preferencia_agenda_diaria(false);
    raise exception 'Cliente pudo cambiar la preferencia administrativa';
  exception when insufficient_privilege then null; end;
end $$;
rollback;`;
  const output = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(output, /ROLLBACK/);
});
