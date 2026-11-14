'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gestionarCita } from './acciones';
import SelectorHorario from '../../../selector-horario';
import ConfirmarCancelacion from '../../../confirmar-cancelacion';

type Accion = 'aceptar' | 'rechazar' | 'proponer' | 'cancelar';
const mensajes: Record<string, string> = {
  rechazada: 'Solicitud rechazada. El horario quedó disponible.',
  confirmada: 'Solicitud aceptada. La cita quedó confirmada.',
  propuesta: 'Propuesta de horario registrada.',
  cancelada: 'La cita quedó cancelada. El horario quedó disponible.',
  fuera_de_plazo: 'No se puede cancelar la cita: faltan 24 horas o menos.',
  motivo_invalido: 'Ingresá un motivo de cancelación.',
  horario_invalido: 'Elegí un horario válido y disponible.',
  horario_no_disponible: 'El horario elegido ya no está disponible. Elegí otro.',
  no_pendiente: 'La solicitud ya no está pendiente.',
  no_disponible: 'La cita ya no permite esta acción.',
  sin_acceso: 'No tenés acceso para gestionar esta cita.',
  error: 'No se pudo actualizar la cita. Intentá nuevamente.',
};

export default function AccionesCita({ clienteId, citaId, estado, futura }: { clienteId: string; citaId: string; estado: string; futura: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState<'status' | 'alert'>('status');
  const [horario, setHorario] = useState('');
  const [propuestaAbierta, setPropuestaAbierta] = useState(false);
  const [fechaPropuesta, setFechaPropuesta] = useState('');
  const [versionHorarios, setVersionHorarios] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);
  const [confirmarRechazo, setConfirmarRechazo] = useState(false);
  const pendiente = futura && estado === 'pendiente';
  const confirmada = futura && estado === 'confirmada';

  async function ejecutar(accion: Accion) {
    if (ocupado) return;
    setOcupado(true);
    setMensaje('');
    try {
      const resultado = await gestionarCita(clienteId, citaId, accion, accion === 'proponer' ? horario : accion === 'cancelar' ? motivo : '');
      if (accion === 'proponer' && (resultado === 'horario_no_disponible' || resultado === 'horario_invalido')) {
        setFechaPropuesta(horario.slice(0, 10));
        setHorario('');
        setVersionHorarios(valor => valor + 1);
      }
      const exitoso = ['confirmada', 'rechazada', 'propuesta', 'cancelada'].includes(resultado);
      setTipoMensaje(exitoso ? 'status' : 'alert');
      setMensaje(mensajes[resultado] ?? mensajes.error);
      if (exitoso || resultado === 'no_pendiente' || resultado === 'no_disponible') router.refresh();
    } catch {
      setTipoMensaje('alert');
      setMensaje(mensajes.error);
    } finally { setOcupado(false); }
  }

  if (!pendiente && !confirmada && !mensaje) return null;
  return <div className="acciones-historial">
    {mensaje && <p role={tipoMensaje}>{mensaje}</p>}
    {pendiente && <>
      <form aria-label="Aceptar solicitud" onSubmit={event => { event.preventDefault(); void ejecutar('aceptar'); }}>
        <button type="submit" disabled={ocupado}>Aceptar solicitud</button>
      </form>
      <form aria-label="Rechazar solicitud" onSubmit={event => { event.preventDefault(); setConfirmarRechazo(true); }}>
        <button type="submit" disabled={ocupado}>Rechazar solicitud</button>
      </form>
      <form aria-label="Proponer horario" onSubmit={event => { event.preventDefault(); void ejecutar('proponer'); }}>
        {!propuestaAbierta ? <button type="button" disabled={ocupado} onClick={() => setPropuestaAbierta(true)}>Proponer otro horario</button> : <>
        <SelectorHorario key={versionHorarios} initialValue={fechaPropuesta} onChange={setHorario} disabled={ocupado} />
        <button type="submit" disabled={ocupado || !horario}>Confirmar propuesta</button>
        </>}
      </form>
    </>}
    {confirmada && <form aria-label="Cancelar cita" onSubmit={event => { event.preventDefault(); setConfirmarCancelacion(true); }}>
      <label>Motivo de cancelación<textarea required value={motivo} onChange={event => setMotivo(event.target.value)} /></label>
      <button type="submit" disabled={ocupado}>Cancelar cita</button>
    </form>}
    {confirmarCancelacion && <ConfirmarCancelacion mensaje="¿Estás seguro de cancelar la cita?" onNo={() => setConfirmarCancelacion(false)} onSi={() => { setConfirmarCancelacion(false); void ejecutar('cancelar'); }} />}
    {confirmarRechazo && <ConfirmarCancelacion titulo="Confirmar rechazo" mensaje="¿Estás seguro de rechazar la solicitud?" onNo={() => setConfirmarRechazo(false)} onSi={() => { setConfirmarRechazo(false); void ejecutar('rechazar'); }} />}
  </div>;
}
