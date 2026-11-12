'use client';

import { useState } from 'react';
import SelectorHorario from '../selector-horario';
import { proponerHorario } from './actions';

export default function ProponerHorario({ citaId, fechaAnterior = '', error = '' }: { citaId: string; fechaAnterior?: string; error?: string }) {
  const [horario, setHorario] = useState('');
  const [abierto, setAbierto] = useState(Boolean(error));
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)}>Proponer otro horario</button>;
  return <form action={proponerHorario}>
    <input type="hidden" name="citaId" value={citaId} />
    <input type="hidden" name="nuevoInicioLocal" value={horario} />
    <SelectorHorario onChange={setHorario} initialValue={fechaAnterior.slice(0, 10)} />
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={!horario}>Confirmar propuesta</button>
  </form>;
}
