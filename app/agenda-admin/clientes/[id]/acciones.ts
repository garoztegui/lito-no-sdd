'use server';

import { revalidatePath } from 'next/cache';
import { accesoAdministrador } from '../acceso';
import { enviarEmailsCita } from '../../../email-citas';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Accion = 'aceptar' | 'rechazar' | 'proponer' | 'cancelar';

export async function gestionarCita(clienteId: string, citaId: string, accion: Accion, valor: string): Promise<string> {
  if (typeof clienteId !== 'string' || !uuid.test(clienteId) || typeof citaId !== 'string' || !uuid.test(citaId)
    || !['aceptar', 'rechazar', 'proponer', 'cancelar'].includes(accion) || typeof valor !== 'string') return 'error';
  if (accion === 'cancelar' && !valor.trim()) return 'motivo_invalido';
  if (accion === 'proponer' && !/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(valor)) return 'horario_invalido';

  const acceso = await accesoAdministrador();
  if (acceso.estado !== 'autorizado') return 'sin_acceso';
  const { data: cita, error: errorCita } = await acceso.supabase
    .rpc('historial_cliente_administrador', { p_cliente_id: clienteId }).eq('id', citaId).maybeSingle();
  if (errorCita) return 'error';
  if (!cita || Date.parse((cita as { inicio: string }).inicio) <= Date.now()) return 'no_disponible';

  const resultado = accion === 'aceptar' || accion === 'rechazar'
    ? await acceso.supabase.rpc('resolver_solicitud_administrador', { p_cita_id: citaId, p_decision: accion })
    : accion === 'proponer'
      ? await acceso.supabase.rpc('proponer_horario_local', { p_cita_id: citaId, p_nuevo_inicio_local: valor })
      : await acceso.supabase.rpc('cancelar_cita_administrador', { p_cita_id: citaId, p_motivo: valor });
  if (resultado.error) return 'error';
  if (resultado.data === 'propuesta' || (accion === 'cancelar' && resultado.data === 'cancelada') || (accion === 'aceptar' && resultado.data === 'confirmada')) {
    await enviarEmailsCita(acceso.supabase, citaId, null, resultado.data === 'propuesta' ? 'propuesta' : resultado.data === 'confirmada' ? 'confirmacion' : 'cancelacion');
  }
  if (['confirmada', 'rechazada', 'propuesta', 'cancelada'].includes(resultado.data)) {
    revalidatePath(`/agenda-admin/clientes/${clienteId}`);
    revalidatePath('/agenda-admin');
    revalidatePath('/');
  }
  return resultado.data;
}
