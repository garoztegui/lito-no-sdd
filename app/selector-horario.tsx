'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { fechaTexto, instanteLocal, limiteMaximo } from './agenda';
import { conLimite } from './limite';

export default function SelectorHorario({ onChange, disabled = false, initialValue = '' }: {
  onChange: (horario: string) => void; disabled?: boolean; initialValue?: string;
}) {
  const ahora = new Date();
  const minimo = ahora.getTime() + 86400000;
  const maximo = limiteMaximo(ahora);
  const [fecha, setFecha] = useState(() => initialValue.slice(0, 10) || fechaTexto(new Date(Date.now() + 86400000)));
  const [seleccion, setSeleccion] = useState(initialValue);
  const [ocupados, setOcupados] = useState<number[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<{ dia: number; hora: number }[]>([]);
  const [bloqueados, setBloqueados] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

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
    ]).then(([ocupacion, semanal, bloqueos]) => {
      if (!vigente) return;
      if (ocupacion.error || semanal.error || bloqueos.error) throw ocupacion.error ?? semanal.error ?? bloqueos.error;
      setOcupados((ocupacion.data ?? []).map((cita: { inicio: string }) => Date.parse(cita.inicio)));
      setDisponibilidad(semanal.data ?? []);
      setBloqueados((bloqueos.data ?? []).map((bloqueo: { hora: number }) => bloqueo.hora));
      setError(false);
    }).catch(() => { if (vigente) setError(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; controlador.abort(); };
  }, [fecha, version]);

  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const horarios = disponibilidad.filter(turno => turno.dia === (dia || 7) && !bloqueados.includes(turno.hora))
    .map(({ hora }) => ({ hora, inicio: instanteLocal(fecha, hora) }))
    .filter(({ inicio }) => inicio >= minimo && inicio <= maximo);

  return <>
    <label>Fecha<input type="date" value={fecha} min={fechaTexto(new Date(minimo))} max={fechaTexto(new Date(maximo))}
      disabled={disabled} onChange={event => { if (event.target.value) { setFecha(event.target.value); setSeleccion(''); onChange(''); } }} /></label>
    <p>{new Intl.DateTimeFormat('es-UY', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${fecha}T12:00:00Z`))}</p>
    <fieldset><legend>Horarios (Montevideo)</legend>
      {cargando ? <p>Consultando horarios...</p> : error ? <><p role="alert">No se pudieron consultar los horarios. Intentá nuevamente.</p><button type="button" onClick={() => setVersion(valor => valor + 1)}>Reintentar</button></> : horarios.length === 0 ? <p>No hay horarios disponibles para esta fecha.</p> :
        <div className="horarios">{horarios.map(({ hora, inicio }) => {
          const ocupado = ocupados.includes(inicio);
          const valor = `${fecha}T${String(hora).padStart(2, '0')}:00`;
          return <button key={inicio} type="button" className="horario" disabled={ocupado || disabled} aria-pressed={seleccion === valor}
            onClick={() => { setSeleccion(valor); onChange(valor); }}>{String(hora).padStart(2, '0')}:00 {ocupado ? 'Ocupado' : seleccion === valor ? 'Seleccionado' : 'Disponible'}</button>;
        })}</div>}
    </fieldset>
  </>;
}
