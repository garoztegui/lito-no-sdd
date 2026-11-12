'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, type FormEvent } from 'react';
import { conLimite } from './limite';

const zona = 'America/Montevideo';
const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function partes(fecha: Date) {
  return Object.fromEntries(formato.formatToParts(fecha).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
}

function fechaTexto(fecha: Date) {
  const p = partes(fecha);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function instanteLocal(fecha: string, hora: number) {
  const [year, month, day] = fecha.split('-').map(Number);
  const deseado = Date.UTC(year, month - 1, day, hora);
  let instante = deseado;
  for (let i = 0; i < 2; i++) {
    const p = partes(new Date(instante));
    instante += deseado - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  }
  return instante;
}

function limiteMaximo(ahora: Date) {
  const p = partes(ahora);
  const mes = p.month - 1 + 3;
  const ultimoDia = new Date(Date.UTC(p.year, mes + 1, 0)).getUTCDate();
  const fecha = new Date(Date.UTC(p.year, mes, Math.min(p.day, ultimoDia)));
  const texto = fecha.toISOString().slice(0, 10);
  return instanteLocal(texto, p.hour) + p.minute * 60000 + p.second * 1000;
}

export default function Agenda({ onSolicitudFinalizada, versionCitas }: { onSolicitudFinalizada: () => void; versionCitas: number }) {
  const ahora = new Date();
  const minimo = ahora.getTime() + 24 * 60 * 60 * 1000;
  const maximo = limiteMaximo(ahora);
  const [fecha, setFecha] = useState(() => fechaTexto(new Date(Date.now() + 86400000)));
  const [servicio, setServicio] = useState('');
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [ocupados, setOcupados] = useState<number[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<{ dia: number; hora: number }[]>([]);
  const [bloqueados, setBloqueados] = useState<number[]>([]);
  const [servicios, setServicios] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorConsulta, setErrorConsulta] = useState<'horarios' | 'servicios' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [actualizacion, setActualizacion] = useState(0);

  useEffect(() => {
    let vigente = true;
    const controlador = new AbortController();
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    setCargando(true);
    Promise.all([
      conLimite(signal => supabase.rpc('horarios_ocupados', {
        desde: new Date(instanteLocal(fecha, 0)).toISOString(),
        hasta: new Date(instanteLocal(new Date(Date.parse(`${fecha}T00:00:00Z`) + 86400000).toISOString().slice(0, 10), 0)).toISOString(),
      }).abortSignal(signal), controlador),
      conLimite(signal => supabase.rpc('disponibilidad_semanal').abortSignal(signal), controlador),
      conLimite(signal => supabase.rpc('horarios_bloqueados', { p_fecha: fecha }).abortSignal(signal), controlador),
      conLimite(signal => supabase.rpc('listar_servicios').abortSignal(signal), controlador),
    ]).then(([ocupacion, semanal, bloqueos, catalogo]) => {
      if (!vigente) return;
      if (ocupacion.error || semanal.error || bloqueos.error) throw ocupacion.error ?? semanal.error ?? bloqueos.error;
      if (catalogo.error) { setErrorConsulta('servicios'); return; }
      setOcupados((ocupacion.data ?? []).map((cita: { inicio: string }) => Date.parse(cita.inicio)));
      setDisponibilidad(semanal.data ?? []);
      setBloqueados((bloqueos.data ?? []).map((bloqueo: { hora: number }) => bloqueo.hora));
      setServicios(catalogo.data ?? []);
      setServicio(actual => (catalogo.data ?? []).some((item: { nombre: string }) => item.nombre === actual) ? actual : '');
      setErrorConsulta(null);
    }).catch(() => {
      if (vigente) setErrorConsulta('horarios');
    }).finally(() => {
      if (vigente) setCargando(false);
    });
    return () => { vigente = false; controlador.abort(); };
  }, [fecha, actualizacion, versionCitas]);

  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const horarios = disponibilidad.filter(turno => turno.dia === (dia || 7) && !bloqueados.includes(turno.hora)).map(turno => turno.hora)
    .map(hora => ({ hora, inicio: instanteLocal(fecha, hora) }))
    .filter(({ inicio }) => inicio >= minimo && inicio <= maximo);

  async function solicitar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (seleccion === null || !servicio || enviando) return;
    setEnviando(true);
    setMensaje('');
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    try {
      const { error } = await conLimite(signal => supabase.rpc('solicitar_cita', {
        inicio_cita: new Date(seleccion).toISOString(), servicio_cita: servicio,
      }).abortSignal(signal));
      if (error && error.code !== '23505' && error.code !== '23514') throw error;
      setMensaje(error ? error.code === '23514' ? 'No se pudo solicitar la cita. El horario o servicio ya no está disponible.' : 'No se pudo solicitar la cita. El horario puede haber dejado de estar disponible.' : 'Solicitud enviada. Tu cita está pendiente.');
    } catch {
      setMensaje('No pudimos confirmar la solicitud. Revisá los horarios antes de intentar nuevamente.');
    } finally {
      setEnviando(false);
      setSeleccion(null);
      setActualizacion(valor => valor + 1);
      onSolicitudFinalizada();
    }
  }

  return <section className="agenda" aria-labelledby="titulo-agenda">
    <h2 id="titulo-agenda">Solicitar una cita</h2>
    <p>Elegí un servicio, una fecha y un horario. Las sesiones duran 60 minutos.</p>
    <form onSubmit={solicitar}>
      <label>Servicio<select value={servicio} onChange={e => setServicio(e.target.value)} required>
        <option value="">Elegí un servicio</option>
        {servicios.map(item => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
      </select></label>
      <label>Fecha<input type="date" value={fecha} min={fechaTexto(new Date(minimo))} max={fechaTexto(new Date(maximo))}
        onChange={e => { if (e.target.value) { setFecha(e.target.value); setSeleccion(null); setMensaje(''); } }} /></label>
      <p>{new Intl.DateTimeFormat('es-UY', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${fecha}T12:00:00Z`))}</p>
      <fieldset><legend>Horarios (Montevideo)</legend>
        {cargando ? <p>Consultando horarios...</p> : errorConsulta ? <><p role="alert">{errorConsulta === 'servicios' ? 'No se pudieron consultar los servicios. Intentá nuevamente.' : 'No se pudieron consultar los horarios. Intentá nuevamente.'}</p><button type="button" onClick={() => setActualizacion(valor => valor + 1)}>Reintentar</button></> : horarios.length === 0 ? <p>No hay horarios disponibles para esta fecha.</p> :
          <div className="horarios">{horarios.map(({ hora, inicio }) => {
            const ocupado = ocupados.includes(inicio);
            return <button key={inicio} type="button" className="horario" disabled={ocupado || enviando}
              aria-pressed={seleccion === inicio} onClick={() => { setSeleccion(inicio); setMensaje(''); }}>
              {String(hora).padStart(2, '0')}:00 {ocupado ? 'Ocupado' : seleccion === inicio ? 'Seleccionado' : 'Disponible'}
            </button>;
          })}</div>}
      </fieldset>
      <button type="submit" disabled={seleccion === null || enviando || cargando || errorConsulta !== null} aria-busy={enviando}>{enviando ? 'Enviando...' : 'Solicitar cita'}</button>
      <p role="status">{mensaje}</p>
    </form>
  </section>;
}
