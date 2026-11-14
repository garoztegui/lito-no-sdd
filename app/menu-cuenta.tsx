'use client';

import { createBrowserClient } from '@supabase/ssr';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Usuario = { id: string; email?: string };

export default function MenuCuenta() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [nombre, setNombre] = useState('');
  const [version, setVersion] = useState(0);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState('');
  const cierreLocal = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let vigente = true;
    let revision = 0;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    void supabase.auth.getUser().then(({ data }) => { if (vigente && revision === 0) setUsuario(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sesion) => {
      revision++;
      if (evento === 'SIGNED_OUT') {
        cierreLocal.current = true;
        if (pathname !== '/') { router.replace('/'); router.refresh(); }
      }
      if (evento === 'SIGNED_IN') setError('');
      if (vigente) setUsuario(sesion?.user ?? null);
    });
    const actualizar = () => setVersion(valor => valor + 1);
    window.addEventListener('perfil-actualizado', actualizar);
    return () => { vigente = false; subscription.unsubscribe(); window.removeEventListener('perfil-actualizado', actualizar); };
  }, [pathname, router]);

  useEffect(() => {
    let vigente = true;
    setNombre('');
    if (!usuario) return () => { vigente = false; };
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    void supabase.from('perfiles').select('nombre').eq('id', usuario.id).maybeSingle().then(({ data }) => {
      if (vigente) setNombre(data?.nombre?.trim() || usuario.email || 'Mi cuenta');
    });
    return () => { vigente = false; };
  }, [usuario, version]);

  async function cerrarSesion() {
    if (cerrando) return;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    setCerrando(true); setError(''); cierreLocal.current = false;
    const informarError = () => setError(cierreLocal.current
      ? 'Se cerró la sesión en este dispositivo, pero no se pudo confirmar el cierre en el servidor.'
      : 'No se pudo cerrar la sesión. Intentá nuevamente.');
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    try {
      const { error: errorCierre } = await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise<never>((_, rechazar) => { temporizador = setTimeout(() => rechazar(new Error('Tiempo de espera agotado')), 15000); }),
      ]);
      if (errorCierre) informarError();
      else setUsuario(null);
    } catch { informarError(); }
    finally {
      clearTimeout(temporizador);
      setCerrando(false);
      if (pathname !== '/' && cierreLocal.current) { router.replace('/'); router.refresh(); }
    }
  }

  return <div className="cuenta-barra">
    {usuario && <details className="menu-cuenta">
      <summary>{nombre || usuario.email || 'Mi cuenta'}</summary>
      <div className="menu-cuenta-opciones">
        <a href="/configuracion">Configuración</a>
        <button type="button" onClick={() => void cerrarSesion()} disabled={cerrando}>{cerrando ? 'Cerrando sesión...' : 'Cerrar sesión'}</button>
      </div>
    </details>}
    {error && <p className="error-cierre" role="alert">{error}</p>}
  </div>;
}
