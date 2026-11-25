'use client';

import { useState } from 'react';
import Agenda from '../../agenda';

export default function FormularioReserva({ clientes }: { clientes: { id: string; nombre: string; email: string }[] }) {
  const [version, setVersion] = useState(0);
  return <Agenda clientesAdmin={clientes} versionCitas={version} onSolicitudFinalizada={() => setVersion(v => v + 1)} />;
}
