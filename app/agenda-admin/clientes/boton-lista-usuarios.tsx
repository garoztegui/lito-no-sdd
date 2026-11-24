'use client';

import { useState } from 'react';
import { enviarListaUsuarios } from './enviar-lista';

export default function BotonListaUsuarios() {
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(false);
  async function enviar() {
    setOcupado(true);
    setMensaje('');
    try {
      const resultado = await enviarListaUsuarios();
      setError(resultado.error);
      setMensaje(resultado.error ? 'No se pudo enviar la lista. Intentá nuevamente.' : 'La lista de usuarios fue enviada a tu email.');
    } catch {
      setError(true);
      setMensaje('No se pudo enviar la lista. Intentá nuevamente.');
    } finally { setOcupado(false); }
  }
  return <><button type="button" disabled={ocupado} onClick={enviar}>{ocupado ? 'Enviando...' : 'Enviarme lista de usuarios por mail'}</button>{mensaje && <p role={error ? 'alert' : 'status'}>{mensaje}</p>}</>;
}
