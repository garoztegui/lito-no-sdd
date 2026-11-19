import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('los cinco feriados se bloquean cada año y las fechas restantes conservan la disponibilidad', () => {
  const migracion = readFileSync('supabase/migrations/20261119130000_feriados_no_laborables.sql', 'utf8');
  const sql = `begin;
update public.citas set estado = 'cancelada'
where inicio > clock_timestamp() and estado in ('pendiente','propuesta','confirmada')
  and (extract(month from timezone('America/Montevideo', inicio))::integer, extract(day from timezone('America/Montevideo', inicio))::integer)
    in ((1,1),(5,1),(7,18),(8,25),(12,25));
${migracion}
insert into auth.users (id,email,raw_user_meta_data,raw_app_meta_data) values
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','feriados@example.test','{"nombre":"Cliente Prueba","telefono":"099123456","sexo":"Mujer"}','{}');
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
insert into private.disponibilidad_semanal (dia,hora) select d,10 from generate_series(1,7) d on conflict do nothing;
insert into private.disponibilidad_semanal (dia,hora) select d,23 from generate_series(1,7) d on conflict do nothing;
delete from private.bloqueos where fecha = '2028-01-02';
do $$ declare fecha date; ano integer; begin
  for ano in 2026..2030 loop
    foreach fecha in array array[make_date(ano,1,1),make_date(ano,5,1),make_date(ano,7,18),make_date(ano,8,25),make_date(ano,12,25)] loop
      if (select count(*) from public.horarios_bloqueados(fecha)) <> 24 then raise exception 'Feriado no bloqueado: %', fecha; end if;
      if private.inicio_disponible((fecha + time '10:00') at time zone 'America/Montevideo') then raise exception 'Reserva disponible en feriado: %', fecha; end if;
    end loop;
  end loop;
  if private.es_feriado_no_laborable('2028-01-02'::date) then raise exception 'Día normal bloqueado como feriado'; end if;
  if not private.inicio_disponible('2028-01-01 02:00+00'::timestamptz) then raise exception 'Se bloqueó el día anterior en Montevideo'; end if;
  if private.inicio_disponible('2028-01-02 02:00+00'::timestamptz) then raise exception 'Se permitió reservar en feriado por fecha UTC'; end if;
end $$;
do $$ begin
  if not private.inicio_disponible('2028-01-02 10:00 America/Montevideo'::timestamptz) then raise exception 'Día normal dejó de estar disponible'; end if;
end $$;
set local role authenticated;
do $$ declare feriado timestamptz; begin
  select (d::date + time '10:00') at time zone 'America/Montevideo' into feriado
  from generate_series(current_date + 1, current_date + 90, interval '1 day') d
  where to_char(d, 'MM-DD') in ('01-01','05-01','07-18','08-25','12-25') order by d limit 1;
  if feriado is not null then
    begin
      perform public.solicitar_cita(feriado, 'Espalda');
      raise exception 'Se aceptó una reserva en feriado';
    exception when insufficient_privilege or check_violation then null; end;
  end if;
end $$;
rollback;`;
  const output = execFileSync('docker', ['exec','-i','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
  assert.match(output, /ROLLBACK/);
});
