begin;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000101', 'admin-story4@example.test', '{"nombre":"Admin","telefono":"000","sexo":"Mujer"}'),
 ('00000000-0000-0000-0000-000000000102', 'cliente-story4@example.test', '{"nombre":"Cliente Ejemplo","telefono":"123","sexo":"Hombre"}');
update public.perfiles set es_administrador = true where id = '00000000-0000-0000-0000-000000000101';
insert into public.citas (cliente_id, inicio, servicio, estado) values
 ('00000000-0000-0000-0000-000000000102', now() + interval '1 day', 'Espalda', 'pendiente'),
 ('00000000-0000-0000-0000-000000000102', now() + interval '2 days', 'Cuerpo entero', 'confirmada'),
 ('00000000-0000-0000-0000-000000000102', now() - interval '1 day', 'Espalda', 'pendiente');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
do $$ begin
 if (select count(*) from public.agenda_administrador() where email = 'cliente-story4@example.test' and nombre = 'Cliente Ejemplo' and telefono = '123' and sexo = 'Hombre') <> 2 then
   raise exception 'Administrator must see both future appointments and client data';
 end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
do $$ begin
 if exists (select 1 from public.agenda_administrador()) then raise exception 'Customer accessed administrative agenda'; end if;
end $$;
rollback;
