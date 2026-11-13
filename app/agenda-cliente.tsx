'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import Agenda from './agenda';
import MisCitas from './mis-citas';
import MenuAdmin from './menu-admin';
import ConfiguracionCliente from './configuracion-cliente';
import { conLimite } from './limite';

export default function AgendaCliente({ onSolicitudFinalizada, versionCitas }: { onSolicitudFinalizada: () => void; versionCitas: number }) {
  const [acceso, setAcceso] = useState<'cargando' | 'cliente' | 'administrador' | 'error'>('cargando');
  const [version, setVersion] = useState(0);
  const [seccion, setSeccion] = useState<'menu' | 'citas' | 'reserva' | 'configuracion'>('menu');

  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function consultar() {
      setAcceso('cargando');
      try {
        const { data: { user }, error } = await conLimite(() => supabase.auth.getUser());
        if (error || !user) throw new Error('Sin sesión');
        const perfil = await conLimite(signal => supabase.from('perfiles').select('es_administrador').eq('id', user.id).abortSignal(signal).maybeSingle());
        if (perfil.error || !perfil.data || typeof perfil.data.es_administrador !== 'boolean') throw new Error('Sin perfil');
        if (vigente) setAcceso(perfil.data.es_administrador ? 'administrador' : 'cliente');
      } catch {
        if (vigente) setAcceso('error');
      }
    }
    void consultar();
    return () => { vigente = false; };
  }, [version]);

  if (acceso === 'cargando') return <p>Comprobando acceso a reservas...</p>;
  if (acceso === 'error') return <section><p role="alert">No se pudo comprobar el acceso a reservas.</p><button type="button" onClick={() => setVersion(valor => valor + 1)}>Reintentar</button></section>;
  if (acceso === 'administrador') return <MenuAdmin />;
  if (seccion === 'menu') return <nav className="menu-cliente" aria-label="Opciones de cliente">
    <button type="button" onClick={() => setSeccion('citas')}>Mis citas</button>
    <button type="button" onClick={() => setSeccion('reserva')}>Reservar cita</button>
    <button type="button" onClick={() => setSeccion('configuracion')}>Configuración</button>
  </nav>;
  return <><button className="volver-menu" type="button" onClick={() => setSeccion('menu')}>Volver al menú</button>
    {seccion === 'citas' ? <MisCitas version={versionCitas} onCancelacion={onSolicitudFinalizada} /> : seccion === 'reserva' ? <Agenda onSolicitudFinalizada={onSolicitudFinalizada} versionCitas={versionCitas} /> : <ConfiguracionCliente />}
  </>;
}
