'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { consultarServicios, crearServicio, renombrarServicio, bloquearServicio, borrarServicio } from './servicios-actions';

type Servicio = { id: string; nombre: string; bloqueado: boolean };

export default function Servicios() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    consultarServicios().then(data => { if (vigente) setServicios(data); })
      .catch(() => { if (vigente) setMensaje('No se pudo cargar el catálogo.'); });
    return () => { vigente = false; };
  }, [version]);

  async function guardar(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    if (ocupado) return;
    const formulario = event.currentTarget;
    const nombre = String(new FormData(formulario).get('nombre') ?? '').trim();
    if (!nombre) { setMensaje('Ingresá un nombre para el servicio.'); return; }
    setOcupado(true);
    setMensaje('');
    try {
      const resultado = id ? await renombrarServicio(id, nombre) : await crearServicio(nombre);
      if (resultado === 'nombre_existente') setMensaje('Ya existe un servicio con ese nombre.');
      else if (resultado === 'no_disponible') setMensaje('El servicio ya no está disponible.');
      else if (resultado === 'creado' || resultado === 'actualizado') {
        setMensaje(resultado === 'creado' ? 'Servicio creado.' : 'Servicio actualizado.');
        if (!id) formulario.reset();
        setVersion(valor => valor + 1);
        if (resultado === 'actualizado') router.refresh();
      } else throw new Error('Resultado inesperado');
    } catch { setMensaje('No se pudo guardar el servicio. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }

  async function retirar(id: string, accion: 'bloquear' | 'borrar') {
    if (ocupado) return;
    setOcupado(true);
    setMensaje('');
    try {
      const resultado = accion === 'bloquear' ? await bloquearServicio(id) : await borrarServicio(id);
      if (resultado === 'tiene_citas') setMensaje('El servicio tiene citas futuras. Podés bloquearlo para impedir nuevas reservas.');
      else if (resultado === 'no_disponible') setMensaje('El servicio ya no está disponible.');
      else if (resultado === 'bloqueado' || resultado === 'borrado') {
        setMensaje(resultado === 'bloqueado' ? 'Servicio bloqueado.' : 'Servicio borrado.');
        setVersion(valor => valor + 1);
      } else throw new Error('Resultado inesperado');
    } catch { setMensaje('No se pudo actualizar el servicio. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }

  return <section className="servicios" aria-labelledby="titulo-servicios">
    <h2 id="titulo-servicios">Catálogo de servicios</h2>
    <form onSubmit={event => void guardar(event)}>
      <label>Nombre del nuevo servicio<input name="nombre" required /></label>
      <button type="submit" disabled={ocupado}>Crear servicio</button>
    </form>
    {mensaje && <p role="status">{mensaje}</p>}
    {servicios === null ? <p>{mensaje ? 'No se pudo cargar la lista.' : 'Cargando servicios...'}</p> : servicios.length === 0 ? <p>No hay servicios.</p> :
      <ul>{servicios.map(servicio => <li key={`${servicio.id}-${servicio.nombre}`}>
        <form onSubmit={event => void guardar(event, servicio.id)}>
          <label>Nombre de {servicio.nombre}<input name="nombre" defaultValue={servicio.nombre} required /></label>
          <p>Estado: {servicio.bloqueado ? 'Bloqueado' : 'Disponible'}</p>
          <button type="submit" disabled={ocupado}>Guardar nombre</button>
          {!servicio.bloqueado && <button type="button" disabled={ocupado} aria-label={`Bloquear servicio ${servicio.nombre}`} onClick={() => void retirar(servicio.id, 'bloquear')}>Bloquear servicio</button>}
          <button type="button" disabled={ocupado} aria-label={`Borrar servicio ${servicio.nombre}`} onClick={() => void retirar(servicio.id, 'borrar')}>Borrar servicio</button>
        </form>
      </li>)}</ul>}
  </section>;
}
