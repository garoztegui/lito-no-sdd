'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { enviarEmailsCita } from '../email-citas';
import { accesoAdministrador } from './clientes/acceso';

export async function cancelarDesdeAgenda(citaId: string, motivo: string) {
  if (typeof citaId !== 'string' || typeof motivo !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(citaId) || !motivo.trim()) return 'error';
  const acceso = await accesoAdministrador();
  if (acceso.estado !== 'autorizado') return 'error';
  const { data, error } = await acceso.supabase.rpc('cancelar_cita_administrador', { p_cita_id: citaId, p_motivo: motivo });
  if (error) return 'error';
  if (data === 'cancelada') {
    await enviarEmailsCita(acceso.supabase, citaId, null, 'cancelacion');
    revalidatePath('/agenda-admin');
    revalidatePath('/');
  }
  return data;
}

function destinoAgenda(formData: FormData, parametros: URLSearchParams) {
  const dia = formData.get('diaAgenda');
  if (typeof dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    parametros.set('mes', dia.slice(0, 7));
    parametros.set('dia', dia);
  }
  return `/agenda-admin?${parametros}`;
}

async function resolverSolicitud(formData: FormData, decision: 'aceptar' | 'rechazar') {
  const citaId = formData.get('citaId');
  if (typeof citaId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(citaId)) {
    redirect(destinoAgenda(formData, new URLSearchParams({ resultado: 'error' })));
  }

  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
  });
  const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !user) redirect(destinoAgenda(formData, new URLSearchParams({ resultado: 'error' })));

  const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
  if (errorPerfil || !perfil?.es_administrador) redirect(destinoAgenda(formData, new URLSearchParams({ resultado: 'error' })));

  const { data, error } = await supabase.rpc('resolver_solicitud_administrador', {
    p_cita_id: citaId,
    p_decision: decision,
  });
  if (error) redirect(destinoAgenda(formData, new URLSearchParams({ resultado: 'error' })));
  if (data === 'confirmada') await enviarEmailsCita(supabase, citaId, null, 'confirmacion');

  const resultado = data === 'confirmada' ? 'aceptada'
    : data === 'rechazada' ? 'rechazada'
      : data === 'cancelada' ? 'cancelada'
        : 'ya_resuelta';
  revalidatePath('/agenda-admin');
  revalidatePath('/');
  redirect(destinoAgenda(formData, new URLSearchParams({ resultado })));
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
    redirect(destinoAgenda(formData, new URLSearchParams({ resultado: 'error' })));
  }

  const almacenamiento = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
  });
  const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
  if (errorUsuario || !user) redirect(destinoAgenda(formData, new URLSearchParams({ resultado: 'error' })));
  const { data: perfil, error: errorPerfil } = await supabase.from('perfiles').select('es_administrador').eq('id', user.id).maybeSingle();
  if (errorPerfil || !perfil?.es_administrador) redirect(destinoAgenda(formData, new URLSearchParams({ resultado: 'error' })));

  const { data, error } = await supabase.rpc('proponer_horario_local', {
    p_cita_id: citaId, p_nuevo_inicio_local: nuevoInicioLocal,
  });
  if (error) redirect(destinoAgenda(formData, new URLSearchParams({ resultado: 'error' })));
  if (data === 'propuesta') await enviarEmailsCita(supabase, citaId, null, 'propuesta');
  const resultado = data === 'propuesta' ? 'propuesta'
    : data === 'cancelada' ? 'cancelada'
      : data === 'horario_no_disponible' || data === 'horario_invalido' ? 'horario_ocupado' : 'ya_resuelta';
  revalidatePath('/agenda-admin');
  const parametros = resultado === 'horario_ocupado'
    ? new URLSearchParams({ resultado, citaId, nuevoInicioLocal })
    : new URLSearchParams({ resultado });
  redirect(destinoAgenda(formData, parametros));
}
