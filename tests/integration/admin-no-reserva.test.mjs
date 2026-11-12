import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('un administrador no puede reservar ni por RPC ni por inserción directa; un cliente sí', () => {
  const sql = `begin;
    insert into auth.users (id,email,raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009951','admin-no-reserva@example.test','{"nombre":"Admin","telefono":"123","sexo":"Hombre"}'),
      ('00000000-0000-0000-0000-000000009952','cliente-reserva@example.test','{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009951';
    select set_config('test.slot', (select slot::text from (select ((current_date + n)::timestamp + time '10:00') at time zone 'America/Montevideo' as slot from generate_series(30,70) n) s
      where private.inicio_disponible(slot) and not exists (select 1 from public.citas c where c.inicio=slot and c.estado in ('pendiente','confirmada','propuesta')) limit 1), true);
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009951', true);
    do $$ begin
      begin perform public.solicitar_cita(current_setting('test.slot')::timestamptz, 'Espalda'); raise exception 'RPC permitió reservar'; exception when insufficient_privilege then null; end;
      begin insert into public.citas (inicio,servicio) values (current_setting('test.slot')::timestamptz,'Espalda'); raise exception 'inserción permitió reservar'; exception when insufficient_privilege then null; end;
    end $$;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009952', true);
    select public.solicitar_cita(current_setting('test.slot')::timestamptz, 'Espalda');
    do $$ begin
      if (select count(*) from public.citas where inicio=current_setting('test.slot')::timestamptz and cliente_id='00000000-0000-0000-0000-000000009952' and estado='pendiente') <> 1 then raise exception 'reserva del cliente falló'; end if;
    end $$;
    rollback;`;
  const result = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(result, /ROLLBACK/);
});
