alter table public.perfiles
  add constraint nombre_obligatorio check (nombre is not null and length(trim(nombre)) > 0) not valid;
alter table public.perfiles
  add constraint telefono_obligatorio check (telefono is not null and length(trim(telefono)) > 0) not valid;
alter table public.perfiles
  add constraint sexo_opciones check (sexo is not null and sexo in ('Hombre', 'Mujer', 'Prefiero no especificar')) not valid;
