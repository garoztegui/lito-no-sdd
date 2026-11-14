'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { aceptarSolicitud, rechazarSolicitud } from './actions';
import CancelarCita from './cancelar-cita';
import ProponerHorario from './proponer-horario';
import ConfirmarCancelacion from '../confirmar-cancelacion';

export default function GestionarCita({ citaId, nombre, estado, dia, fechaAnterior, error }: { citaId: string; nombre: string; estado: string; dia: string; fechaAnterior?: string; error?: string }) {
  const [abierto, setAbierto] = useState(Boolean(error));
  const [confirmarRechazo, setConfirmarRechazo] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const formularioRechazo = useRef<HTMLFormElement>(null);
  const titulo = useId();
  useEffect(() => { if (abierto) dialogo.current?.showModal(); }, [abierto]);

  return <>
    <button type="button" className={`estado-cita estado-${estado}`} aria-label={`Gestionar cita de ${nombre}, estado ${estado}`} onClick={() => setAbierto(true)}>{estado}</button>
    {abierto && <dialog ref={dialogo} className="modal-gestion" aria-labelledby={titulo} onClose={() => setAbierto(false)}>
      <h2 id={titulo}>Gestionar cita de {nombre}</h2>
      <p>Estado: {estado}</p>
      {estado === 'pendiente' && <div className="acciones-agenda">
        <form className="accion-simple" action={aceptarSolicitud}><input type="hidden" name="citaId" value={citaId} /><input type="hidden" name="diaAgenda" value={dia} /><button type="submit">Aceptar solicitud</button></form>
        <form className="accion-simple" ref={formularioRechazo} action={rechazarSolicitud}><input type="hidden" name="citaId" value={citaId} /><input type="hidden" name="diaAgenda" value={dia} /><button type="button" onClick={() => setConfirmarRechazo(true)}>Rechazar solicitud</button></form>
        <ProponerHorario citaId={citaId} diaAgenda={dia} fechaAnterior={fechaAnterior} error={error} />
      </div>}
      {estado === 'confirmada' && <CancelarCita citaId={citaId} />}
      {estado === 'propuesta' && <p>Esperando respuesta del cliente.</p>}
      {confirmarRechazo && <ConfirmarCancelacion titulo="Confirmar rechazo" mensaje="¿Estás seguro de rechazar la solicitud?" onNo={() => setConfirmarRechazo(false)} onSi={() => { setConfirmarRechazo(false); formularioRechazo.current?.requestSubmit(); }} />}
      <button type="button" className="cerrar-gestion" onClick={() => dialogo.current?.close()}>Cerrar</button>
    </dialog>}
  </>;
}
