import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import GestionarCita from './gestionar-cita';
import DatosClienteModal from './datos-cliente-modal';
import Disponibilidad from './disponibilidad';
import Bloqueos from './bloqueos';
import Servicios from './servicios';
import MenuAdmin from '../menu-admin';

const formato = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'America/Montevideo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

type Cita = { id: string; inicio: string; servicio: string; estado: string; nombre: string; email: string; telefono: string; sexo: string };

const mensajes: Record<string, string> = {
  aceptada: 'Solicitud aceptada. La cita quedó confirmada.',
  rechazada: 'Solicitud rechazada. El horario vuelve a estar disponible.',
  propuesta: 'Propuesta de horario registrada.',
  horario_ocupado: 'El horario elegido no está disponible. Elegí otro.',
  cancelada: 'La solicitud venció y se canceló. El horario quedó disponible.',
  ya_resuelta: 'La solicitud ya no está pendiente. Actualizá la agenda.',
  error: 'No se pudo actualizar la solicitud. Intentá nuevamente.',
};

export default async function AgendaAdmin({ searchParams }: { searchParams: Promise<{ seccion?: string; resultado?: string; citaId?: string; nuevoInicioLocal?: string; mes?: string; dia?: string }> }) {
  const parametros = await searchParams;
  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
  });
  const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !user) return <main className="container"><h1>Agenda administrativa</h1><p>Ingresá con una cuenta de administrador para consultar la agenda.</p><a href="/">Volver al inicio</a></main>;

  const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
  if (errorPerfil) return <main className="container"><h1>Agenda administrativa</h1><p role="alert">No se pudo comprobar el acceso. Intentá nuevamente.</p><a href="/agenda-admin">Reintentar</a></main>;
  if (!perfil?.es_administrador) return <main className="container"><h1>Agenda administrativa</h1><p>No tenés acceso a esta agenda.</p><a href="/">Volver al inicio</a></main>;

  const seccion = parametros.seccion ?? (parametros.resultado ? 'agenda' : '');
  if (!seccion) return <main className="container"><h1>Administración</h1><a href="/">Volver al inicio</a>
    <MenuAdmin />
  </main>;

  if (seccion !== 'agenda') return <main className="container"><h1>Administración</h1><a href="/agenda-admin">Volver a administración</a>
    {seccion === 'servicios' ? <Servicios /> : seccion === 'bloqueos' ? <Bloqueos /> : seccion === 'disponibilidad' ? <Disponibilidad /> : <p>Sección no disponible.</p>}
  </main>;

  const citas: Cita[] = [];
  let error = false;
  const porPagina = 500;
  for (let desde = 0; ; desde += porPagina) {
    const resultado = await supabase.rpc('agenda_administrador').range(desde, desde + porPagina - 1);
    if (resultado.error) { error = true; break; }
    citas.push(...(resultado.data ?? []));
    if ((resultado.data ?? []).length < porPagina) break;
  }
  const hoy = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const mes = typeof parametros.mes === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(parametros.mes) && Number(parametros.mes.slice(0, 4)) >= 1000 ? parametros.mes : hoy.slice(0, 7);
  const [anio, numeroMes] = mes.split('-').map(Number);
  const diasMes = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();
  const dia = typeof parametros.dia === 'string' && parametros.dia.startsWith(`${mes}-`) && /^\d{4}-\d{2}-\d{2}$/.test(parametros.dia) && Number(parametros.dia.slice(8)) >= 1 && Number(parametros.dia.slice(8)) <= diasMes ? parametros.dia : '';
  const fechaCita = (inicio: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(inicio));
  const diasConCitas = new Set(citas.map(cita => fechaCita(cita.inicio)));
  const citasDia = citas.filter(cita => fechaCita(cita.inicio) === dia).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const clientesPorEmail = new Map<string, string>();
  let errorClientes = false;
  if (citasDia.length) {
    const emails = [...new Set(citasDia.map(cita => cita.email))];
    for (let desde = 0; ; desde += porPagina) {
      const resultado = await supabase.rpc('clientes_administrador', { p_cliente_id: null }).in('email', emails).range(desde, desde + porPagina - 1);
      if (resultado.error) { errorClientes = true; break; }
      for (const cliente of resultado.data ?? []) clientesPorEmail.set(cliente.email, cliente.id);
      if ((resultado.data ?? []).length < porPagina) break;
    }
    if (citasDia.some(cita => !clientesPorEmail.has(cita.email))) errorClientes = true;
  }
  const mesRelativo = (desplazamiento: number) => new Date(Date.UTC(anio, numeroMes - 1 + desplazamiento, 1)).toISOString().slice(0, 7);
  const primerDia = (new Date(Date.UTC(anio, numeroMes - 1, 1)).getUTCDay() + 6) % 7;
  const tituloMes = new Intl.DateTimeFormat('es-UY', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(anio, numeroMes - 1, 1)));
  return <main className="container"><h1>Agenda administrativa</h1><a href="/agenda-admin">Volver a administración</a>
    {parametros.resultado && parametros.resultado !== 'horario_ocupado' && mensajes[parametros.resultado] && <p role="status">{mensajes[parametros.resultado]}</p>}
    {error ? <><p role="alert">No se pudo cargar la agenda. Intentá nuevamente.</p><a href="/agenda-admin?seccion=agenda">Reintentar</a></> : <>
      <section className="calendario-admin" aria-label="Calendario mensual">
        <div className="calendario-encabezado"><a href={`/agenda-admin?seccion=agenda&mes=${mesRelativo(-1)}`}>Mes anterior</a><h2>{tituloMes}</h2><a href={`/agenda-admin?seccion=agenda&mes=${mesRelativo(1)}`}>Mes siguiente</a></div>
        <p>Los días indican si tienen reservas futuras activas. Horarios de Montevideo.</p>
        <div className="calendario-leyenda" aria-label="Referencias del calendario"><span><i className="leyenda-con" aria-hidden="true" />Con reservas</span><span><i className="leyenda-sin" aria-hidden="true" />Sin reservas</span></div>
        <div className="calendario-grilla">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(nombre => <strong key={nombre}>{nombre}</strong>)}
          {Array.from({ length: primerDia }, (_, indice) => <span key={`vacio-${indice}`} />)}
          {Array.from({ length: diasMes }, (_, indice) => {
            const fecha = `${mes}-${String(indice + 1).padStart(2, '0')}`;
            const ocupado = diasConCitas.has(fecha);
            return <a key={fecha} className={ocupado ? 'dia-con-reservas' : 'dia-sin-reservas'} href={`/agenda-admin?seccion=agenda&mes=${mes}&dia=${fecha}`} aria-label={`${fecha}, ${ocupado ? 'con reservas' : 'sin reservas'}`} aria-current={dia === fecha ? 'date' : undefined}>{indice + 1}<span>{ocupado ? 'Con reservas' : 'Sin reservas'}</span></a>;
          })}
        </div>
      </section>
      {dia && <section className="reservas-dia" aria-label="Reservas del día"><h2>Reservas del {dia}</h2>
        {citasDia.length === 0 ? <p>No hay reservas para este día.</p> : errorClientes ? <><p role="alert">No se pudieron cargar los datos de los clientes. Intentá nuevamente.</p><a href={`/agenda-admin?seccion=agenda&mes=${mes}&dia=${dia}`}>Reintentar</a></> : <div className="tabla-clientes-contenedor" tabIndex={0} role="region" aria-label="Desplazar tabla de reservas">
          <table className="tabla-clientes tabla-reservas" aria-label="Reservas del día"><thead><tr><th scope="col">Hora</th><th scope="col">Nombre completo</th><th scope="col">Servicio</th><th scope="col">Estado</th></tr></thead>
            <tbody>{citasDia.map(cita => <tr key={cita.id}><td><time dateTime={cita.inicio}>{formato.format(new Date(cita.inicio))}</time></td><td><DatosClienteModal cliente={{ id: clientesPorEmail.get(cita.email)!, nombre: cita.nombre, email: cita.email, telefono: cita.telefono, sexo: cita.sexo }} /></td><td>{cita.servicio}</td><td>
              <GestionarCita key={`${cita.id}:${cita.estado}:${parametros.citaId === cita.id && parametros.resultado === 'horario_ocupado' ? Date.now() : ''}`} citaId={cita.id} nombre={cita.nombre} estado={cita.estado} dia={dia} fechaAnterior={parametros.citaId === cita.id ? parametros.nuevoInicioLocal : undefined} error={parametros.resultado === 'horario_ocupado' && parametros.citaId === cita.id ? mensajes.horario_ocupado : undefined} />
            </td></tr>)}</tbody>
          </table>
        </div>}
      </section>}
    </>}
  </main>;
}
