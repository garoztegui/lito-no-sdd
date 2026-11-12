import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('el administrador revisa y confirma una reducción de disponibilidad', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `story9-${crypto.randomUUID()}@example.test`;
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', statement]);
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Administrador Ejemplo');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
  sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${email}')`);
  let llamadas = 0;
  try {
    await page.route(/\/rest\/v1\/rpc\/guardar_disponibilidad_semanal(?:\?|$)/, async route => {
      const cuerpo = route.request().postDataJSON();
      llamadas++;
      if (llamadas <= 2) {
        expect(cuerpo.p_confirmar).toBe(false);
        await route.fulfill({ json: { resultado: 'confirmacion', cantidad: 1, citas: ['11111111-1111-1111-1111-111111111111'] } });
      } else {
        expect(cuerpo.p_confirmar).toBe(true);
        expect(cuerpo.p_citas).toEqual(['11111111-1111-1111-1111-111111111111']);
        await route.fulfill({ json: { resultado: 'guardada' } });
      }
    });
    await page.goto('/agenda-admin');
    const lunes = page.getByRole('group', { name: 'Lunes' });
    await expect(lunes.getByLabel('07:00')).toBeChecked();
    await lunes.getByLabel('07:00').uncheck();
    await page.getByRole('button', { name: 'Guardar disponibilidad' }).click();
    await expect(page.getByText('Hay 1 citas afectadas. ¿Querés cancelarlas y guardar la disponibilidad?')).toBeVisible();
    await page.getByRole('button', { name: 'No guardar' }).click();
    await expect(page.getByText('No se realizaron cambios.')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar disponibilidad' }).click();
    await page.getByRole('button', { name: 'Cancelar citas y guardar' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Disponibilidad guardada.')).toBeVisible();
    expect(llamadas).toBe(3);
  } finally {
    sql(`delete from auth.users where email = '${email}'`);
  }
});

test('la agenda ofrece los horarios configurados para el día elegido', async ({ page }) => {
  const email = `story9-cliente-${crypto.randomUUID()}@example.test`;
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', statement]);
  try {
    await page.goto('/');
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Cliente Ejemplo');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'Registrarse' }).click();
    await expect(registro.getByText('Cuenta creada.')).toBeVisible();
    await page.route(/\/rest\/v1\/rpc\/disponibilidad_semanal(?:\?|$)/, route => route.fulfill({ json: [{ dia: 6, hora: 14 }] }));
    await page.route(/\/rest\/v1\/rpc\/horarios_ocupados(?:\?|$)/, route => route.fulfill({ json: [] }));
    await page.reload();
    const sabado = new Date(Date.now() + 35 * 86400000);
    while (sabado.getUTCDay() !== 6) sabado.setUTCDate(sabado.getUTCDate() + 1);
    await page.getByLabel('Fecha').fill(sabado.toISOString().slice(0, 10));
    await expect(page.getByRole('button', { name: '14:00 Disponible' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Disponible$/ })).toHaveCount(1);
  } finally {
    sql(`delete from auth.users where email = '${email}'`);
  }
});
