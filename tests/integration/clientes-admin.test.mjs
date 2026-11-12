import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const contenedor = process.env.STORY13_DB_CONTAINER ?? 'supabase_db_litov2';
const ejecutar = sql => execFileSync('docker', ['exec', '-i', contenedor, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

test('solo el administrador consulta datos e historial completo de cada cliente', () => {
  const sql = `begin;
    insert into auth.users (id, email, raw_user_meta_data) values
      ('00000000-0000-0000-0000-000000009941', 'story13-admin@example.test', '{"nombre":"Admin Prueba","telefono":"000","sexo":"Mujer"}'),
      ('00000000-0000-0000-0000-000000009942', 'story13-cliente@example.test', '{"nombre":"Cliente Prueba","telefono":"123","sexo":"Hombre"}'),
      ('00000000-0000-0000-0000-000000009943', 'story13-otro@example.test', '{"nombre":"Otro Cliente","telefono":"456","sexo":"Prefiero no especificar"}');
    update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000009941';
    insert into public.citas (cliente_id, inicio, servicio, estado) values
      ('00000000-0000-0000-0000-000000009942', now() - interval '20 days', 'Espalda', 'pendiente'),
      ('00000000-0000-0000-0000-000000009942', now() - interval '10 days', 'Cuerpo entero', 'confirmada'),
      ('00000000-0000-0000-0000-000000009942', now() + interval '300 days', 'Espalda', 'pendiente'),
      ('00000000-0000-0000-0000-000000009942', now() + interval '300 days 1 minute', 'Espalda', 'confirmada'),
      ('00000000-0000-0000-0000-000000009942', now() + interval '300 days 2 minutes', 'Espalda', 'propuesta'),
      ('00000000-0000-0000-0000-000000009942', now() + interval '300 days 3 minutes', 'Espalda', 'cancelada'),
      ('00000000-0000-0000-0000-000000009942', now() + interval '300 days 4 minutes', 'Espalda', 'rechazada'),
      ('00000000-0000-0000-0000-000000009943', now() + interval '300 days 5 minutes', 'Espalda', 'confirmada');
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009942', true);
    do $$ begin
      begin perform public.clientes_administrador(null); raise exception 'Cliente pudo listar datos'; exception when insufficient_privilege then null; end;
      begin perform public.clientes_administrador('00000000-0000-0000-0000-000000009943'); raise exception 'Cliente pudo consultar otro perfil'; exception when insufficient_privilege then null; end;
      begin perform public.historial_cliente_administrador('00000000-0000-0000-0000-000000009943'); raise exception 'Cliente pudo consultar historial ajeno'; exception when insufficient_privilege then null; end;
      begin perform private.clientes_administrador(null); raise exception 'Cliente pudo consultar la función privada'; exception when insufficient_privilege then null; end;
      begin perform private.historial_cliente_administrador('00000000-0000-0000-0000-000000009943'); raise exception 'Cliente pudo consultar historial privado'; exception when insufficient_privilege then null; end;
      if exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-000000009943')
        or exists (select 1 from public.citas where cliente_id = '00000000-0000-0000-0000-000000009943') then raise exception 'Se alteró el acceso a datos ajenos'; end if;
    end $$;
    select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000009941', true);
    do $$ begin
      if not exists (select 1 from public.clientes_administrador('00000000-0000-0000-0000-000000009942') where id = '00000000-0000-0000-0000-000000009942'
        and nombre = 'Cliente Prueba' and email = 'story13-cliente@example.test' and telefono = '123' and sexo = 'Hombre') then raise exception 'Datos incompletos'; end if;
      if (select count(*) from public.clientes_administrador('00000000-0000-0000-0000-000000009943')) <> 1 then raise exception 'No se encontró cliente sin historial propio'; end if;
      if (select count(*) from public.historial_cliente_administrador('00000000-0000-0000-0000-000000009942')) <> 7 then raise exception 'Historial incompleto o mezclado'; end if;
      if (select count(distinct estado) from public.historial_cliente_administrador('00000000-0000-0000-0000-000000009942')) <> 5 then raise exception 'Faltan estados'; end if;
      if (select count(*) from public.historial_cliente_administrador('00000000-0000-0000-0000-000000009943')) <> 1 then raise exception 'Historial ajeno mezclado'; end if;
      if has_function_privilege('anon', 'public.clientes_administrador(uuid)', 'execute') or has_function_privilege('anon', 'public.historial_cliente_administrador(uuid)', 'execute') then raise exception 'Anónimo tiene acceso'; end if;
    end $$;
    rollback;`;
  assert.match(ejecutar(sql), /ROLLBACK/);
});
