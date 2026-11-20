import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { mensajeRecordatorio } from '../../recordatorio-email.mjs';
import { procesarRecordatorios } from '../../recordatorios-envio.mjs';

type Recordatorio = { destinatario: string; nombre: string | null; inicio: string; servicio: string };

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get('authorization') !== `Bearer ${secreto}`) return new Response('No autorizado', { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  const usuario = process.env.GMAIL_USER;
  const contrasena = process.env.GMAIL_APP_PASSWORD;
  if (!url || !clave || !usuario || !contrasena) return new Response('Configuración incompleta', { status: 500 });
  const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  const contacto = await supabase.from('contacto_config').select('direccion').eq('id', true).single();
  if (contacto.error || !contacto.data) return new Response('Error al obtener la dirección', { status: 500 });
  const reclamados = await supabase.rpc('reclamar_recordatorios');
  if (reclamados.error) { console.error('No se pudieron reclamar los recordatorios', reclamados.error); return new Response('Error al obtener recordatorios', { status: 500 }); }
  const smtpLocal = process.env.NODE_ENV !== 'production' && url === 'http://127.0.0.1:57521' && process.env.LOCAL_SMTP_PORT;
  const transporte = smtpLocal
    ? nodemailer.createTransport({ host: '127.0.0.1', port: Number(smtpLocal), secure: false, ignoreTLS: true, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 })
    : nodemailer.createTransport({ service: 'gmail', auth: { user: usuario, pass: contrasena }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 });
  const resultado = await procesarRecordatorios(
    reclamados.data ?? [],
    async (reclamo: { cita_id: string; token: string }) => {
      const datos = await supabase.rpc('datos_recordatorio', { p_cita_id: reclamo.cita_id, p_token: reclamo.token }).maybeSingle();
      if (datos.error) throw datos.error;
      return datos.data as Recordatorio | null;
    },
    async (cita: Recordatorio) => transporte.sendMail({ from: { name: 'LITO masajes & fisioterapia', address: usuario }, ...mensajeRecordatorio(cita, contacto.data.direccion) }),
    async (reclamo: { cita_id: string; token: string }, enviado: boolean) => {
      const guardado = await supabase.rpc('finalizar_recordatorio', { p_cita_id: reclamo.cita_id, p_token: reclamo.token, p_enviado: enviado });
      if (guardado.error) throw guardado.error;
    },
  );
  return Response.json(resultado, { status: resultado.errores ? 500 : 200 });
}
