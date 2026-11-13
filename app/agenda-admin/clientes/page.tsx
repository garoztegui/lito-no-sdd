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
  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-UY', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
  return <main className="container clientes-admin"><h1>Clientes</h1><Link href="/agenda-admin">Volver a la agenda administrativa</Link>
    <section className="lista-clientes" aria-label="Lista de clientes">
      {error ? <><p role="alert">No se pudieron cargar los clientes. Intentá nuevamente.</p><Link href="/agenda-admin/clientes">Reintentar</Link></> :
        clientes.length === 0 ? <p>No hay clientes registrados.</p> :
          <div className="tabla-clientes-contenedor" tabIndex={0} role="region" aria-label="Desplazar tabla de clientes">
            <table className="tabla-clientes" aria-label="Lista de clientes">
              <thead><tr><th scope="col">Nombre completo</th><th scope="col">Email</th><th scope="col">Teléfono</th><th scope="col">Sexo</th><th scope="col">Citas</th></tr></thead>
              <tbody>{clientes.map(cliente => <tr key={cliente.id}>
                <td>{cliente.nombre}</td><td>{cliente.email}</td><td>{cliente.telefono}</td><td>{cliente.sexo}</td>
                <td><Link className="boton-citas-cliente" href={`/agenda-admin/clientes/${cliente.id}`}>Ver citas del usuario</Link></td>
              </tr>)}</tbody>
            </table>
          </div>}
    </section>
  </main>;
}
