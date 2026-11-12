import Link from 'next/link';
import { accesoAdministrador } from './acceso';

type Cliente = { id: string; nombre: string; email: string; telefono: string; sexo: string };

export default async function Clientes() {
  const acceso = await accesoAdministrador();
  if (acceso.estado !== 'autorizado') return <main className="container"><h1>Clientes</h1>
    <p role={acceso.estado === 'error' ? 'alert' : undefined}>{acceso.estado === 'sin_sesion' ? 'Ingresá con una cuenta de administrador para consultar los clientes.' : acceso.estado === 'sin_acceso' ? 'No tenés acceso a esta sección.' : 'No se pudo comprobar el acceso. Intentá nuevamente.'}</p>
    <Link href="/">Volver al inicio</Link></main>;

  const clientes: Cliente[] = [];
  let error = false;
  const porPagina = 500;
  for (let desde = 0; ; desde += porPagina) {
    const resultado = await acceso.supabase.rpc('clientes_administrador', { p_cliente_id: null }).range(desde, desde + porPagina - 1);
    if (resultado.error) { error = true; break; }
    clientes.push(...(resultado.data ?? []));
    if ((resultado.data ?? []).length < porPagina) break;
  }
  return <main className="container clientes-admin"><h1>Clientes</h1><Link href="/agenda-admin">Volver a la agenda administrativa</Link>
    <section className="mis-citas" aria-label="Lista de clientes">
      {error ? <><p role="alert">No se pudieron cargar los clientes. Intentá nuevamente.</p><Link href="/agenda-admin/clientes">Reintentar</Link></> :
        clientes.length === 0 ? <p>No hay clientes registrados.</p> :
          <ul>{clientes.map(cliente => <li key={cliente.id}>
            <Link href={`/agenda-admin/clientes/${cliente.id}`}>{cliente.nombre}</Link><p>{cliente.email}</p>
          </li>)}</ul>}
    </section>
  </main>;
}
