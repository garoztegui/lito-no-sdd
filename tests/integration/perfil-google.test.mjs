import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('Google permite un perfil incompleto pero exige completarlo para gestionar citas', () => {
  const sql = `begin;
    insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009951', 'google@example.test', '{"provider":"google"}', '{"full_name":"Cliente Google","telefono":"123","sexo":"Mujer"}');
    do $$ begin
      if not exists (select 1 from public.perfiles where id='00000000-0000-0000-0000-000000009951' and nombre='Cliente Google' and telefono is null and sexo is null) then
        raise exception 'perfil Google no creado correctamente';
      end if;
      begin
        insert into auth.users (id,email,raw_app_meta_data,raw_user_meta_data) values
          ('00000000-0000-0000-0000-000000009952','email@example.test','{"provider":"email"}','{}');
        raise exception 'registro incompleto por contraseña permitido';
      exception when check_violation then null; end;
    end $$;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009951', true);
    do $$ declare comando text; begin
      for comando in select unnest(array[
        'select * from public.listar_servicios()',
        'select * from public.disponibilidad_semanal()',
        'select * from public.horarios_ocupados(now(), now() + interval ''30 days'')',
        'select * from public.horarios_bloqueados(current_date)',
        'select * from private.listar_servicios()',
        'select * from private.disponibilidad_semanal_actual()',
        'select * from private.horarios_ocupados(now(), now() + interval ''30 days'')',
        'select * from private.horarios_bloqueados(current_date)',
        'select private.inicio_disponible(now())',
        'select public.reclamar_bienvenida()',
        'select private.reclamar_bienvenida()'
      ]) loop
        begin
          execute comando;
          raise exception 'consulta permitida con perfil incompleto: %', comando;
        exception when insufficient_privilege then null; end;
      end loop;
      begin
        insert into public.citas (inicio, servicio) values (now() + interval '10 days', 'Espalda');
        raise exception 'reserva con perfil incompleto permitida';
      exception when insufficient_privilege then null; end;
      begin
        update public.perfiles set telefono='123' where id='00000000-0000-0000-0000-000000009951';
        raise exception 'perfil parcialmente completado permitido';
      exception when check_violation then null; end;
    end $$;
    update public.perfiles set telefono='123', sexo='Mujer' where id='00000000-0000-0000-0000-000000009951';
    do $$ begin
      if not exists (select 1 from public.perfiles where id='00000000-0000-0000-0000-000000009951' and nombre='Cliente Google' and telefono='123' and sexo='Mujer') then
        raise exception 'perfil completo no guardado';
      end if;
      perform * from public.listar_servicios();
      perform * from public.disponibilidad_semanal();
      perform * from public.horarios_ocupados(now(), now() + interval '30 days');
      perform * from public.horarios_bloqueados(current_date);
      perform private.inicio_disponible(now());
      if not public.reclamar_bienvenida() or public.reclamar_bienvenida() then
        raise exception 'el intento de bienvenida no se conservó para el perfil completo';
      end if;
    end $$;
    rollback;`;
  const resultado = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(resultado, /ROLLBACK/);
});
