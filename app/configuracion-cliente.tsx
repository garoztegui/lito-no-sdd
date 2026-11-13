'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, type FormEvent } from 'react';
import { conLimite } from './limite';

type Perfil = { nombre: string; telefono: string; sexo: string };

export default function ConfiguracionCliente() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [email, setEmail] = useState('');
  const [id, setId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mensajeClave, setMensajeClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function cargar() {
      try {
        const { data: { user }, error } = await conLimite(() => supabase.auth.getUser());
        if (error || !user) throw new Error('Sin sesión');
        const resultado = await conLimite(signal => supabase.from('perfiles').select('nombre,telefono,sexo').eq('id', user.id).abortSignal(signal).maybeSingle());
        if (resultado.error || !resultado.data) throw new Error('Sin perfil');
        if (vigente) { setId(user.id); setEmail(user.email ?? ''); setPerfil({ nombre: resultado.data.nombre ?? '', telefono: resultado.data.telefono ?? '', sexo: resultado.data.sexo ?? 'Prefiero no especificar' }); setMensaje(''); }
      } catch { if (vigente) setMensaje('No se pudieron cargar tus datos.'); }
    }
    void cargar();
    return () => { vigente = false; };
  }, [version]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!perfil || ocupado) return;
    setOcupado(true); setMensaje('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { data, error } = await supabase.from('perfiles').update({ nombre: perfil.nombre.trim(), telefono: perfil.telefono.trim(), sexo: perfil.sexo }).eq('id', id).select('id').maybeSingle();
      if (error || !data) throw new Error('No se actualizó');
      setMensaje('Datos actualizados.');
    } catch { setMensaje('No se pudieron guardar tus datos. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }

  async function cambiarClave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ocupado) return;
    const formulario = event.currentTarget;
    const datos = new FormData(formulario);
    const clave = String(datos.get('nueva') ?? '');
    if (clave !== String(datos.get('confirmacion') ?? '')) { setMensajeClave('Las contraseñas no coinciden.'); return; }
    setOcupado(true); setMensajeClave('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const { error } = await supabase.auth.updateUser({ password: clave });
      if (error) throw error;
      formulario.reset();
      setMensajeClave('Contraseña actualizada.');
    } catch { setMensajeClave('No se pudo cambiar la contraseña. Verificá los requisitos e intentá nuevamente.'); }
    finally { setOcupado(false); }
  }

  return <section className="configuracion-cliente" aria-label="Configuración">
    <h2>Configuración</h2>
    {!perfil ? <>{mensaje ? <><p role="alert">{mensaje}</p><button type="button" onClick={() => setVersion(valor => valor + 1)}>Reintentar</button></> : <p role="status">Cargando tus datos...</p>}</> : <>
      <form onSubmit={guardar}>
        <label>Email de la cuenta<input type="email" value={email} disabled /></label>
        <label>Nombre completo<input required value={perfil.nombre} onChange={event => setPerfil({ ...perfil, nombre: event.target.value })} /></label>
        <label>Teléfono<input type="tel" required value={perfil.telefono} onChange={event => setPerfil({ ...perfil, telefono: event.target.value })} /></label>
        <label>Sexo<select value={perfil.sexo} onChange={event => setPerfil({ ...perfil, sexo: event.target.value })}><option>Hombre</option><option>Mujer</option><option>Prefiero no especificar</option></select></label>
        <button type="submit" disabled={ocupado}>Guardar datos</button>
        {mensaje && <p role="status">{mensaje}</p>}
      </form>
      <form onSubmit={cambiarClave}>
        <h3>Cambiar contraseña</h3>
        <label>Nueva contraseña<input name="nueva" type="password" autoComplete="new-password" minLength={6} required /></label>
        <label>Confirmar nueva contraseña<input name="confirmacion" type="password" autoComplete="new-password" minLength={6} required /></label>
        <button type="submit" disabled={ocupado}>Cambiar contraseña</button>
        {mensajeClave && <p role="status">{mensajeClave}</p>}
      </form>
    </>}
  </section>;
}
