import Link from 'next/link';
import { accesoAdministrador } from '../acceso';
import BotonVolver from '../../../boton-volver';
import AccionesCita from './acciones-cita';
import TelefonoWhatsApp from '../../telefono-whatsapp';

type Cliente = { id: string; nombre: string; email: string; telefono: string; sexo: string };
type Cita = { id: string; inicio: string; servicio: string; estado: string };
const formato = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'America/Montevideo', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23',
});
const fechaMontevideo = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' });

export default async function HistorialCliente({ params }: { params: Promise<{ id: string }> }) {
  const acceso = await accesoAdministrador();
  if (acceso.estado !== 'autorizado') return <main className="container"><h1>Cliente</h1>
    <p role={acceso.estado === 'error' ? 'alert' : undefined}>{acceso.estado === 'sin_sesion' ? 'Ingresá con una cuenta de administrador para consultar clientes.' : acceso.estado === 'sin_acceso' ? 'No tenés acceso a esta sección.' : 'No se pudo comprobar el acceso. Intentá nuevamente.'}</p>
    <BotonVolver href="/">Volver al inicio</BotonVolver></main>;

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return <main className="container"><h1>Cliente</h1><p>No se encontró el cliente.</p><BotonVolver href="/agenda-admin/clientes">Volver a clientes</BotonVolver></main>;
  const { data, error: errorCliente } = await acceso.supabase.rpc('clientes_administrador', { p_cliente_id: id }).maybeSingle();
  if (errorCliente) return <main className="container"><h1>Cliente</h1><p role="alert">No se pudieron cargar los datos del cliente. Intentá nuevamente.</p><Link href={`/agenda-admin/clientes/${id}`}>Reintentar</Link></main>;
  const cliente = data as Cliente | null;
  if (!cliente) return <main className="container"><h1>Cliente</h1><p>No se encontró el cliente.</p><BotonVolver href="/agenda-admin/clientes">Volver a clientes</BotonVolver></main>;

  const citas: Cita[] = [];
  let errorHistorial = false;
  const porPagina = 500;
  for (let desde = 0; ; desde += porPagina) {
    const resultado = await acceso.supabase.rpc('historial_cliente_administrador', { p_cliente_id: id }).range(desde, desde + porPagina - 1);
    if (resultado.error) { errorHistorial = true; break; }
    citas.push(...(resultado.data ?? []));
    if ((resultado.data ?? []).length < porPagina) break;
  }
  return <main className="container clientes-admin"><h1>{cliente.nombre}</h1><BotonVolver href="/agenda-admin/clientes">Volver a clientes</BotonVolver>
    <section className="datos-cliente" aria-labelledby="titulo-datos-cliente">
      <h2 id="titulo-datos-cliente">Datos del cliente</h2>
      <p>Nombre completo: {cliente.nombre}</p><p>Email: {cliente.email}</p><p>Teléfono: <TelefonoWhatsApp telefono={cliente.telefono} /></p><p>Sexo: {cliente.sexo}</p>
    </section>
    <section className="mis-citas" aria-labelledby="titulo-historial">
      <h2 id="titulo-historial">Historial de citas</h2>
      {errorHistorial ? <><p role="alert">No se pudo cargar el historial. Intentá nuevamente.</p><Link href={`/agenda-admin/clientes/${id}`}>Reintentar</Link></> :
        citas.length === 0 ? <p>Este cliente no tiene citas.</p> : <ul>{citas.map(cita => <li key={cita.id}>
          <h3>{cita.servicio}</h3><p><time dateTime={cita.inicio}>{formato.format(new Date(cita.inicio))}</time> (Montevideo)</p><p>Estado: {cita.estado}</p>
          <AccionesCita clienteId={id} citaId={cita.id} estado={cita.estado} futura={Date.parse(cita.inicio) > Date.now()} fechaCita={fechaMontevideo.format(new Date(cita.inicio))} />
        </li>)}</ul>}
    </section>
  </main>;
}
