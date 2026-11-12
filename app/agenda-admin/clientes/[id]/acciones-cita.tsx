'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { gestionarCita } from './acciones';
import SelectorHorario from '../../../selector-horario';

type Accion = 'rechazar' | 'proponer' | 'cancelar';
const mensajes: Record<string, string> = {
  rechazada: 'Solicitud rechazada. El horario quedó disponible.',
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
  const pendiente = futura && estado === 'pendiente';
  const confirmada = futura && estado === 'confirmada';

  async function ejecutar(event: FormEvent<HTMLFormElement>, accion: Accion) {
    event.preventDefault();
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
      const exitoso = ['rechazada', 'propuesta', 'cancelada'].includes(resultado);
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
      <form aria-label="Rechazar solicitud" onSubmit={event => void ejecutar(event, 'rechazar')}>
        <button type="submit" disabled={ocupado}>Rechazar solicitud</button>
      </form>
      {!propuestaAbierta ? <button type="button" disabled={ocupado} onClick={() => setPropuestaAbierta(true)}>Proponer otro horario</button> : <form aria-label="Proponer horario" onSubmit={event => void ejecutar(event, 'proponer')}>
        <SelectorHorario key={versionHorarios} initialValue={fechaPropuesta} onChange={setHorario} disabled={ocupado} />
        <button type="submit" disabled={ocupado || !horario}>Confirmar propuesta</button>
      </form>}
    </>}
    {confirmada && <form aria-label="Cancelar cita" onSubmit={event => void ejecutar(event, 'cancelar')}>
      <label>Motivo de cancelación<textarea required value={motivo} onChange={event => setMotivo(event.target.value)} /></label>
      <button type="submit" disabled={ocupado}>Cancelar cita</button>
    </form>}
  </div>;
}
