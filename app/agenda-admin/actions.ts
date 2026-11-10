'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function resolverSolicitud(formData: FormData, decision: 'aceptar' | 'rechazar') {
  const citaId = formData.get('citaId');
  if (typeof citaId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(citaId)) {
    redirect('/agenda-admin?resultado=error');
  }

  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
  });
  const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !user) redirect('/agenda-admin?resultado=error');

  const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
  if (errorPerfil || !perfil?.es_administrador) redirect('/agenda-admin?resultado=error');

  const { data, error } = await supabase.rpc('resolver_solicitud_administrador', {
    p_cita_id: citaId,
    p_decision: decision,
  });
  if (error) redirect('/agenda-admin?resultado=error');

  const resultado = data === 'confirmada' ? 'aceptada'
    : data === 'rechazada' ? 'rechazada'
      : data === 'cancelada' ? 'cancelada'
        : 'ya_resuelta';
  revalidatePath('/agenda-admin');
  revalidatePath('/');
  redirect(`/agenda-admin?resultado=${resultado}`);
}

export async function aceptarSolicitud(formData: FormData) {
  await resolverSolicitud(formData, 'aceptar');
}

export async function rechazarSolicitud(formData: FormData) {
  await resolverSolicitud(formData, 'rechazar');
}

export async function proponerHorario(formData: FormData) {
  const citaId = formData.get('citaId');
  const nuevoInicioLocal = formData.get('nuevoInicioLocal');
  if (typeof citaId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(citaId)
    || typeof nuevoInicioLocal !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(nuevoInicioLocal)) {
    redirect('/agenda-admin?resultado=error');
  }

  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
  });
  const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !user) redirect('/agenda-admin?resultado=error');
  const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
  if (errorPerfil || !perfil?.es_administrador) redirect('/agenda-admin?resultado=error');

  const { data, error } = await supabase.rpc('proponer_horario_local', {
    p_cita_id: citaId, p_nuevo_inicio_local: nuevoInicioLocal,
  });
  if (error) redirect('/agenda-admin?resultado=error');
  const resultado = data === 'propuesta' ? 'propuesta'
    : data === 'cancelada' ? 'cancelada'
      : data === 'horario_no_disponible' || data === 'horario_invalido' ? 'horario_ocupado' : 'ya_resuelta';
  revalidatePath('/agenda-admin');
  const parametros = resultado === 'horario_ocupado'
    ? new URLSearchParams({ resultado, citaId, nuevoInicioLocal })
    : new URLSearchParams({ resultado });
  redirect(`/agenda-admin?${parametros}`);
}
