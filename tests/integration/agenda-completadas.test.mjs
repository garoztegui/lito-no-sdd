import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('la agenda muestra citas confirmadas pasadas solo al administrador', () => {
  const sql = `begin;
    insert into auth.users (id,email,raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009971','admin-completadas@example.test','{"nombre":"Admin","telefono":"123","sexo":"Hombre"}'),
      ('00000000-0000-0000-0000-000000009972','cliente-completadas@example.test','{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}');
    update public.perfiles set es_administrador=true where id='00000000-0000-0000-0000-000000009971';
    insert into public.citas (id,cliente_id,inicio,servicio,estado) values
      ('00000000-0000-0000-0000-000000009973','00000000-0000-0000-0000-000000009972',now()-interval '2 days','Espalda','confirmada'),
      ('00000000-0000-0000-0000-000000009974',null,now()-interval '3 days','Espalda','confirmada'),
      ('00000000-0000-0000-0000-000000009975','00000000-0000-0000-0000-000000009972',now()-interval '4 days','Espalda','cancelada');
    insert into private.citas_invitados (cita_id,nombre) values ('00000000-0000-0000-0000-000000009974','Invitado');
    set local role authenticated;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009971',true);
    do $$ begin
      if not exists(select 1 from public.agenda_completadas(date_trunc('month',timezone('America/Montevideo',now()-interval '2 days'))::date) where id='00000000-0000-0000-0000-000000009973' and nombre='Cliente') then raise exception 'falta cliente'; end if;
      if not exists(select 1 from public.agenda_completadas(date_trunc('month',timezone('America/Montevideo',now()-interval '3 days'))::date) where id='00000000-0000-0000-0000-000000009974' and nombre='Invitado' and invitado) then raise exception 'falta invitado'; end if;
      if exists(select 1 from public.agenda_completadas(date_trunc('month',timezone('America/Montevideo',now()-interval '4 days'))::date) where id='00000000-0000-0000-0000-000000009975') then raise exception 'cancelada incluida'; end if;
    end $$;
    select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009972',true);
    do $$ begin if exists(select 1 from public.agenda_completadas(date_trunc('month',now())::date)) then raise exception 'cliente accedió'; end if; end $$;
    rollback;`;
  const output = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(output, /ROLLBACK/);
});
