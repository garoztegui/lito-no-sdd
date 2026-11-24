'use server';

import nodemailer from 'nodemailer';
import { accesoAdministrador } from './acceso';
import { mensajeListaUsuarios } from '../../lista-usuarios-email.mjs';

export async function enviarListaUsuarios(): Promise<{ error: boolean }> {
  try {
    const acceso = await accesoAdministrador();
    if (acceso.estado !== 'autorizado') return { error: true };
    const { data: { user }, error: errorUsuario } = await acceso.supabase.auth.getUser();
    if (errorUsuario || !user?.email) return { error: true };
    const usuarios = [];
    for (let desde = 0; ; desde += 500) {
      const resultado = await acceso.supabase.rpc('lista_usuarios_email').range(desde, desde + 499);
      if (resultado.error) return { error: true };
      usuarios.push(...(resultado.data ?? []));
      if ((resultado.data ?? []).length < 500) break;
    }
    const usuario = process.env.GMAIL_USER;
    const contrasena = process.env.GMAIL_APP_PASSWORD;
    const smtpLocal = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:57521' && process.env.LOCAL_SMTP_PORT;
    if (!smtpLocal && (!usuario || !contrasena)) return { error: true };
    const transporte = smtpLocal
      ? nodemailer.createTransport({ host: '127.0.0.1', port: Number(smtpLocal), secure: false, ignoreTLS: true, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 })
      : nodemailer.createTransport({ service: 'gmail', auth: { user: usuario, pass: contrasena }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 });
    await transporte.sendMail({ from: { name: 'LITO masajes & fisioterapia', address: usuario || 'lito@example.test' }, ...mensajeListaUsuarios(user.email, usuarios) });
    return { error: false };
  } catch {
    return { error: true };
  }
}
