'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { enviarBienvenida } from './bienvenida.mjs';

export async function enviarEmailBienvenida() {
  try {
    const almacenamiento = await cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      cookies: { getAll: () => almacenamiento.getAll(), setAll: () => {} },
    });
    await enviarBienvenida(supabase, async message => {
      const user = process.env.GMAIL_USER;
      const pass = process.env.GMAIL_APP_PASSWORD;
      if (!user || !pass) throw new Error('Email no configurado');
      const transport = nodemailer.createTransport({
        service: 'gmail', auth: { user, pass }, connectionTimeout: 10000,
        greetingTimeout: 10000, socketTimeout: 10000,
      });
      await transport.sendMail({ from: `LITO Reservas <${user}>`, ...message });
    });
  } catch {
    console.error('No se pudo iniciar el envío del email de bienvenida.');
  }
}
