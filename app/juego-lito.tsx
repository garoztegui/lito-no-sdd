'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import './juego-lito.css';

const posiciones = [
  { left: '53%', top: '71%' }, { left: '70%', top: '70%' },
  { left: '59%', top: '78%' }, { left: '76%', top: '77%' },
  { left: '48%', top: '81%' }, { left: '66%', top: '86%' },
];

export default function JuegoLito() {
  const [estado, setEstado] = useState<'inicio' | 'jugando' | 'terminado'>('inicio');
  const [puntos, setPuntos] = useState(0);
  const [segundos, setSegundos] = useState(15);
  const [posicion, setPosicion] = useState(0);
  const [ultimoNudo, setUltimoNudo] = useState(0);
  const [record, setRecord] = useState<{ nombre: string; puntos: number } | null>(null);
  const [nombre, setNombre] = useState('');
  const [ranking, setRanking] = useState<{ nombre: string; puntos: number }[] | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargandoRecord, setCargandoRecord] = useState(true);
  const fin = useRef(0);

  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    void supabase.rpc('mi_record_juego').maybeSingle().then(({ data, error }) => {
      if (error) setError('No se pudo consultar tu récord.');
      else if (data) { const resultado = data as { nombre: string; puntos: number }; setRecord(resultado); setNombre(resultado.nombre); }
      setCargandoRecord(false);
    });
  }, []);

  async function guardar(nombreJuego: string) {
    setGuardando(true);
    setError('');
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const resultado = await supabase.rpc('guardar_record_juego', { p_nombre: nombreJuego, p_puntos: puntos });
    if (resultado.error) setError('No se pudo guardar tu puntaje. Intentá nuevamente.');
    else {
      const consulta = await supabase.rpc('mi_record_juego').single();
      if (consulta.error) setError('No se pudo consultar tu récord.');
      else setRecord(consulta.data as { nombre: string; puntos: number });
    }
    setGuardando(false);
  }

  useEffect(() => {
    if (estado === 'terminado' && record) void guardar(record.nombre);
    // Guardar una sola vez al terminar la partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  async function verRanking() {
    setError('');
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const { data, error } = await supabase.rpc('ranking_juego');
    if (error) setError('No se pudo cargar el ranking. Intentá nuevamente.');
    else setRanking(data ?? []);
  }

  useEffect(() => {
    if (estado !== 'jugando') return;
    const actualizar = () => {
      const restante = Math.max(0, Math.ceil((fin.current - Date.now()) / 1000));
      setSegundos(restante);
      if (restante === 0) setEstado('terminado');
    };
    const intervalo = window.setInterval(actualizar, 100);
    return () => window.clearInterval(intervalo);
  }, [estado]);

  function iniciar() {
    setPuntos(0);
    setSegundos(15);
    setPosicion(0);
    fin.current = Date.now() + 15000;
    setEstado('jugando');
  }

  function atrapar() {
    if (Date.now() >= fin.current) {
      setSegundos(0);
      setEstado('terminado');
      return;
    }
    setPuntos(valor => valor + 1);
    setUltimoNudo(posicion);
    setPosicion(anterior => (anterior + 1 + Math.floor(Math.random() * (posiciones.length - 1))) % posiciones.length);
  }

  return <section className="juego-lito" aria-label="Jugar a ser Lito">
    <h2>¡Atrapá el nudo!</h2>
    <button type="button" onClick={verRanking}>Ver ranking</button>
    {ranking && <section aria-label="Ranking"><h3>Ranking</h3>{ranking.length === 0 ? <p>Todavía no hay puntajes.</p> : <ol>{ranking.map((jugador, indice) => <li key={indice}>{jugador.nombre}: {jugador.puntos} puntos</li>)}</ol>}<button type="button" onClick={() => setRanking(null)}>Cerrar ranking</button></section>}
    <p>Tocá los nudos que aparecen en la espalda. Tenés 15 segundos y cada nudo vale 1 punto.</p>
    <div className="juego-marcador"><span>Tiempo: {segundos} s</span><span>Puntos: {puntos}</span></div>
    <div className="juego-escena" aria-label="Lito dando un masaje">
      {estado === 'jugando' && puntos > 0 && <span key={puntos} className="juego-toque" style={posiciones[ultimoNudo]} aria-hidden="true">✋</span>}
      {estado === 'jugando' && <button className="juego-nudo" style={posiciones[posicion]} type="button" onClick={atrapar} aria-label="Atrapar nudo"><span aria-hidden="true">✹</span></button>}
    </div>
    {estado === 'terminado' && <p role="status" className="juego-resultado">Hiciste {puntos} puntos</p>}
    {estado === 'terminado' && !record && <form onSubmit={event => { event.preventDefault(); void guardar(nombre); }}><label>Nombre de juego<input value={nombre} onChange={event => setNombre(event.target.value)} required maxLength={40} /></label><button type="submit" disabled={guardando}>Guardar puntaje</button></form>}
    {record && <p>Tu récord: {record.puntos} puntos</p>}
    {error && <p role="alert">{error}</p>}
    {estado === 'terminado' && error && record && <button type="button" disabled={guardando} onClick={() => void guardar(record.nombre)}>Reintentar guardar puntaje</button>}
    {estado !== 'jugando' && <button type="button" disabled={cargandoRecord || guardando} onClick={iniciar}>{estado === 'inicio' ? 'JUGAR' : 'JUGAR DE NUEVO'}</button>}
  </section>;
}
