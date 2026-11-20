import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('solo se reclaman recordatorios de citas confirmadas dentro de las tres horas', () => {
  const migracion = readFileSync('supabase/migrations/20261119232034_recordatorios_citas.sql', 'utf8');
  const sql = `begin;
${migracion}
insert into auth.users (id,email,raw_user_meta_data,raw_app_meta_data) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','recordatorio@example.test','{"nombre":"Cliente Prueba","telefono":"099123456","sexo":"Mujer"}','{}');
alter table public.citas disable trigger user;
insert into public.citas (id,cliente_id,inicio,servicio,estado) values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()+interval '2 hours 59 minutes','Espalda','confirmada'),
 ('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()+interval '2 hours 58 minutes','Espalda','cancelada'),
 ('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()+interval '2 hours 57 minutes','Espalda','pendiente'),
 ('44444444-4444-4444-8444-444444444444','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',clock_timestamp()+interval '3 hours 1 minute','Espalda','confirmada');
alter table public.citas enable trigger user;
do $$ declare id_recordatorio uuid; token_actual uuid; token_anterior uuid; begin
 if has_function_privilege('authenticated','public.reclamar_recordatorios()','execute') then raise exception 'Cliente puede reclamar recordatorios'; end if;
 select cita_id, token into id_recordatorio, token_actual from public.reclamar_recordatorios() where cita_id='11111111-1111-4111-8111-111111111111';
 if id_recordatorio is null then raise exception 'Cita confirmada no reclamada'; end if;
 if exists(select 1 from public.reclamar_recordatorios() where cita_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444')) then raise exception 'Recordatorio duplicado o fuera de plazo'; end if;
 update public.citas set estado='cancelada' where public.citas.id=id_recordatorio;
 if exists(select 1 from public.datos_recordatorio(id_recordatorio, token_actual)) then raise exception 'Cita cancelada sigue disponible para envío'; end if;
 update public.citas set estado='confirmada' where public.citas.id=id_recordatorio;
 perform public.finalizar_recordatorio(id_recordatorio, token_actual, false);
 token_anterior := token_actual;
 select token into token_actual from public.reclamar_recordatorios() where cita_id=id_recordatorio;
 if token_actual is null or token_actual = token_anterior then raise exception 'No se reintenta un fallo con otro token'; end if;
 token_anterior := token_actual;
 update private.recordatorios_citas set reclamado_en = clock_timestamp() - interval '6 minutes' where cita_id=id_recordatorio;
 select token into token_actual from public.reclamar_recordatorios() where cita_id=id_recordatorio;
 if token_actual is null or token_actual = token_anterior then raise exception 'No se recupera un reclamo vencido'; end if;
 perform public.finalizar_recordatorio(id_recordatorio, token_anterior, false);
 if exists(select 1 from public.reclamar_recordatorios() where cita_id=id_recordatorio) then raise exception 'Un intento anterior liberó el reclamo actual'; end if;
 perform public.finalizar_recordatorio(id_recordatorio, token_actual, true);
 if exists(select 1 from public.reclamar_recordatorios() where cita_id=id_recordatorio) then raise exception 'Se repitió envío exitoso'; end if;
end $$;
rollback;`;
  const output = execFileSync('docker', ['exec','-i','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(output, /ROLLBACK/);
});
