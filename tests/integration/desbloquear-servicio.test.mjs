import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('solo el administrador desbloquea el servicio y habilita nuevas reservas', () => {
  const sql = `begin;
    insert into auth.users (id,email,raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009981','admin-desbloquear@example.test','{"nombre":"Admin","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009982','cliente-desbloquear@example.test','{"nombre":"Cliente","telefono":"123","sexo":"Hombre"}');
    update public.perfiles set es_administrador=true where id='00000000-0000-0000-0000-000000009981';
    insert into private.servicios (id,nombre,bloqueado) values ('00000000-0000-0000-0000-000000009983','Servicio desbloqueo prueba',true);
    select set_config('test.slot', (select slot::text from (select ((current_date+n)::timestamp + time '10:00') at time zone 'America/Montevideo' slot from generate_series(15,70) n) s
      where private.inicio_disponible(slot) and not exists(select 1 from public.citas c where c.inicio=slot and c.estado in ('pendiente','confirmada','propuesta')) limit 1), true);
    set local role authenticated;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009982',true);
    do $$ begin
      begin perform public.desbloquear_servicio('00000000-0000-0000-0000-000000009983'); raise exception 'cliente pudo desbloquear'; exception when insufficient_privilege then null; end;
      if exists(select 1 from public.listar_servicios() where nombre='Servicio desbloqueo prueba') then raise exception 'servicio bloqueado visible'; end if;
    end $$;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009981',true);
    do $$ begin
      if public.desbloquear_servicio('00000000-0000-0000-0000-000000009983') <> 'desbloqueado' then raise exception 'no desbloqueó'; end if;
      if public.desbloquear_servicio('00000000-0000-0000-0000-000000009984') <> 'no_disponible' then raise exception 'servicio inexistente'; end if;
      if not exists(select 1 from public.listar_servicios_admin() where id='00000000-0000-0000-0000-000000009983' and not bloqueado) then raise exception 'estado no actualizado'; end if;
    end $$;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009982',true);
    do $$ begin
      if not exists(select 1 from public.listar_servicios() where nombre='Servicio desbloqueo prueba') then raise exception 'servicio no disponible'; end if;
      perform public.solicitar_cita(current_setting('test.slot')::timestamptz,'Servicio desbloqueo prueba');
      if not exists(select 1 from public.citas where servicio='Servicio desbloqueo prueba' and estado='pendiente') then raise exception 'no se pudo reservar'; end if;
    end $$;
    rollback;`;
  const output = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(output, /ROLLBACK/);
});
