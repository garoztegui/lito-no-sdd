import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

test('el aviso de citas futuras requiere pulsar Entendido', async ({ page }) => {
  expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('http://127.0.0.1:57521');
  const id = crypto.randomUUID();
  const email = `aviso-${id}@example.test`;
  const nombre = `Servicio ${id}`;
  let usuario = '';
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', statement], { encoding: 'utf8' }).trim();
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signUp({ email, password: 'ClaveSegura123', options: { data: { nombre: 'Admin Prueba', telefono: '099123456', sexo: 'Mujer' } } });
    expect(error).toBeNull();
    usuario = data.user!.id;
    sql(`update public.perfiles set es_administrador=true where id='${usuario}'; insert into private.servicios(id,nombre) values ('${id}','${nombre}'); insert into public.citas(cliente_id,inicio,servicio,estado) values ('${usuario}', now()+interval '300 days', '${nombre}', 'confirmada')`);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/');
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
    await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Ver agenda' })).toBeVisible();
    await page.goto('/agenda-admin?seccion=servicios');
    await page.getByLabel('Seleccionar servicio').selectOption({ label: nombre });
    await page.getByRole('button', { name: 'Borrar servicio' }).click();
    await page.getByRole('dialog', { name: 'Confirmar eliminación' }).getByRole('button', { name: 'Sí' }).click();
    const aviso = page.getByRole('dialog', { name: 'Servicio con citas futuras' });
    await expect(aviso).toContainText('El servicio tiene citas futuras. Podés bloquearlo para impedir nuevas reservas.');
    await page.keyboard.press('Escape');
    await expect(aviso).toBeVisible();
    await aviso.getByRole('button', { name: 'Entendido' }).click();
    await expect(aviso).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Bloquear servicio' })).toBeVisible();
    expect(sql(`select count(*) from private.servicios where id='${id}'`)).toBe('1');
  } finally {
    if (usuario) sql(`delete from public.citas where cliente_id='${usuario}'; update public.perfiles set es_administrador=false where id='${usuario}'; delete from auth.users where id='${usuario}'`);
    sql(`delete from private.servicios where id='${id}'`);
  }
});
