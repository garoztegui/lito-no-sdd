'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { conLimite } from './limite';

type Cita = { id: string; inicio: string; servicio: string; estado: string };
const formato = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'America/Montevideo', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23',
});

export default function MisCitas({ version }: { version: number }) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);

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

  return <section className="mis-citas" aria-labelledby="titulo-mis-citas">
    <h2 id="titulo-mis-citas">Mis citas</h2>
    {estado === 'cargando' ? <p role="status">Cargando tus citas...</p> :
      estado === 'error' ? <><p role="alert">No se pudieron cargar tus citas.</p><button type="button" aria-label="Reintentar cargar mis citas" onClick={() => setIntento(valor => valor + 1)}>Reintentar</button></> :
      citas.length === 0 ? <p>Todavía no tenés citas.</p> :
      <ul>{citas.map(cita => <li key={cita.id}>
        <h3>{cita.servicio}</h3>
        <p><time dateTime={cita.inicio}>{formato.format(new Date(cita.inicio))}</time> (Montevideo)</p>
        <p>Estado: <strong>{cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}</strong></p>
      </li>)}</ul>}
  </section>;
}
