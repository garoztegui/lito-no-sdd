import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

test('las citas confirmadas pasadas se muestran como completadas sin acciones', async ({ page }) => {
  const sufijo = crypto.randomUUID();
  const adminEmail = `completadas-${sufijo}@example.test`;
  const invitado = `Invitado ${sufijo}`;
  let adminId = '';
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', statement], { encoding: 'utf8' }).trim();
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signUp({ email: adminEmail, password: 'ClaveSegura123', options: { data: { nombre: 'Admin prueba', telefono: '099123456', sexo: 'Mujer' } } });
    expect(error).toBeNull();
    adminId = data.user!.id;
    sql(`update public.perfiles set es_administrador=true where id='${adminId}'`);
    const fecha = sql("select to_char((clock_timestamp() at time zone 'America/Montevideo')::date - 2, 'YYYY-MM-DD')");
    const citaId = crypto.randomUUID();
    sql(`insert into public.citas (id,cliente_id,inicio,servicio,estado) select '${citaId}',null,slot,'Espalda','confirmada' from (select (date '${fecha}' + make_interval(hours => h)) at time zone 'America/Montevideo' slot from generate_series(0,23) h) s where not exists(select 1 from public.citas c where c.inicio=s.slot and c.estado in ('pendiente','confirmada','propuesta')) limit 1; insert into private.citas_invitados (cita_id,nombre) values ('${citaId}','${invitado}');`);
    await page.goto('/');
    await page.getByLabel('Email').first().fill(adminEmail);
    await page.getByLabel('Contraseña').first().fill('ClaveSegura123');
    await page.getByRole('button', { name: 'INGRESAR' }).click();
    await expect(page.getByRole('link', { name: 'Ver agenda' })).toBeVisible();
    await page.goto(`/agenda-admin?seccion=agenda&mes=${fecha.slice(0, 7)}&dia=${fecha}`);
    const fila = page.getByRole('row').filter({ hasText: invitado });
    await expect(fila).toContainText('Completada');
    await expect(fila).toContainText('(usuario no registrado)');
    await expect(fila.getByRole('link')).toHaveCount(0);
    await expect(fila.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('link', { name: `${fecha}, con reservas` })).toBeVisible();
  } finally {
    sql(`delete from public.citas where id in (select cita_id from private.citas_invitados where nombre='${invitado}'); ${adminId ? `update public.perfiles set es_administrador=false where id='${adminId}'; delete from auth.users where id='${adminId}';` : ''}`);
  }
});
