'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

type Perfil = { nombre: string | null; telefono: string | null; sexo: string | null };
type Estado = 'cargando' | 'listo' | 'incompleto' | 'error';

export default function PerfilObligatorio({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [perfil, setPerfil] = useState<Perfil>({ nombre: null, telefono: null, sexo: null });
  const [faltantes, setFaltantes] = useState({ nombre: false, telefono: false, sexo: false });
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let vigente = true;
    let revision = 0;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function cargar(user: { id: string; email?: string } | null) {
      const actual = ++revision;
      if (!user) { if (vigente) setEstado('listo'); return; }
      if (vigente) setEstado('cargando');
      try {
        const { data, error } = await supabase.from('perfiles').select('nombre,telefono,sexo').eq('id', user.id).maybeSingle();
        if (error || !data) throw new Error('Sin perfil');
        if (!vigente || actual !== revision) return;
        setId(user.id); setEmail(user.email ?? ''); setPerfil(data);
        setFaltantes({ nombre: !data.nombre?.trim(), telefono: !data.telefono?.trim(), sexo: !['Hombre', 'Mujer', 'Prefiero no especificar'].includes(data.sexo ?? '') });
        setEstado(data.nombre?.trim() && data.telefono?.trim() && ['Hombre', 'Mujer', 'Prefiero no especificar'].includes(data.sexo ?? '') ? 'listo' : 'incompleto');
      } catch { if (vigente && actual === revision) setEstado('error'); }
    }
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!vigente || revision !== 0) return;
      if (error && error.name !== 'AuthSessionMissingError') { setEstado('error'); return; }
      void cargar(data.user);
    }).catch(() => { if (vigente) setEstado('error'); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') setTimeout(() => { if (vigente) void cargar(sesion?.user ?? null); }, 0);
    });
    return () => { vigente = false; subscription.unsubscribe(); };
  }, [version]);

  useEffect(() => { if (estado === 'incompleto' && !dialogo.current?.open) dialogo.current?.showModal(); }, [estado]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ocupado) return;
    if (!perfil.nombre?.trim() || !perfil.telefono?.trim() || !['Hombre', 'Mujer', 'Prefiero no especificar'].includes(perfil.sexo ?? '')) {
      setMensaje('Completá todos los datos obligatorios.'); return;
    }
    setOcupado(true); setMensaje('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { data, error } = await supabase.from('perfiles').update({ nombre: perfil.nombre.trim(), telefono: perfil.telefono.trim(), sexo: perfil.sexo }).eq('id', id).select('id').maybeSingle();
      if (error || !data) throw new Error('No se actualizó');
      window.dispatchEvent(new Event('perfil-actualizado'));
      setEstado('listo');
    } catch { setMensaje('No se pudieron guardar tus datos. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }

  if (estado === 'cargando') return <main className="container"><p role="status">Cargando tus datos...</p></main>;
  if (estado === 'error') return <main className="container"><p role="alert">No se pudieron comprobar tus datos.</p><button type="button" onClick={() => setVersion(valor => valor + 1)}>Reintentar</button></main>;
  if (estado === 'listo') return children;
  return <dialog ref={dialogo} className="modal-registro" aria-labelledby="titulo-completar-perfil" onCancel={event => event.preventDefault()}>
    <form onSubmit={guardar}>
      <h2 id="titulo-completar-perfil">Completá tus datos</h2>
      <p>Para continuar, completá los datos obligatorios que faltan.</p>
      <label>Email de la cuenta<input type="email" value={email} disabled /></label>
      {faltantes.nombre && <label>Nombre completo<input required value={perfil.nombre ?? ''} onChange={event => setPerfil({ ...perfil, nombre: event.target.value })} /></label>}
      {faltantes.telefono && <label>Teléfono<input type="tel" required value={perfil.telefono ?? ''} onChange={event => setPerfil({ ...perfil, telefono: event.target.value })} /></label>}
      {faltantes.sexo && <label>Sexo<select required value={perfil.sexo ?? ''} onChange={event => setPerfil({ ...perfil, sexo: event.target.value })}><option value="">Seleccioná una opción</option><option>Hombre</option><option>Mujer</option><option>Prefiero no especificar</option></select></label>}
      <button type="submit" disabled={ocupado}>{ocupado ? 'Guardando...' : 'Guardar datos'}</button>
      {mensaje && <p role="alert">{mensaje}</p>}
    </form>
  </dialog>;
}
