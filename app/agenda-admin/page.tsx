import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const formato = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'America/Montevideo', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23',
});

type Cita = { inicio: string; servicio: string; estado: string; nombre: string; email: string; telefono: string; sexo: string };

export default async function AgendaAdmin() {
  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
  });
  const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !user) return <main className="container"><h1>Agenda administrativa</h1><p>Ingresá con una cuenta de administrador para consultar la agenda.</p><a href="/">Volver al inicio</a></main>;

  const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
  if (errorPerfil) return <main className="container"><h1>Agenda administrativa</h1><p role="alert">No se pudo comprobar el acceso. Intentá nuevamente.</p><a href="/agenda-admin">Reintentar</a></main>;
  if (!perfil?.es_administrador) return <main className="container"><h1>Agenda administrativa</h1><p>No tenés acceso a esta agenda.</p><a href="/">Volver al inicio</a></main>;

  const citas: Cita[] = [];
  let error = false;
  const porPagina = 500;
  for (let desde = 0; ; desde += porPagina) {
    const resultado = await supabase.rpc('agenda_administrador').range(desde, desde + porPagina - 1);
    if (resultado.error) { error = true; break; }
    citas.push(...(resultado.data ?? []));
    if ((resultado.data ?? []).length < porPagina) break;
  }
  return <main className="container"><h1>Agenda administrativa</h1><a href="/">Volver al inicio</a>
    <section className="mis-citas" aria-label="Citas futuras">
      {error ? <><p role="alert">No se pudo cargar la agenda. Intentá nuevamente.</p><a href="/agenda-admin">Reintentar</a></> :
        citas.length === 0 ? <p>No hay citas futuras.</p> : <ul>{citas.map(cita => <li key={`${cita.inicio}-${cita.email}`}>
          <h2>{cita.servicio}</h2><p><time dateTime={cita.inicio}>{formato.format(new Date(cita.inicio))}</time> (Montevideo)</p>
          <p>Estado: {cita.estado}</p><p>Nombre completo: {cita.nombre}</p><p>Email: {cita.email}</p><p>Teléfono: {cita.telefono}</p><p>Sexo: {cita.sexo}</p>
        </li>)}</ul>}
    </section>
  </main>;
}
