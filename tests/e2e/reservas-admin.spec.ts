import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
test('administrador reserva para una persona sin cuenta y un usuario registrado', async ({ page }) => {
  const sufijo = crypto.randomUUID();
  const adminEmail = `admin-${sufijo}@example.test`;
  const clienteEmail = `cliente-${sufijo}@example.test`;
  const nombreInvitado = `Invitado ${sufijo}`;
  const ids: string[] = [];
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', statement], { encoding: 'utf8' }).trim();
  try {
    for (const [email, nombre] of [[adminEmail, 'Admin prueba'], [clienteEmail, 'Cliente prueba']]) {
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
      const { data, error } = await client.auth.signUp({ email, password: 'ClaveSegura123', options: { data: { nombre, telefono: '099123456', sexo: 'Mujer' } } });
      expect(error).toBeNull();
      ids.push(data.user!.id);
    }
    sql(`update public.perfiles set es_administrador=true where id='${ids[0]}'`);
    const fecha = sql("select to_char(slot at time zone 'America/Montevideo','YYYY-MM-DD') from (select ((current_date+n)::timestamp+time '10:00') at time zone 'America/Montevideo' slot from generate_series(20,70) n) s where private.inicio_disponible(slot) and private.inicio_disponible(slot+interval '1 hour') and not exists(select 1 from public.citas c where c.inicio in (slot,slot+interval '1 hour') and c.estado in ('pendiente','confirmada','propuesta')) limit 1");
    expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await page.goto('/');
    await page.getByLabel('Email').first().fill(adminEmail);
    await page.getByLabel('Contraseña').first().fill('ClaveSegura123');
    await page.getByRole('button', { name: 'INGRESAR' }).click();
    await page.getByRole('link', { name: 'Reservar una cita' }).click();
    await page.getByLabel('Nombre', { exact: true }).fill(nombreInvitado);
    await page.getByLabel('Servicio').selectOption({ label: 'Espalda' });
    await page.getByLabel('Fecha').fill(fecha);
    await page.getByRole('button', { name: '10:00 Disponible' }).click();
    await page.getByRole('button', { name: 'Confirmar reserva' }).click();
    await expect(page.getByRole('status')).toHaveText('La cita quedó confirmada.');
    await page.getByLabel('Persona').selectOption(ids[1]);
    sql(`update auth.users set email=null where id='${ids[1]}'`);
    await page.getByRole('button', { name: '11:00 Disponible' }).click();
    await page.getByRole('button', { name: 'Confirmar reserva' }).click();
    await expect(page.getByRole('status')).toHaveText('La cita quedó confirmada.');
    sql(`update auth.users set email='${clienteEmail}' where id='${ids[1]}'`);
    await page.goto(`/agenda-admin?seccion=agenda&mes=${fecha.slice(0, 7)}&dia=${fecha}`);
    const invitado = page.getByRole('row').filter({ hasText: nombreInvitado });
    const registrado = page.getByRole('row').filter({ hasText: 'Cliente prueba' });
    await expect(invitado).toContainText('confirmada');
    await expect(invitado.getByRole('link', { name: nombreInvitado })).toBeVisible();
    await expect(invitado).toContainText('(usuario no registrado)');
    await invitado.getByRole('link', { name: nombreInvitado }).click();
    await expect(page.getByRole('dialog', { name: 'Datos del cliente' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Datos del cliente' }).getByRole('button', { name: 'Cerrar' }).click();
    await expect(registrado).toContainText('confirmada');
    await expect(registrado).not.toContainText('(usuario no registrado)');
  } finally {
    sql(`delete from public.citas where id in (select cita_id from private.citas_invitados where nombre='${nombreInvitado}'); update public.perfiles set es_administrador=false where id in (${ids.map(id => `'${id}'`).join(',') || 'null'}); delete from auth.users where id in (${ids.map(id => `'${id}'`).join(',') || 'null'});`);
  }
});
