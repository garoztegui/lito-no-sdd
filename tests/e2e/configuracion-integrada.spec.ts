import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';

test('el administrador guarda las preferencias, contacto y plazos en sus secciones', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replaceAll('"', '');
  if (url !== 'http://127.0.0.1:57521') throw new Error('La prueba solo puede ejecutarse contra Supabase local');
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const email = `integrada-${crypto.randomUUID()}@example.test`;
  let id: string | undefined;
  let preferencias = { agenda_habilitada: true, hora_agenda: '06:00', solicitudes_habilitadas: true };
  let contacto = { telefono: '094 553 211', direccion: 'Isla de Gaspar 2445, Montevideo, Uruguay', titular_cuenta: 'José Luis', cuenta_bancaria: 'BANCO REPUBLICA $ 00040248300001' };
  let plazos = { reserva: 4, cancelacion: 12 };
  let cuentas = [{ id: 1, entidad: 'BANCO REPUBLICA', titular: 'José Luis', moneda: 'Pesos', numero: '00040248300001' }];
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    const creado = await admin.auth.admin.createUser({ email, password: 'ClaveSegura123', email_confirm: true, user_metadata: { nombre: 'Admin Prueba', telefono: '099123456', sexo: 'Mujer' } });
    expect(creado.error).toBeNull();
    id = creado.data.user?.id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    execFileSync('docker', ['exec','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update public.perfiles set es_administrador=true where id='${id}'`]);
    await page.route('**/rest/v1/rpc/preferencias_notificaciones', async route => {
      const cuerpo = route.request().postDataJSON();
      if (Object.hasOwn(cuerpo, 'p_agenda_habilitada')) preferencias = { agenda_habilitada: cuerpo.p_agenda_habilitada, hora_agenda: cuerpo.p_hora_agenda, solicitudes_habilitadas: cuerpo.p_solicitudes_habilitadas };
      await route.fulfill({ json: preferencias });
    });
    await page.route('**/rest/v1/rpc/plazos', route => route.fulfill({ json: plazos }));
    await page.route('**/rest/v1/rpc/guardar_plazos', async route => {
      const cuerpo = route.request().postDataJSON(); plazos = { reserva: cuerpo.p_reserva, cancelacion: cuerpo.p_cancelacion };
      await route.fulfill({ json: null });
    });
    await page.route('**/rest/v1/contacto_config?*', async route => {
      if (route.request().method() === 'PATCH') contacto = route.request().postDataJSON();
      await route.fulfill({ json: contacto });
    });
    await page.route('**/rest/v1/cuentas_bancarias?*', async route => {
      const metodo = route.request().method();
      const idCuenta = Number(new URL(route.request().url()).searchParams.get('id')?.replace('eq.', ''));
      if (metodo === 'POST') {
        const cuenta = { id: 2, ...route.request().postDataJSON() }; cuentas.push(cuenta);
        return route.fulfill({ json: cuenta });
      }
      if (metodo === 'PATCH') {
        cuentas = cuentas.map(c => c.id === idCuenta ? { ...c, ...route.request().postDataJSON() } : c);
        return route.fulfill({ json: cuentas.find(c => c.id === idCuenta) });
      }
      if (metodo === 'DELETE') {
        cuentas = cuentas.filter(c => c.id !== idCuenta);
        return route.fulfill({ json: { id: idCuenta } });
      }
      return route.fulfill({ json: cuentas });
    });
    await page.goto('/');
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
    await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByText('Admin Prueba', { exact: true })).toBeVisible();
    await page.goto('/configuracion');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const notificaciones = page.getByRole('region', { name: 'Configurar aplicación' });
    await notificaciones.getByLabel('Hora de envío de la agenda diaria (Montevideo)').fill('08:37');
    await notificaciones.getByRole('checkbox', { name: 'Recibir emails de nuevas solicitudes' }).uncheck();
    await notificaciones.getByRole('button', { name: 'GUARDAR' }).click();
    await expect(notificaciones.getByRole('status')).toHaveText('Configuración guardada.');
    const datos = page.getByRole('region', { name: 'Contacto y medios de pago' });
    await datos.getByLabel('Teléfono').fill('123');
    await datos.getByRole('button', { name: 'GUARDAR' }).click();
    await expect(datos.getByRole('alert')).toContainText('teléfono válido');
    await datos.getByLabel('Teléfono').fill('099 111 222');
    await datos.getByLabel('Dirección').fill('Calle Ficticia 123');
    await datos.getByRole('button', { name: 'GUARDAR' }).click();
    await expect(datos.getByRole('status')).toHaveText('Datos guardados.');
    const bancos = page.getByRole('region', { name: 'Cuentas bancarias' });
    await expect(bancos.getByText('BANCO REPUBLICA', { exact: false })).toBeVisible();
    await bancos.getByLabel('Entidad bancaria').fill('Banco Prueba');
    await bancos.getByLabel('Titular', { exact: true }).fill('Persona Prueba');
    await bancos.getByLabel('Moneda').selectOption('Dólares');
    await bancos.getByLabel('Número').fill('12345');
    await bancos.getByRole('button', { name: 'GUARDAR CUENTA' }).click();
    await expect(bancos.getByRole('status')).toHaveText('Cuenta guardada.');
    const cuentaNueva = bancos.locator('div').filter({ hasText: 'Banco Prueba' });
    await cuentaNueva.getByRole('button', { name: 'Editar' }).click();
    await bancos.getByLabel('Moneda').selectOption('Pesos y dólares');
    await bancos.getByRole('button', { name: 'GUARDAR CUENTA' }).click();
    await expect(cuentaNueva).toContainText('Pesos y dólares');
    await cuentaNueva.getByRole('button', { name: 'Eliminar' }).click();
    await expect(bancos.getByRole('status')).toHaveText('Cuenta eliminada.');
    await expect(bancos.getByText('Banco Prueba', { exact: false })).toHaveCount(0);
    const limites = page.getByRole('region', { name: 'Plazos de reserva y cancelación' });
    await limites.getByLabel('Reserva (horas)').fill('6');
    await limites.getByLabel('Cancelación del cliente (horas)').fill('18');
    await limites.getByRole('button', { name: 'GUARDAR' }).click();
    await expect(limites.getByRole('status')).toHaveText('Plazos guardados.');
    await page.reload();
    await expect(notificaciones.getByLabel('Hora de envío de la agenda diaria (Montevideo)')).toHaveValue('08:37');
    await expect(notificaciones.getByRole('checkbox', { name: 'Recibir emails de nuevas solicitudes' })).not.toBeChecked();
    await expect(datos.getByLabel('Dirección')).toHaveValue('Calle Ficticia 123');
    await expect(limites.getByLabel('Reserva (horas)')).toHaveValue('6');
    await page.goto('/como-funciona');
    await expect(page.getByText('Las solicitudes y propuestas pendientes vencen 6 horas antes', { exact: false })).toBeVisible();
    await expect(page.getByText('Puedes cancelar una cita cuando faltan más de 18 horas', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL('/');
  } finally {
    if (id && /^[0-9a-f-]{36}$/.test(id)) {
      execFileSync('docker', ['exec','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update public.perfiles set es_administrador=false where id='${id}'`]);
      await admin.auth.admin.deleteUser(id);
    }
  }
});
