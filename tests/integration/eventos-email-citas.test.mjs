import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('se registran y reclaman una sola vez los emails de cada acción', () => {
  const sql = `begin;
    insert into auth.users (id,email,raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009981','cliente-email@example.test','{"nombre":"Cliente","telefono":"123","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009982','admin-email@example.test','{"nombre":"Admin","telefono":"123","sexo":"Hombre"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009982';
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009981', true);
    insert into public.citas (id, cliente_id, inicio, servicio, estado)
      select '00000000-0000-0000-0000-000000009983', '00000000-0000-0000-0000-000000009981', slot, 'Espalda', 'pendiente'
      from (select ((current_date + n)::timestamp + time '10:00') at time zone 'America/Montevideo' as slot from generate_series(30,70) n) s
      where private.inicio_disponible(slot) and not exists (select 1 from public.citas c where c.inicio = slot and c.estado in ('pendiente','confirmada','propuesta')) limit 1;
    do $$ begin
      if not exists (select 1 from public.citas where id='00000000-0000-0000-0000-000000009983') then raise exception 'no hay turno'; end if;
      if (select count(*) from private.eventos_email_citas where cita_id='00000000-0000-0000-0000-000000009983' and destinatario in ('cliente-email@example.test','admin-email@example.test')) <> 2 then raise exception 'faltan destinatarios'; end if;
      if has_function_privilege('authenticated','public.datos_email_cita(uuid)','execute') then raise exception 'datos privados expuestos'; end if;
    end $$;
    set local role authenticated;
    do $$ begin
      if (select count(*) from public.reclamar_emails_cita('00000000-0000-0000-0000-000000009983',null,'solicitud')) < 2 then raise exception 'reclamo incompleto'; end if;
      if exists (select 1 from public.reclamar_emails_cita('00000000-0000-0000-0000-000000009983',null,'solicitud')) then raise exception 'reintento permitido'; end if;
    end $$;
    reset role;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009982', true);
    update public.citas set estado = 'propuesta' where id='00000000-0000-0000-0000-000000009983';
    update public.citas set estado = 'pendiente' where id='00000000-0000-0000-0000-000000009983';
    update public.citas set estado = 'confirmada' where id='00000000-0000-0000-0000-000000009983';
    update public.citas set estado = 'cancelada', motivo_cancelacion='Motivo' where id='00000000-0000-0000-0000-000000009983';
    do $$ begin
      if (select count(*) from private.eventos_email_citas where cita_id='00000000-0000-0000-0000-000000009983' and tipo in ('propuesta','confirmacion','cancelacion')) <> 3 then raise exception 'faltan eventos'; end if;
    end $$;
    rollback;`;
  const result = execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.match(result, /ROLLBACK/);
});
