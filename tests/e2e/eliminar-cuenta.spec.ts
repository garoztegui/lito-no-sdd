import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test('el cliente puede cancelar o confirmar la eliminación de su cuenta', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replaceAll('"', '');
  if (url !== 'http://127.0.0.1:57521') throw new Error('La prueba solo puede ejecutarse contra Supabase local');
  const email = `eliminar-${crypto.randomUUID()}@example.test`;
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  let userId: string | undefined;
  try {
    const creado = await admin.auth.admin.createUser({ email, password: 'ClaveSegura123', email_confirm: true, user_metadata: { nombre: 'Cliente Prueba', telefono: '099123456', sexo: 'Mujer' } });
    expect(creado.error).toBeNull();
    userId = creado.data.user?.id;
    await page.goto('/');
    const login = page.getByRole('form', { name: 'Iniciar sesión' });
    await login.getByLabel('Email').fill(email);
    await login.getByLabel('Contraseña').fill('ClaveSegura123');
    await login.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByText('Cliente Prueba', { exact: true })).toBeVisible();
    await page.goto('/configuracion');
    await page.getByRole('button', { name: 'Eliminar cuenta', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Eliminar cuenta' });
    await expect(modal).toContainText('todas tus citas futuras');
    await modal.getByRole('button', { name: 'No' }).click();
    await expect(modal).toBeHidden();
    await page.getByRole('button', { name: 'Eliminar cuenta', exact: true }).click();
    await modal.getByRole('button', { name: 'Sí' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('form', { name: 'Iniciar sesión' })).toBeVisible();
    const acceso = await createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: 'ClaveSegura123' });
    expect(acceso.error).not.toBeNull();
    expect((await admin.auth.admin.getUserById(userId!)).data.user).toBeNull();
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
