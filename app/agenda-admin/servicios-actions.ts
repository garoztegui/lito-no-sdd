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

export async function consultarServicios() {
  const supabase = await administrador();
  const { data, error } = await supabase.rpc('listar_servicios_admin');
  if (error) throw new Error('No se pudieron consultar los servicios');
  return data ?? [];
}

export async function crearServicio(nombre: string) {
  const supabase = await administrador();
  const { data, error } = await supabase.rpc('crear_servicio', { p_nombre: nombre });
  if (error) throw new Error('No se pudo crear el servicio');
  return data;
}

export async function renombrarServicio(id: string, nombre: string) {
  const supabase = await administrador();
  const { data, error } = await supabase.rpc('renombrar_servicio', { p_id: id, p_nombre: nombre });
  if (error) throw new Error('No se pudo renombrar el servicio');
  return data;
}

export async function bloquearServicio(id: string) {
  const supabase = await administrador();
  const { data, error } = await supabase.rpc('bloquear_servicio', { p_id: id });
  if (error) throw new Error('No se pudo bloquear el servicio');
  return data;
}

export async function borrarServicio(id: string) {
  const supabase = await administrador();
  const { data, error } = await supabase.rpc('borrar_servicio', { p_id: id });
  if (error) throw new Error('No se pudo borrar el servicio');
  return data;
}
