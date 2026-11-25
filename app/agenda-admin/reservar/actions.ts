'use server';

import { revalidatePath } from 'next/cache';
import { accesoAdministrador } from '../clientes/acceso';
import { enviarEmailsCita } from '../../email-citas';

export async function reservarParaOtraPersona(inicio: string, servicio: string, clienteId: string | null, nombre: string, apellido: string, email: string, telefono: string): Promise<{ error?: boolean; code?: string }> {
  const acceso = await accesoAdministrador();
  if (acceso.estado !== 'autorizado') return { error: true };
  const { data, error } = await acceso.supabase.rpc('reservar_cita_administrador', {
    p_inicio: inicio, p_servicio: servicio, p_cliente_id: clienteId,
    p_nombre: nombre, p_apellido: apellido, p_email: email, p_telefono: telefono,
  });
  if (error) return { error: true, code: error.code };
  await enviarEmailsCita(acceso.supabase, data, null, 'confirmacion');
  revalidatePath('/agenda-admin');
  revalidatePath('/');
  return {};
}
