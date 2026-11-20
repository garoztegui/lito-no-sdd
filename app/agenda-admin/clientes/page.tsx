import Link from 'next/link';
import { accesoAdministrador } from './acceso';
import BotonVolver from '../../boton-volver';
import TelefonoWhatsApp from '../telefono-whatsapp';

type Cliente = { id: string; nombre: string; email: string; telefono: string; sexo: string };
type CitaAnonima = { id: string; inicio: string; servicio: string; estado: string; nombre: string };
const fecha = new Intl.DateTimeFormat('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'short', timeStyle: 'short' });

export default async function Clientes() {
  const acceso = await accesoAdministrador();
  if (acceso.estado !== 'autorizado') return <main className="container"><h1>Clientes</h1>
    <p role={acceso.estado === 'error' ? 'alert' : undefined}>{acceso.estado === 'sin_sesion' ? 'Ingresá con una cuenta de administrador para consultar los clientes.' : acceso.estado === 'sin_acceso' ? 'No tenés acceso a esta sección.' : 'No se pudo comprobar el acceso. Intentá nuevamente.'}</p>
    <BotonVolver href="/">Volver al inicio</BotonVolver></main>;

  const clientes: Cliente[] = [];
  let error = false;
  const porPagina = 500;
  for (let desde = 0; ; desde += porPagina) {
    const resultado = await acceso.supabase.rpc('clientes_administrador', { p_cliente_id: null }).range(desde, desde + porPagina - 1);
    if (resultado.error) { error = true; break; }
    clientes.push(...(resultado.data ?? []).filter((cliente: Cliente) => cliente.id !== acceso.usuarioId));
    if ((resultado.data ?? []).length < porPagina) break;
  }
  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-UY', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
  const anonimas: CitaAnonima[] = [];
  let errorAnonimas = false;
  for (let desde = 0; ; desde += porPagina) {
    const resultado = await acceso.supabase.rpc('citas_usuarios_eliminados').range(desde, desde + porPagina - 1);
    if (resultado.error) { errorAnonimas = true; break; }
    anonimas.push(...(resultado.data ?? []));
    if ((resultado.data ?? []).length < porPagina) break;
  }
  return <main className="container clientes-admin"><h1>Clientes</h1><BotonVolver href="/agenda-admin">Volver a la agenda administrativa</BotonVolver>
    <section className="lista-clientes" aria-label="Lista de clientes">
      {error ? <><p role="alert">No se pudieron cargar los clientes. Intentá nuevamente.</p><Link href="/agenda-admin/clientes">Reintentar</Link></> :
        clientes.length === 0 ? <p>No hay clientes registrados.</p> :
          <div className="tabla-clientes-contenedor" tabIndex={0} role="region" aria-label="Desplazar tabla de clientes">
            <table className="tabla-clientes" aria-label="Lista de clientes">
              <thead><tr><th scope="col">Nombre completo</th><th scope="col">Email</th><th scope="col">Teléfono</th><th scope="col">Sexo</th><th scope="col">Citas</th></tr></thead>
              <tbody>{clientes.map(cliente => <tr key={cliente.id}>
                <td>{cliente.nombre}</td><td>{cliente.email}</td><td><TelefonoWhatsApp telefono={cliente.telefono} /></td><td>{cliente.sexo}</td>
                <td><Link className="boton-citas-cliente" href={`/agenda-admin/clientes/${cliente.id}`}>Ver citas del usuario</Link></td>
              </tr>)}</tbody>
            </table>
          </div>}
    </section>
    <section className="lista-clientes" aria-labelledby="titulo-citas-eliminados">
      <h2 id="titulo-citas-eliminados">Citas de usuarios eliminados</h2>
      {errorAnonimas ? <p role="alert">No se pudieron cargar las citas de usuarios eliminados.</p> : anonimas.length === 0 ? <p>No hay citas de usuarios eliminados.</p> :
        <div className="tabla-clientes-contenedor" tabIndex={0} role="region" aria-label="Desplazar tabla de citas de usuarios eliminados">
          <table className="tabla-clientes"><thead><tr><th scope="col">Cliente</th><th scope="col">Fecha y hora</th><th scope="col">Servicio</th><th scope="col">Estado</th></tr></thead>
            <tbody>{anonimas.map(cita => <tr key={cita.id}><td>{cita.nombre}</td><td>{fecha.format(new Date(cita.inicio))}</td><td>{cita.servicio}</td><td>{cita.estado}</td></tr>)}</tbody>
          </table>
        </div>}
    </section>
  </main>;
}
