"use client";

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';

export type Plazos = { reserva: number; cancelacion: number };

export function usePlazos() {
  const [plazos, setPlazos] = useState<Plazos | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vigente = true;
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    async function cargar() {
      const { data, error } = await supabase.rpc('plazos').single();
      if (!vigente) return;
      if (error || !data) setError(true);
      else { setPlazos(data as Plazos); setError(false); }
    }
    const actualizar = () => { void cargar().catch(() => { if (vigente) setError(true); }); };
    actualizar();
    window.addEventListener('focus', actualizar);
    return () => { vigente = false; window.removeEventListener('focus', actualizar); };
  }, []);
  return { plazos, error };
}

export function horas(cantidad: number) { return `${cantidad} ${cantidad === 1 ? 'hora' : 'horas'}`; }
