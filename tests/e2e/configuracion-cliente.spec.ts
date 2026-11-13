import { expect, test } from '@playwright/test';

test('el cliente usa el menú, filtra sus citas y modifica sus datos', async ({ page }) => {
  const email = `config-${crypto.randomUUID()}@example.test`;
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cliente Prueba');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
  await page.reload();
  for (const nombre of ['Mis citas', 'Reservar cita', 'Configuración']) await expect(page.getByRole('button', { name: nombre, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await expect(page.getByLabel('Email de la cuenta')).toHaveValue(email);
  await expect(page.getByLabel('Email de la cuenta')).toBeDisabled();
  await page.getByLabel('Nombre completo').fill('Nombre actualizado');
  await page.getByLabel('Teléfono').fill('099987654');
  await page.getByLabel('Sexo').selectOption('Mujer');
  await page.getByRole('button', { name: 'Guardar datos' }).click();
  await expect(page.getByText('Datos actualizados.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Nombre actualizado');
  await expect(page.getByLabel('Teléfono')).toHaveValue('099987654');
  await expect(page.getByLabel('Sexo')).toHaveValue('Mujer');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaClaveSegura456');
  await page.getByLabel('Confirmar nueva contraseña').fill('NuevaClaveSegura456');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(page.getByText('Contraseña actualizada.')).toBeVisible();
  await page.getByRole('button', { name: 'Volver al menú' }).click();
  await page.route(/\/rest\/v1\/citas(?:\?|$)/, route => route.fulfill({ json: [
    { id: '1', inicio: '2099-01-07T13:00:00Z', servicio: 'Espalda', estado: 'pendiente' },
    { id: '2', inicio: '2099-01-08T13:00:00Z', servicio: 'Cuerpo entero', estado: 'confirmada' },
  ] }));
  await page.getByRole('button', { name: 'Mis citas', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page.getByLabel('Filtrar por estado').selectOption('confirmada');
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem')).toContainText('Cuerpo entero');
  await page.getByRole('button', { name: 'Volver al menú' }).click();
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page.getByRole('heading', { name: 'Solicitar una cita' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
  await ingreso.getByLabel('Email').fill(email);
  await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
  await ingreso.getByRole('button', { name: 'Ingresar' }).click();
  await expect(ingreso.getByRole('alert')).toHaveText('No se pudo iniciar sesión.');
  await ingreso.getByLabel('Contraseña').fill('NuevaClaveSegura456');
  await ingreso.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('button', { name: 'Configuración', exact: true })).toBeVisible();
});
