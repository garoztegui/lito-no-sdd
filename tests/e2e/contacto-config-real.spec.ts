import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';

test('el administrador guarda datos que el cliente consulta en contacto y ubicación', async ({ page, browser }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replaceAll('"', '');
  if (url !== 'http://127.0.0.1:57521') throw new Error('La prueba solo puede ejecutarse contra Supabase local');
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const usuarios: string[] = [];
  const correoAdmin = `contacto-admin-${crypto.randomUUID()}@example.test`;
  const correoCliente = `contacto-cliente-${crypto.randomUUID()}@example.test`;
  const numeroPrueba = `prueba-${crypto.randomUUID()}`;
  const contextoCliente = await browser.newContext();
  try {
    for (const email of [correoAdmin, correoCliente]) {
      const creado = await admin.auth.admin.createUser({ email, password: 'ClaveSegura123', email_confirm: true, user_metadata: { nombre: 'Persona Prueba', telefono: '099123456', sexo: 'Mujer' } });
      expect(creado.error).toBeNull();
      usuarios.push(creado.data.user!.id);
    }
    expect(usuarios[0]).toMatch(/^[0-9a-f-]{36}$/);
    execFileSync('docker', ['exec','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update public.perfiles set es_administrador=true where id='${usuarios[0]}'`]);
    await page.goto('/');
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(correoAdmin);
    await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
    await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByText('Persona Prueba', { exact: true })).toBeVisible();
    await page.goto('/configuracion');
    const datos = page.getByRole('region', { name: 'Contacto y medios de pago' });
    await datos.getByLabel('Teléfono').fill('099 111 222');
    await datos.getByLabel('Dirección').fill('Calle Ficticia 123, Montevideo, Uruguay');
    await datos.getByRole('button', { name: 'GUARDAR' }).click();
    await expect(datos.getByRole('status')).toHaveText('Datos guardados.');
    const bancos = page.getByRole('region', { name: 'Cuentas bancarias' });
    await bancos.getByLabel('Entidad bancaria').fill('Banco Prueba');
    await bancos.getByLabel('Titular', { exact: true }).fill('Persona Ejemplo');
    await bancos.getByLabel('Moneda').selectOption('Dólares');
    await bancos.getByLabel('Número').fill(numeroPrueba);
    await bancos.getByRole('button', { name: 'GUARDAR CUENTA' }).click();
    await expect(bancos.getByRole('status')).toHaveText('Cuenta guardada.');
    const cliente = await contextoCliente.newPage();
    await cliente.goto('/');
    const acceso = cliente.getByRole('form', { name: 'Iniciar sesión' });
    await acceso.getByLabel('Email').fill(correoCliente);
    await acceso.getByLabel('Contraseña').fill('ClaveSegura123');
    await acceso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(cliente.getByText('Persona Prueba', { exact: true })).toBeVisible();
    await cliente.goto('/medios-de-pago-y-contacto');
    await expect(cliente.getByRole('link', { name: '099 111 222' })).toHaveAttribute('href', 'https://wa.me/59899111222');
    await expect(cliente.getByText('Banco Prueba', { exact: true })).toBeVisible();
    await expect(cliente.getByText('Titular: Persona Ejemplo')).toBeVisible();
    await expect(cliente.getByText('Moneda: Dólares')).toBeVisible();
    await expect(cliente.getByText(`Número: ${numeroPrueba}`)).toBeVisible();
    await cliente.goto('/ubicacion');
    await expect(cliente.getByText('Calle Ficticia 123, Montevideo, Uruguay')).toBeVisible();
    await expect(cliente.locator('iframe[title="Mapa de ubicación de LITO"]')).toHaveAttribute('src', /Calle\+Ficticia\+123/);
  } finally {
    await contextoCliente.close();
    await admin.from('cuentas_bancarias').delete().eq('numero', numeroPrueba);
    if (usuarios[0] && /^[0-9a-f-]{36}$/.test(usuarios[0])) execFileSync('docker', ['exec','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update public.perfiles set es_administrador=false where id='${usuarios[0]}'`]);
    for (const usuario of usuarios) await admin.auth.admin.deleteUser(usuario);
  }
});
