import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('muestra los datos en tabla ordenada por nombre y permite ver las citas', async ({ page }) => {
  const sufijo = crypto.randomUUID();
  const admin = `tabla-admin-${sufijo}@example.test`;
  const primero = crypto.randomUUID();
  const segundo = crypto.randomUUID();
  const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  try {
    sql(`insert into auth.users (id, email, raw_user_meta_data) values
      ('${primero}', 'tabla-ana-${sufijo}@example.test', '{"nombre":"Ana Zárate","telefono":"099111222","sexo":"Mujer"}'),
      ('${segundo}', 'tabla-zoe-${sufijo}@example.test', '{"nombre":"Zoe Álvarez","telefono":"099333444","sexo":"Hombre"}')`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Administrador Tabla');
    await registro.getByLabel('Email').fill(admin);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'Registrarse' }).click();
    await expect(registro.getByText('Cuenta creada.')).toBeVisible();
    await page.goto('/agenda-admin/clientes');
    await expect(page.getByText('No tenés acceso a esta sección.')).toBeVisible();
    await expect(page.getByText('Ana Zárate')).toHaveCount(0);
    sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${admin}')`);
    await page.goto('/agenda-admin/clientes');
    const tabla = page.getByRole('table', { name: 'Lista de clientes' });
    const filas = tabla.getByRole('row');
    const ana = filas.filter({ hasText: 'Ana Zárate' });
    const zoe = filas.filter({ hasText: 'Zoe Álvarez' });
    for (const dato of ['Ana Zárate', `tabla-ana-${sufijo}@example.test`, '099111222', 'Mujer']) await expect(ana).toContainText(dato);
    const nombres = await filas.allTextContents();
    expect(nombres.findIndex(texto => texto.includes('Ana Zárate'))).toBeLessThan(nombres.findIndex(texto => texto.includes('Zoe Álvarez')));
    await expect(zoe).toContainText('099333444');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await ana.getByRole('link', { name: 'Ver citas del usuario' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Ana Zárate' })).toBeVisible();
  } finally {
    sql(`delete from auth.users where id in ('${primero}', '${segundo}') or email = '${admin}'`);
  }
});
