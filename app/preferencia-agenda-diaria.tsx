'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';

export default function PreferenciaAgendaDiaria() {
  const [valor, setValor] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const perfil = await supabase.from('perfiles').select('es_administrador').eq('id', data.user.id).maybeSingle();
      if (!perfil.data?.es_administrador) return;
      const resultado = await supabase.rpc('preferencia_agenda_diaria');
      if (resultado.error) setError('No se pudo cargar la preferencia de agenda diaria.');
      else setValor(resultado.data);
    });
  }, []);
  async function cambiar(nuevo: boolean) {
    setOcupado(true); setError('');
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const resultado = await supabase.rpc('preferencia_agenda_diaria', { p_habilitada: nuevo });
    if (resultado.error) setError('No se pudo guardar la preferencia.');
    else setValor(resultado.data);
    setOcupado(false);
  }
  return <>{valor !== null && <label><input type="checkbox" role="switch" checked={valor} disabled={ocupado} onChange={e => void cambiar(e.target.checked)} /> Enviar agenda diaria por mail</label>}{error && <p role="alert">{error}</p>}</>;
}
