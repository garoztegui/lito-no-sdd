import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { enviarEventosCita } from './notificaciones-citas.mjs';

export async function enviarEmailsCita(supabase: SupabaseClient, citaId: string | null, inicio: string | null, tipo: string) {
  try {
    const { data: ids, error } = await supabase.rpc('reclamar_emails_cita', { p_cita_id: citaId, p_inicio: inicio, p_tipo: tipo });
    if (error || !ids?.length) return;
    const key = process.env.SUPABASE_SECRET_KEY;
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!key || !user || !pass) throw new Error('Email no configurado');
    const privileged = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 });
    await enviarEventosCita(ids, async (id: string) => {
      const { data, error: errorDatos } = await privileged.rpc('datos_email_cita', { p_id: id }).single();
      if (errorDatos || !data) throw new Error('Email no disponible');
      const evento = data as { tipo: 'solicitud_cliente' | 'solicitud_admin' | 'confirmacion' | 'propuesta' | 'cancelacion'; destinatario: string; inicio: string; servicio: string; nombre: string; motivo: string };
      return evento;
    }, message => transport.sendMail({ from: `LITO Reservas <${user}>`, ...message }));
  } catch {
    console.error('No se pudieron enviar los emails de la cita.');
  }
}
