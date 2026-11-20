import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';

test('el envío programado entrega un recordatorio confirmado y omite uno cancelado', async ({ request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replaceAll('"', '');
  if (url !== 'http://127.0.0.1:57521' || !process.env.LOCAL_SMTP_PORT || !process.env.CRON_SECRET) throw new Error('Se requiere Supabase local y correo simulado');
  const db = (sql: string) => execFileSync('docker', ['exec','-i','supabase_db_litov2','psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-tAc',sql], { encoding: 'utf8' }).trim();
  if (db("select count(*) from public.citas where estado='confirmada' and inicio > now() and inicio <= now() + interval '3 hours 10 minutes'") !== '0') throw new Error('La base local tiene otras citas próximas; no se ejecuta la prueba');
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const email = `recordatorio-${crypto.randomUUID()}@example.test`;
  const citaId = crypto.randomUUID();
  const canceladaId = crypto.randomUUID();
  let userId: string | undefined;
  const mensajes: string[] = [];
  const smtp = createServer(socket => {
    let buffer = '';
    let cuerpo = '';
    let recibiendo = false;
    socket.write('220 localhost SMTP\r\n');
    socket.on('data', data => {
      buffer += data.toString();
      let fin: number;
      while ((fin = buffer.indexOf('\r\n')) >= 0) {
        const linea = buffer.slice(0, fin); buffer = buffer.slice(fin + 2);
        if (recibiendo) {
          if (linea === '.') { mensajes.push(cuerpo); cuerpo = ''; recibiendo = false; socket.write('250 recibido\r\n'); }
          else cuerpo += `${linea}\n`;
        } else if (/^(EHLO|HELO)/i.test(linea)) socket.write('250 localhost\r\n');
        else if (/^DATA/i.test(linea)) { recibiendo = true; socket.write('354 enviar contenido\r\n'); }
        else if (/^QUIT/i.test(linea)) { socket.write('221 adiós\r\n'); socket.end(); }
        else socket.write('250 aceptado\r\n');
      }
    });
  });
  await new Promise<void>((resolve, reject) => { smtp.once('error', reject); smtp.listen(Number(process.env.LOCAL_SMTP_PORT), '127.0.0.1', resolve); });
  try {
    const creado = await admin.auth.admin.createUser({ email, password: 'ClaveSegura123', email_confirm: true, user_metadata: { nombre: 'Cliente Prueba', telefono: '099123456', sexo: 'Mujer' } });
    expect(creado.error).toBeNull();
    userId = creado.data.user?.id;
    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
    db(`begin; set local session_replication_role = replica; insert into public.citas (id,cliente_id,inicio,servicio,estado) values ('${citaId}','${userId}',clock_timestamp()+interval '2 hours 59 minutes','Espalda','confirmada'), ('${canceladaId}','${userId}',clock_timestamp()+interval '2 hours 58 minutes','Espalda','cancelada'); commit;`);
    expect((await request.get('/api/recordatorios')).status()).toBe(401);
    const respuesta = await request.get('/api/recordatorios', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(respuesta.status()).toBe(200);
    expect(await respuesta.json()).toEqual({ procesados: 1, enviados: 1, errores: 0 });
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0]).toContain(email);
    expect(mensajes[0]).toContain('Isla de Gaspar 2445');
    expect(mensajes[0]).toContain('Espalda');
    const repetida = await request.get('/api/recordatorios', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect((await repetida.json()).enviados).toBe(0);
  } finally {
    db(`delete from public.citas where id in ('${citaId}','${canceladaId}')`);
    if (userId) await admin.auth.admin.deleteUser(userId);
    await new Promise<void>(resolve => smtp.close(() => resolve()));
  }
});
