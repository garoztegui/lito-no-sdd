'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { consultarServicios, crearServicio, renombrarServicio, bloquearServicio, borrarServicio } from './servicios-actions';

type Servicio = { id: string; nombre: string; bloqueado: boolean };
type Dialogo = { servicio: Servicio; accion: 'renombrar' | 'bloquear' | 'borrar' };

function DialogoServicio({ dialogo, ocupado, mensaje, cerrar, guardar, confirmar }: {
  dialogo: Dialogo; ocupado: boolean; mensaje: string; cerrar: () => void;
  guardar: (event: FormEvent<HTMLFormElement>, id: string) => void; confirmar: () => void;
}) {
  const elemento = useRef<HTMLDialogElement>(null);
  useEffect(() => { elemento.current?.showModal(); }, []);
  const { servicio, accion } = dialogo;
  const titulo = accion === 'renombrar' ? 'Cambiar nombre' : accion === 'bloquear' ? 'Confirmar bloqueo' : 'Confirmar eliminación';
  return <dialog ref={elemento} aria-labelledby="titulo-dialogo-servicio" onCancel={event => { event.preventDefault(); if (!ocupado) cerrar(); }}>
    <h2 id="titulo-dialogo-servicio">{titulo}</h2>
    {accion === 'renombrar' ? <form noValidate onSubmit={event => guardar(event, servicio.id)}>
      <label>Nombre del servicio<input name="nombre" defaultValue={servicio.nombre} autoFocus /></label>
      {mensaje && <p role="alert">{mensaje}</p>}
      <div className="botones-confirmacion"><button type="button" disabled={ocupado} onClick={cerrar}>Cancelar</button><button type="submit" disabled={ocupado}>Guardar</button></div>
    </form> : <>
      <p>¿Estás seguro de {accion === 'bloquear' ? 'bloquear' : 'borrar'} el servicio {servicio.nombre}?</p>
      <div className="botones-confirmacion"><button type="button" disabled={ocupado} onClick={cerrar} autoFocus>Cancelar</button><button type="button" disabled={ocupado} onClick={confirmar}>Sí</button></div>
    </>}
  </dialog>;
}

export default function Servicios() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);
  const [seleccion, setSeleccion] = useState('');
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const mensajeGeneral = useRef<HTMLParagraphElement>(null);

  useEffect(() => { if (mensaje === 'Servicio borrado.') mensajeGeneral.current?.focus(); }, [mensaje]);

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
        else setDialogo(null);
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
        if (resultado === 'borrado') setSeleccion('');
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
    {mensaje && dialogo?.accion !== 'renombrar' && <p ref={mensajeGeneral} role="status" tabIndex={-1}>{mensaje}</p>}
    <section aria-labelledby="titulo-modificar-servicio">
      <h3 id="titulo-modificar-servicio">Modificar servicio</h3>
      {servicios === null ? <p>{mensaje ? 'No se pudo cargar la lista.' : 'Cargando servicios...'}</p> : servicios.length === 0 ? <p>No hay servicios.</p> : <>
        <label>Seleccionar servicio<select value={seleccion} disabled={ocupado} onChange={event => { setSeleccion(event.target.value); setMensaje(''); }}>
          <option value="">Elegí un servicio</option>
          {servicios.map(servicio => <option key={servicio.id} value={servicio.id}>{servicio.nombre}</option>)}
        </select></label>
        {servicios.filter(servicio => servicio.id === seleccion).map(servicio => <div key={servicio.id}>
          <p>Estado: {servicio.bloqueado ? 'Bloqueado' : 'Disponible'}</p>
          <button type="button" disabled={ocupado} onClick={() => { setMensaje(''); setDialogo({ servicio, accion: 'renombrar' }); }}>Cambiar nombre</button>
          {!servicio.bloqueado && <button type="button" disabled={ocupado} onClick={() => { setMensaje(''); setDialogo({ servicio, accion: 'bloquear' }); }}>Bloquear servicio</button>}
          <button type="button" disabled={ocupado} onClick={() => { setMensaje(''); setDialogo({ servicio, accion: 'borrar' }); }}>Borrar servicio</button>
        </div>)}
      </>}
    </section>
    {dialogo && <DialogoServicio dialogo={dialogo} ocupado={ocupado} mensaje={mensaje} cerrar={() => { setDialogo(null); setMensaje(''); }} guardar={(event, id) => void guardar(event, id)} confirmar={() => { if (dialogo.accion !== 'renombrar') { const { servicio, accion } = dialogo; setDialogo(null); void retirar(servicio.id, accion); } }} />}
  </section>;
}
