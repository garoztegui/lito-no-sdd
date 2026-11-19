import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { mensajeAgendaDiaria } from '../../agenda-diaria-email.mjs';

type Fila = { hora: number; nombre: string | null; servicio: string | null; estado: string };
type Agenda = { administrador_id: string; destinatario: string; fecha: string; filas: Fila[] };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('No autorizado', { status: 401 });
  const key = process.env.SUPABASE_SECRET_KEY;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!key || !user || !pass || !process.env.NEXT_PUBLIC_SUPABASE_URL) return new Response('Configuración incompleta', { status: 500 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('reclamar_agenda_diaria');
  if (error) { console.error('No se pudo obtener la agenda diaria', error); return new Response('Error al obtener la agenda', { status: 500 }); }
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 });
  let errores = 0;
  for (const agenda of (data ?? []) as Agenda[]) {
    let enviado = false;
    try {
      await transport.sendMail({ from: { name: 'LITO masajes & fisioterapia', address: user }, ...mensajeAgendaDiaria(agenda) });
      enviado = true;
    } catch (error) { errores++; console.error('No se pudo enviar la agenda diaria', error); }
    const resultado = await supabase.rpc('finalizar_agenda_diaria', { p_administrador: agenda.administrador_id, p_fecha: agenda.fecha, p_enviado: enviado });
    if (resultado.error) { errores++; console.error('No se pudo registrar el resultado de la agenda diaria', resultado.error); }
  }
  return Response.json({ procesados: data?.length ?? 0, errores }, { status: errores ? 500 : 200 });
}
