'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmarCancelacion from '../confirmar-cancelacion';
import { cancelarDesdeAgenda } from './actions';
import EsperaAccion from '../espera-accion';

export default function CancelarCita({ citaId }: { citaId: string }) {
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const router = useRouter();
  async function cancelar() {
    if (ocupado) return;
    setConfirmar(false);
    setOcupado(true);
    try {
      const resultado = await cancelarDesdeAgenda(citaId, motivo);
      setMensaje(resultado === 'cancelada' ? 'La cita quedó cancelada.' : resultado === 'fuera_de_plazo' ? 'No se puede cancelar la cita: falta menos de una hora.' : 'No se pudo cancelar la cita.');
      if (resultado === 'cancelada') router.refresh();
    } catch { setMensaje('No se pudo cancelar la cita.'); }
    finally { setOcupado(false); }
  }
  return <>
    {ocupado && <EsperaAccion />}
    <form onSubmit={event => { event.preventDefault(); setConfirmar(true); }}>
      <label>Motivo de cancelación<textarea value={motivo} onChange={event => setMotivo(event.target.value)} required /></label>
      <button type="submit" disabled={ocupado}>Cancelar cita</button>
    </form>
    {mensaje && <p role="status">{mensaje}</p>}
    {confirmar && <ConfirmarCancelacion mensaje="¿Estás seguro de cancelar la cita?" onNo={() => setConfirmar(false)} onSi={() => void cancelar()} />}
  </>;
}
