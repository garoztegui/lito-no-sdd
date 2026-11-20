'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, type FormEvent } from 'react';

export default function PreferenciaAgendaDiaria() {
  const [valor, setValor] = useState<boolean | null>(null);
  const [hora, setHora] = useState('06:00');
  const [solicitudes, setSolicitudes] = useState(true);
  const [esAdministrador, setEsAdministrador] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function cargar() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const perfil = await supabase.from('perfiles').select('es_administrador').eq('id', data.user.id).maybeSingle();
        if (!perfil.data?.es_administrador || !vigente) return;
        setEsAdministrador(true);
        const resultado = await supabase.rpc('preferencias_notificaciones');
        if (resultado.error) throw resultado.error;
        if (vigente) {
          setValor(resultado.data.agenda_habilitada);
          setHora(resultado.data.hora_agenda);
          setSolicitudes(resultado.data.solicitudes_habilitadas);
        }
      } catch { if (vigente) setError('No se pudo cargar la preferencia de agenda diaria.'); }
    }
    void cargar();
    return () => { vigente = false; };
  }, []);
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (valor === null || ocupado) return;
    setOcupado(true); setError(''); setMensaje('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const resultado = await supabase.rpc('preferencias_notificaciones', { p_agenda_habilitada: valor, p_hora_agenda: hora, p_solicitudes_habilitadas: solicitudes });
      if (resultado.error) throw resultado.error;
      setValor(resultado.data.agenda_habilitada);
      setHora(resultado.data.hora_agenda);
      setSolicitudes(resultado.data.solicitudes_habilitadas);
      setMensaje('Configuración guardada.');
    } catch { setError('No se pudo guardar la preferencia. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }
  if (!esAdministrador) return null;
  return <section className="configuracion-aplicacion" aria-labelledby="titulo-configuracion-aplicacion">
    <form onSubmit={guardar}>
      <h2 id="titulo-configuracion-aplicacion">Configurar aplicación</h2>
      {valor !== null && <label className="configuracion-aplicacion-opcion"><input type="checkbox" checked={valor} disabled={ocupado} onChange={evento => { setValor(evento.target.checked); setMensaje(''); setError(''); }} /> Enviar agenda diaria por mail</label>}
      {valor !== null && <label>Hora de envío de la agenda diaria (Montevideo)<input type="time" value={hora} required disabled={ocupado} onChange={evento => { setHora(evento.target.value); setMensaje(''); setError(''); }} /></label>}
      {valor !== null && <label className="configuracion-aplicacion-opcion"><input type="checkbox" checked={solicitudes} disabled={ocupado} onChange={evento => { setSolicitudes(evento.target.checked); setMensaje(''); setError(''); }} /> Recibir emails de nuevas solicitudes</label>}
      {valor !== null && <button type="submit" disabled={ocupado}>GUARDAR</button>}
      {error && <p role="alert">{error}</p>}
      {mensaje && <p role="status">{mensaje}</p>}
    </form>
  </section>;
}
