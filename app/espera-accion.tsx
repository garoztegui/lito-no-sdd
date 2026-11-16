'use client';

import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

export default function EsperaAccion() {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogo.current?.showModal(); }, []);

  return <dialog ref={dialogo} className="espera-accion" aria-label="Procesando acción" onCancel={event => event.preventDefault()}>
    <div role="status" aria-live="polite">
      <span className="espera-accion-spinner" aria-hidden="true" />
      <p>Procesando, esperá un momento...</p>
    </div>
  </dialog>;
}

export function EsperaFormulario() {
  const { pending } = useFormStatus();
  return pending ? <EsperaAccion /> : null;
}
