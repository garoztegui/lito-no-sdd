'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { conLimite } from './limite';

type Cita = { id: string; inicio: string; servicio: string; estado: string };
const formato = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'America/Montevideo', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23',
});

export default function MisCitas({ version, onCancelacion }: { version: number; onCancelacion: () => void }) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);
  const [ahora, setAhora] = useState<number | null>(null);
  const [respuesta, setRespuesta] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState(false);

  async function cancelar(citaId: string) {
    setRespondiendo(true);
    setRespuesta(null);
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { data, error } = await supabase.rpc('cancelar_cita_cliente', { p_cita_id: citaId });
      if (error) throw error;
      setRespuesta(data === 'cancelada' ? 'La cita quedó cancelada.' : data === 'fuera_de_plazo' ? 'Ya no podés cancelar esta cita: faltan 24 horas o menos.' : 'La cita ya no está disponible para cancelar.');
      if (data === 'cancelada') onCancelacion();
      setIntento(valor => valor + 1);
    } catch {
      setRespuesta('No se pudo cancelar la cita. Intentá nuevamente.');
    } finally {
      setRespondiendo(false);
    }
  }

  async function responder(citaId: string, decision: 'aceptar' | 'rechazar') {
    setRespondiendo(true);
    setRespuesta(null);
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { data, error } = await supabase.rpc('responder_propuesta', { p_cita_id: citaId, p_decision: decision });
      if (error) throw error;
      setRespuesta(data === 'confirmada' ? 'La cita quedó confirmada.' : data === 'cancelada' ? 'La cita quedó cancelada.' : 'La propuesta ya no está vigente.');
      setIntento(valor => valor + 1);
    } catch {
      setRespuesta('No se pudo responder la propuesta. Intentá nuevamente.');
    } finally {
      setRespondiendo(false);
    }
  }

  useEffect(() => {
    setAhora(Date.now());
  }, []);

  useEffect(() => {
    let vigente = true;
    const controlador = new AbortController();
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    setEstado('cargando');

    async function cargar() {
      const resultado: Cita[] = [];
      const porPagina = 500;
      for (let desde = 0; ; desde += porPagina) {
        const { data, error } = await conLimite(signal => supabase.from('citas')
          .select('id,inicio,servicio,estado').order('inicio', { ascending: false })
          .range(desde, desde + porPagina - 1).abortSignal(signal), controlador);
        if (error) throw error;
        if (!vigente) return;
        resultado.push(...(data ?? []));
        if ((data ?? []).length < porPagina) break;
      }
      if (vigente) { setCitas(resultado); setEstado('listo'); }
    }

    cargar().catch(() => { if (vigente) setEstado('error'); });
    return () => { vigente = false; controlador.abort(); };
  }, [version, intento]);

  useEffect(() => {
    const instanteActual = Date.now();
    const proximoVencimiento = citas
      .filter(cita => cita.estado === 'pendiente' || cita.estado === 'propuesta')
      .map(cita => Date.parse(cita.inicio) - 24 * 60 * 60 * 1000)
      .filter(vencimiento => vencimiento > instanteActual)
      .sort((a, b) => a - b)[0];
    if (proximoVencimiento === undefined) return;

    const demora = Math.min(
      Math.max(proximoVencimiento - instanteActual + 1, 0),
      2_147_483_647,
    );
    const temporizador = setTimeout(() => setAhora(Date.now()), demora);
    return () => clearTimeout(temporizador);
  }, [citas, ahora]);

  return <section className="mis-citas" aria-labelledby="titulo-mis-citas">
    <h2 id="titulo-mis-citas">Mis citas</h2>
    {respuesta && <p role="status">{respuesta}</p>}
    {estado === 'cargando' ? <p role="status">Cargando tus citas...</p> :
      estado === 'error' ? <><p role="alert">No se pudieron cargar tus citas.</p><button type="button" aria-label="Reintentar cargar mis citas" onClick={() => setIntento(valor => valor + 1)}>Reintentar</button></> :
      citas.length === 0 ? <p>Todavía no tenés citas.</p> :
      <ul>{citas.map(cita => {
        const estadoVisible = ahora !== null && (cita.estado === 'pendiente' || cita.estado === 'propuesta')
          && Date.parse(cita.inicio) <= ahora + 24 * 60 * 60 * 1000 ? 'cancelada' : cita.estado;
        return <li key={cita.id}>
          <h3>{cita.servicio}</h3>
          <p><time dateTime={cita.inicio}>{formato.format(new Date(cita.inicio))}</time> (Montevideo)</p>
          <p>Estado: <strong>{estadoVisible.charAt(0).toUpperCase() + estadoVisible.slice(1)}</strong></p>
          {(estadoVisible === 'pendiente' || estadoVisible === 'confirmada') && ahora !== null && Date.parse(cita.inicio) > ahora &&
            <button type="button" disabled={respondiendo} onClick={() => cancelar(cita.id)}>Cancelar cita</button>}
          {estadoVisible === 'propuesta' && <div className="acciones-cita">
            <button type="button" disabled={respondiendo} onClick={() => responder(cita.id, 'aceptar')}>Aceptar propuesta</button>
            <button type="button" disabled={respondiendo} onClick={() => responder(cita.id, 'rechazar')}>Rechazar propuesta</button>
          </div>}
        </li>;
      })}</ul>}
  </section>;
}
