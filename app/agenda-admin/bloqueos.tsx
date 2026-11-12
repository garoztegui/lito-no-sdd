'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { consultarBloqueos, registrarBloqueo, quitarBloqueo } from './bloqueos-actions';

type Bloqueo = { id: string; fecha: string; hora_inicio: number; hora_fin: number };
type Resultado = { resultado: string; citas?: string[]; cantidad?: number };
const horaTexto = (hora: number) => `${String(hora).padStart(2, '0')}:00`;

export default function Bloqueos() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[] | null>(null);
  const [fecha, setFecha] = useState('');
  const [todoElDia, setTodoElDia] = useState(true);
  const [inicio, setInicio] = useState(7);
  const [fin, setFin] = useState(19);
  const [confirmacion, setConfirmacion] = useState<Resultado | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    consultarBloqueos().then(data => { if (vigente) setBloqueos(data); })
      .catch(() => { if (vigente) setMensaje('No se pudieron cargar los bloqueos.'); });
    return () => { vigente = false; };
  }, [version]);

  function cambiar() { setConfirmacion(null); setMensaje(''); }

  async function guardar(citas: string[] | null = null) {
    if (ocupado) return;
    if (!fecha || (!todoElDia && fin <= inicio)) {
      setMensaje('Elegí una fecha y un horario de fin posterior al inicio.');
      return;
    }
    setOcupado(true);
    setMensaje('');
    try {
      const resultado = await registrarBloqueo(fecha, todoElDia ? 0 : inicio, todoElDia ? 24 : fin, citas) as Resultado;
      if (resultado.resultado === 'confirmacion') setConfirmacion(resultado);
      else if (resultado.resultado === 'dentro_del_plazo') {
        setConfirmacion(null);
        setMensaje('No se puede bloquear: hay citas afectadas dentro de las próximas 24 horas.');
      } else if (resultado.resultado === 'guardado') {
        setConfirmacion(null);
        setMensaje('Bloqueo guardado.');
        setVersion(valor => valor + 1);
      } else throw new Error('Resultado inesperado');
    } catch { setMensaje('No se pudo guardar el bloqueo. Verificá la fecha y volvé a intentar.'); }
    finally { setOcupado(false); }
  }

  async function eliminar(id: string) {
    if (ocupado) return;
    setOcupado(true);
    setMensaje('');
    try {
      const resultado = await quitarBloqueo(id);
      setMensaje(resultado === 'eliminado' ? 'Bloqueo eliminado.' : resultado === 'pasado' ? 'No se puede eliminar un bloqueo que ya pasó.' : 'El bloqueo ya no está disponible.');
      setVersion(valor => valor + 1);
    } catch { setMensaje('No se pudo eliminar el bloqueo. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }

  return <section className="bloqueos" aria-labelledby="titulo-bloqueos">
    <h2 id="titulo-bloqueos">Bloqueos de horarios</h2>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); void guardar(); }}>
      <label>Fecha del bloqueo<input type="date" required value={fecha} onChange={e => { setFecha(e.target.value); cambiar(); }} /></label>
      <label className="bloqueo-dia"><input type="checkbox" checked={todoElDia} onChange={e => { setTodoElDia(e.target.checked); cambiar(); }} />Todo el día</label>
      {!todoElDia && <>
        <label>Desde<select value={inicio} onChange={e => { setInicio(Number(e.target.value)); cambiar(); }}>
          {Array.from({ length: 24 }, (_, hora) => <option key={hora} value={hora}>{horaTexto(hora)}</option>)}
        </select></label>
        <label>Hasta<select value={fin} onChange={e => { setFin(Number(e.target.value)); cambiar(); }}>
          {Array.from({ length: 24 }, (_, indice) => <option key={indice + 1} value={indice + 1}>{horaTexto(indice + 1)}</option>)}
        </select></label>
      </>}
      <button type="submit" disabled={ocupado}>Bloquear horario</button>
    </form>
    {mensaje && <p role="status">{mensaje}</p>}
    {confirmacion && <div role="alert">
      <p>Hay {confirmacion.cantidad} citas afectadas. ¿Querés cancelarlas y guardar el bloqueo?</p>
      <button type="button" disabled={ocupado} onClick={() => void guardar(confirmacion.citas ?? [])}>Cancelar citas y bloquear</button>
      <button type="button" disabled={ocupado} onClick={() => { setConfirmacion(null); setMensaje('No se realizaron cambios.'); }}>No bloquear</button>
    </div>}
    <h3>Bloqueos registrados</h3>
    {bloqueos === null ? <p>{mensaje ? 'No se pudo cargar la lista.' : 'Cargando bloqueos...'}</p> : bloqueos.length === 0 ? <p>No hay bloqueos registrados.</p> :
      <ul>{bloqueos.map(b => <li key={b.id}>
        <p><time dateTime={b.fecha}>{new Intl.DateTimeFormat('es-UY', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${b.fecha}T12:00:00Z`))}</time>: {horaTexto(b.hora_inicio)} a {horaTexto(b.hora_fin)} (Montevideo)</p>
        <button type="button" disabled={ocupado} onClick={() => void eliminar(b.id)} aria-label={`Eliminar bloqueo del ${b.fecha} de ${horaTexto(b.hora_inicio)} a ${horaTexto(b.hora_fin)}`}>Eliminar bloqueo</button>
      </li>)}</ul>}
  </section>;
}
