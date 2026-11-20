"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usePlazos } from './plazos';

export default function ConfiguracionPlazos() {
  const { plazos, error: errorCarga } = usePlazos();
  const inicializado = useRef(false);
  const [administrador, setAdministrador] = useState(false);
  const [reserva, setReserva] = useState('');
  const [cancelacion, setCancelacion] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function comprobar() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const perfil = await supabase.from('perfiles').select('es_administrador').eq('id', data.user.id).maybeSingle();
      if (vigente && perfil.data?.es_administrador) setAdministrador(true);
    }
    void comprobar();
    return () => { vigente = false; };
  }, []);
  useEffect(() => {
    if (plazos && !inicializado.current) { setReserva(String(plazos.reserva)); setCancelacion(String(plazos.cancelacion)); inicializado.current = true; }
  }, [plazos]);
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado) return;
    setOcupado(true); setMensaje(''); setError('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const resultado = await supabase.rpc('guardar_plazos', { p_reserva: Number(reserva), p_cancelacion: Number(cancelacion) });
      if (resultado.error) throw resultado.error;
      setMensaje('Plazos guardados.');
    } catch { setError('No se pudieron guardar los plazos. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }
  if (!administrador) return null;
  return <section className="configuracion-aplicacion" aria-labelledby="titulo-plazos">
    <h2 id="titulo-plazos">Plazos de reserva y cancelación</h2>
    {errorCarga ? <p role="alert">No se pudieron cargar los plazos.</p> : !plazos ? <p>Cargando plazos...</p> :
      <form onSubmit={guardar}>
        <label>Reserva (horas)<input type="number" required min="1" max="2147483647" step="1" value={reserva} disabled={ocupado} onChange={e => setReserva(e.target.value)} /></label>
        <p>Anticipación mínima para reservar. También determina cuándo vencen las solicitudes y propuestas pendientes.</p>
        <label>Cancelación del cliente (horas)<input type="number" required min="1" max="2147483647" step="1" value={cancelacion} disabled={ocupado} onChange={e => setCancelacion(e.target.value)} /></label>
        <p>La cita puede cancelarse cuando falta más de este plazo. Rechazar una propuesta cancela la cita incluso dentro del plazo.</p>
        <button type="submit" disabled={ocupado}>GUARDAR</button>
        {error && <p role="alert">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
      </form>}
  </section>;
}
