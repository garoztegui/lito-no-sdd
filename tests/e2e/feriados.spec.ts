import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';

test('el administrador ve la nota sobre los feriados automáticos', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replaceAll('"', '');
  if (url !== 'http://127.0.0.1:57521') throw new Error('La prueba solo puede ejecutarse contra Supabase local');
  const email = `feriados-${crypto.randomUUID()}@example.test`;
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  let id: string | undefined;
  try {
    const creado = await admin.auth.admin.createUser({ email, password: 'ClaveSegura123', email_confirm: true, user_metadata: { nombre: 'Admin Prueba', telefono: '099123456', sexo: 'Mujer' } });
    expect(creado.error).toBeNull();
    id = creado.data.user?.id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    execFileSync('docker', ['exec','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update public.perfiles set es_administrador=true where id='${id}'`]);
    await page.goto('/');
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
    await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByText('Admin Prueba', { exact: true })).toBeVisible();
    await page.goto('/agenda-admin?seccion=bloqueos');
    const nota = page.getByText('Los cinco feriados no laborables están bloqueados automáticamente para reservas:', { exact: false });
    await expect(nota).toBeVisible();
    for (const fecha of ['1.º de enero', '1.º de mayo', '18 de julio', '25 de agosto', '25 de diciembre']) await expect(nota).toContainText(fecha);
    await expect(nota.getByRole('button')).toHaveCount(0);
  } finally {
    if (id && /^[0-9a-f-]{36}$/.test(id)) {
      execFileSync('docker', ['exec','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update public.perfiles set es_administrador=false where id='${id}'`]);
      await admin.auth.admin.deleteUser(id);
    }
  }
});
