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
