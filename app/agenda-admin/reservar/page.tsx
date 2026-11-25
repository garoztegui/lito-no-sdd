import BotonVolver from '../../boton-volver';
import { accesoAdministrador } from '../clientes/acceso';
import FormularioReserva from './formulario';

export default async function Reservar() {
  const acceso = await accesoAdministrador();
  if (acceso.estado !== 'autorizado') return <main className="container"><h1>Reservar una cita</h1><p>No tenés acceso a esta sección.</p><BotonVolver href="/">Volver al inicio</BotonVolver></main>;
  const clientes: { id: string; nombre: string; email: string }[] = [];
  for (let desde = 0; ; desde += 500) {
    const resultado = await acceso.supabase.rpc('clientes_administrador', { p_cliente_id: null }).range(desde, desde + 499);
    if (resultado.error) return <main className="container"><h1>Reservar una cita</h1><p role="alert">No se pudieron cargar los usuarios.</p><BotonVolver href="/agenda-admin">Volver a administración</BotonVolver></main>;
    clientes.push(...(resultado.data ?? []).filter((cliente: { id: string }) => cliente.id !== acceso.usuarioId));
    if ((resultado.data ?? []).length < 500) break;
  }
  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-UY'));
  return <main className="container"><h1>Administración</h1><BotonVolver href="/agenda-admin">Volver a administración</BotonVolver><FormularioReserva clientes={clientes} /></main>;
}
