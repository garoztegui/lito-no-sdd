import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

test('el administrador desbloquea un servicio y puede volver a bloquearlo', async ({ page }) => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('http://127.0.0.1:57521');
  const id = crypto.randomUUID();
  const nombre = `Servicio ${id}`;
  const email = `desbloquear-${id}@example.test`;
  let usuario = '';
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', statement], { encoding: 'utf8' }).trim();
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signUp({ email, password: 'ClaveSegura123', options: { data: { nombre: 'Admin Prueba', telefono: '099123456', sexo: 'Mujer' } } });
    expect(error).toBeNull();
    usuario = data.user!.id;
    sql(`update public.perfiles set es_administrador=true where id='${usuario}'; insert into private.servicios(id,nombre,bloqueado) values ('${id}','${nombre}',true)`);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/');
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
    await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Ver agenda' })).toBeVisible();
    await page.goto('/agenda-admin?seccion=servicios');
    await page.getByLabel('Seleccionar servicio').selectOption({ label: nombre });
    await expect(page.getByText('Estado: Bloqueado')).toBeVisible();
    await page.getByRole('button', { name: 'Desbloquear servicio' }).click();
    await page.getByRole('dialog', { name: 'Confirmar desbloqueo' }).getByRole('button', { name: 'Sí' }).click();
    await expect(page.getByText('Servicio desbloqueado.')).toBeVisible();
    await expect(page.getByText('Estado: Disponible')).toBeVisible();
    expect(sql(`select bloqueado from private.servicios where id='${id}'`)).toBe('f');
    await page.getByRole('button', { name: 'Bloquear servicio' }).click();
    await page.getByRole('dialog', { name: 'Confirmar bloqueo' }).getByRole('button', { name: 'Sí' }).click();
    await expect(page.getByText('Servicio bloqueado.')).toBeVisible();
    await expect(page.getByText('Estado: Bloqueado')).toBeVisible();
  } finally {
    sql(`delete from private.servicios where id='${id}'; ${usuario ? `update public.perfiles set es_administrador=false where id='${usuario}'; delete from auth.users where id='${usuario}'` : ''}`);
  }
});
