'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import ConfirmarCancelacion from '../confirmar-cancelacion';

type Turno = { dia: number; hora: number };
type Resultado = { resultado: string; citas?: string[]; cantidad?: number };
const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function Disponibilidad() {
  const [turnos, setTurnos] = useState<Turno[] | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Resultado | null>(null);

  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    supabase.rpc('disponibilidad_semanal').then(({ data, error }) => {
      if (!vigente) return;
      if (error) setMensaje('No se pudo cargar la disponibilidad. Recargá la página.');
      else setTurnos(data ?? []);
    });
    return () => { vigente = false; };
  }, []);

  function cambiar(dia: number, hora: number, activo: boolean) {
    setTurnos(actual => activo ? [...(actual ?? []), { dia, hora }] : (actual ?? []).filter(t => t.dia !== dia || t.hora !== hora));
    setConfirmacion(null);
    setMensaje('');
  }

  async function guardar(confirmar = false) {
    if (!turnos || ocupado) return;
    setOcupado(true);
    setMensaje('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { data, error } = await supabase.rpc('guardar_disponibilidad_semanal', {
        p_horarios: turnos, p_confirmar: confirmar, p_citas: confirmar ? confirmacion?.citas : null,
      });
      if (error) throw error;
      const resultado = data as Resultado;
      if (resultado.resultado === 'confirmacion') setConfirmacion(resultado);
      else if (resultado.resultado === 'dentro_del_plazo') {
        setConfirmacion(null);
        setMensaje('No se puede guardar: hay citas afectadas dentro de las próximas 24 horas.');
      } else if (resultado.resultado === 'guardada') {
        setConfirmacion(null);
        setMensaje('Disponibilidad guardada.');
      } else throw new Error('Resultado inesperado');
    } catch {
      setMensaje('No se pudo guardar la disponibilidad. Intentá nuevamente.');
    } finally { setOcupado(false); }
  }

  return <section className="disponibilidad" aria-labelledby="titulo-disponibilidad">
    <h2 id="titulo-disponibilidad">Disponibilidad semanal</h2>
    <p>Elegí los horarios de inicio de las sesiones de 60 minutos (Montevideo).</p>
    {mensaje && <p role="status">{mensaje}</p>}
    {!turnos ? !mensaje && <p role="status">Cargando disponibilidad...</p> : <>
      {dias.map((nombre, indice) => <fieldset key={nombre} disabled={ocupado}>
        <legend>{nombre}</legend>
        <div className="turnos-semanales">{Array.from({ length: 24 }, (_, hora) => <label key={hora}>
          <input type="checkbox" checked={turnos.some(t => t.dia === indice + 1 && t.hora === hora)}
            onChange={e => cambiar(indice + 1, hora, e.target.checked)} />
          {String(hora).padStart(2, '0')}:00
        </label>)}</div>
      </fieldset>)}
      <button type="button" disabled={ocupado} onClick={() => guardar()}>Guardar disponibilidad</button>
      {confirmacion && <ConfirmarCancelacion mensaje={`Hay ${confirmacion.cantidad} citas afectadas. ¿Estás seguro de cancelarlas y guardar la disponibilidad?`}
        onSi={() => { setConfirmacion(null); void guardar(true); }} onNo={() => { setConfirmacion(null); setMensaje('No se realizaron cambios.'); }} />}
    </>}
  </section>;
}
