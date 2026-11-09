'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';

export default function EnlaceAgendaAdmin() {
  const [esAdministrador, setEsAdministrador] = useState(false);

  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const perfil = await supabase.from('perfiles').select('es_administrador').eq('id', data.user.id).maybeSingle();
      if (vigente) setEsAdministrador(perfil.data?.es_administrador === true);
    });
    return () => { vigente = false; };
  }, []);

  return esAdministrador ? <p><a href="/agenda-admin">Consultar agenda administrativa</a></p> : null;
}
