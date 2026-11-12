import { execFileSync } from 'node:child_process';

export function fechaConTurnoDisponible(): string {
  const consulta = `select to_char(dia, 'YYYY-MM-DD') from (
    select ((now() at time zone 'America/Montevideo')::date + n) as dia
    from generate_series(35, 85) n
  ) fechas where extract(isodow from dia) between 1 and 5
    and (select count(*) from public.citas c where c.estado in ('pendiente', 'confirmada', 'propuesta')
      and timezone('America/Montevideo', c.inicio)::date = fechas.dia
      and extract(hour from timezone('America/Montevideo', c.inicio)) between 7 and 18) < 12
    order by random() limit 1`;
  const fecha = execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  if (!fecha) throw new Error('No hay un día de prueba con horarios disponibles');
  return fecha;
}
