'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, type FormEvent } from 'react';
import { enlaceWhatsApp } from './telefono-whatsapp';

type Contacto = { telefono: string; direccion: string };

export default function ConfiguracionContacto() {
  const [administrador, setAdministrador] = useState(false);
  const [contacto, setContacto] = useState<Contacto | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function cargar() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const perfil = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
        if (!perfil.data?.es_administrador || !vigente) return;
        setAdministrador(true);
        const resultado = await supabase.from('contacto_config').select('telefono,direccion').eq('id', true).single();
        if (resultado.error) throw resultado.error;
        if (vigente) setContacto(resultado.data);
      } catch { if (vigente) setError('No se pudieron cargar los datos de contacto.'); }
    }
    void cargar();
    return () => { vigente = false; };
  }, []);
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!contacto || ocupado) return;
    if (!enlaceWhatsApp(contacto.telefono)) { setMensaje(''); setError('Ingresá un teléfono válido con código de país o un celular uruguayo.'); return; }
    setOcupado(true); setMensaje(''); setError('');
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const resultado = await supabase.from('contacto_config').update(contacto).eq('id', true).select('telefono,direccion').single();
      if (resultado.error) throw resultado.error;
      setContacto(resultado.data); setMensaje('Datos guardados.');
    } catch { setError('No se pudieron guardar los datos. Intentá nuevamente.'); }
    finally { setOcupado(false); }
  }
  if (!administrador) return null;
  return <section className="configuracion-aplicacion" aria-labelledby="titulo-contacto">
    <h2 id="titulo-contacto">Contacto y medios de pago</h2>
    {contacto && <form onSubmit={guardar}>
      <label>Teléfono<input required maxLength={100} value={contacto.telefono} onChange={e => setContacto({ ...contacto, telefono: e.target.value })} /></label>
      <label>Dirección<input required maxLength={300} value={contacto.direccion} onChange={e => setContacto({ ...contacto, direccion: e.target.value })} /></label>
      <button type="submit" disabled={ocupado}>GUARDAR</button>
    </form>}
    {error && <p role="alert">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
  </section>;
}
