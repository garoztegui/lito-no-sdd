'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { enviarEmailsCita } from './email-citas';
import { conLimite } from './limite';

export async function solicitarCitaConEmail(inicio: string, servicio: string): Promise<{ code?: string; error?: boolean }> {
  try {
    if (typeof inicio !== 'string' || !Number.isFinite(Date.parse(inicio)) || typeof servicio !== 'string') return { error: true };
    const almacenamiento = await cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { error: true };
    const resultado = await conLimite(signal => supabase.rpc('solicitar_cita', { inicio_cita: inicio, servicio_cita: servicio }).abortSignal(signal));
    if (resultado.error) return { code: resultado.error.code, error: true };
    await enviarEmailsCita(supabase, null, inicio, 'solicitud');
    return {};
  } catch {
    return { error: true };
  }
}
