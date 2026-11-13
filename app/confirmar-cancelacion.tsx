'use client';

import { useEffect, useRef } from 'react';

export default function ConfirmarCancelacion({ mensaje, onSi, onNo, titulo = 'Confirmar cancelación' }: { mensaje: string; onSi: () => void; onNo: () => void; titulo?: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogo.current?.showModal(); }, []);

  return <dialog ref={dialogo} aria-labelledby="titulo-confirmacion" onCancel={event => { event.preventDefault(); onNo(); }}>
    <h2 id="titulo-confirmacion">{titulo}</h2>
    <p>{mensaje}</p>
    <div className="botones-confirmacion">
      <button type="button" onClick={onNo} autoFocus>No</button>
      <button type="button" onClick={onSi}>Sí</button>
    </div>
  </dialog>;
}
