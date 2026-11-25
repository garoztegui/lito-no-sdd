import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

for (const administrador of [false, true]) {
  test(`la ayuda muestra el contenido correspondiente al ${administrador ? 'administrador' : 'cliente'}`, async ({ page }) => {
    const email = `ayuda-${crypto.randomUUID()}@example.test`;
    let id = '';
    const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', statement], { encoding: 'utf8' });
    try {
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
      const { data, error } = await client.auth.signUp({ email, password: 'ClaveSegura123', options: { data: { nombre: 'Persona Prueba', telefono: '099123456', sexo: 'Mujer' } } });
      expect(error).toBeNull();
      id = data.user!.id;
      if (administrador) sql(`update public.perfiles set es_administrador=true where id='${id}'`);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
      await ingreso.getByLabel('Email').fill(email);
      await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
      await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
      await expect(page.getByText('Persona Prueba', { exact: true })).toBeVisible();
      await page.goto('/como-funciona');
      await expect(page.getByText('¿Hay propuesta? Tú decides 🤔')).toBeVisible();
      if (administrador) {
        await expect(page.getByRole('heading', { name: '¿Cómo funciona para el usuario?' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '¿Qué puedo hacer como administrador?' })).toBeVisible();
        await expect(page.getByText(/Reservar para otras personas/)).toBeVisible();
        await expect(page.getByText(/Gestionar la agenda/)).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: 'Tu cita, paso a paso ✨' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '¿Qué puedo hacer como administrador?' })).toHaveCount(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      if (id) sql(`update public.perfiles set es_administrador=false where id='${id}'; delete from auth.users where id='${id}'`);
    }
  });
}
