'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Cliente = { id: string; nombre: string; email: string; telefono: string; sexo: string };

export default function DatosClienteModal({ cliente }: { cliente: Cliente }) {
  const [abierto, setAbierto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const ficha = `/agenda-admin/clientes/${cliente.id}`;
  useEffect(() => { if (abierto) dialogo.current?.showModal(); }, [abierto]);

  return <>
    <a href={ficha} onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      setAbierto(true);
    }}>{cliente.nombre}</a>
    {abierto && <dialog ref={dialogo} className="modal-datos-cliente" aria-labelledby={titulo} onClose={() => setAbierto(false)}>
      <h2 id={titulo}>Datos del cliente</h2>
      <dl>
        <dt>Nombre completo</dt><dd>{cliente.nombre}</dd>
        <dt>Email</dt><dd>{cliente.email}</dd>
        <dt>Teléfono</dt><dd>{cliente.telefono}</dd>
        <dt>Sexo</dt><dd>{cliente.sexo}</dd>
      </dl>
      <div className="acciones-datos-cliente">
        <button type="button" className="cerrar-datos-cliente" onClick={() => dialogo.current?.close()}>Cerrar</button>
        <a className="boton-citas-cliente" href={ficha}>Ver ficha completa</a>
      </div>
    </dialog>}
  </>;
}
