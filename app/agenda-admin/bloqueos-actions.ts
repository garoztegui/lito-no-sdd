'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function administrador() {
  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Se requiere acceso de administrador');
  const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
  if (errorPerfil || !perfil?.es_administrador) throw new Error('Se requiere acceso de administrador');
  return supabase;
}

export async function consultarBloqueos() {
  const supabase = await administrador();
  const { data, error } = await supabase.rpc('listar_bloqueos');
  if (error) throw new Error('No se pudieron consultar los bloqueos');
  return data ?? [];
}

export async function registrarBloqueo(fecha: string, inicio: number, fin: number, citas: string[] | null) {
  const supabase = await administrador();
  const { data, error } = await supabase.rpc('guardar_bloqueo', {
    p_fecha: fecha, p_hora_inicio: inicio, p_hora_fin: fin, p_confirmar: citas !== null, p_citas: citas,
  });
  if (error) throw new Error('No se pudo registrar el bloqueo');
  return data;
}

export async function quitarBloqueo(id: string) {
  const supabase = await administrador();
  const { data, error } = await supabase.rpc('eliminar_bloqueo', { p_id: id });
  if (error) throw new Error('No se pudo eliminar el bloqueo');
  return data;
}
