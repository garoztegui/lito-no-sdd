import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';

test('la preferencia de agenda solo se guarda al confirmar en la sección de aplicación', async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replaceAll('"', '');
  if (url !== 'http://127.0.0.1:57521') throw new Error('La prueba solo puede ejecutarse contra Supabase local');
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const email = `config-app-${crypto.randomUUID()}@example.test`;
  let id: string | undefined;
  let guardados = 0;
  let preferenciaGuardada = { agenda_habilitada: true, hora_agenda: '06:00', solicitudes_habilitadas: true };
  try {
    const creado = await admin.auth.admin.createUser({ email, password: 'ClaveSegura123', email_confirm: true, user_metadata: { nombre: 'Admin Prueba', telefono: '099123456', sexo: 'Mujer' } });
    expect(creado.error).toBeNull();
    id = creado.data.user?.id;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    execFileSync('docker', ['exec','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update public.perfiles set es_administrador=true where id='${id}'`]);
    await page.route('**/rest/v1/rpc/preferencias_notificaciones', async route => {
      const cuerpo = route.request().postDataJSON();
      if (Object.hasOwn(cuerpo, 'p_agenda_habilitada')) { guardados++; preferenciaGuardada = { agenda_habilitada: cuerpo.p_agenda_habilitada, hora_agenda: cuerpo.p_hora_agenda, solicitudes_habilitadas: cuerpo.p_solicitudes_habilitadas }; }
      await route.fulfill({ json: preferenciaGuardada });
    });
    await page.goto('/');
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
    await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByText('Admin Prueba', { exact: true })).toBeVisible();
    await page.goto('/configuracion');
    const seccion = page.getByRole('region', { name: 'Configurar aplicación' });
    const checkbox = seccion.getByRole('checkbox', { name: 'Enviar agenda diaria por mail' });
    const hora = seccion.getByLabel('Hora de envío de la agenda diaria (Montevideo)');
    const solicitudes = seccion.getByRole('checkbox', { name: 'Recibir emails de nuevas solicitudes' });
    await expect(checkbox).toBeChecked();
    await expect(hora).toHaveValue('06:00');
    await expect(solicitudes).toBeChecked();
    await checkbox.uncheck();
    await hora.fill('08:37');
    await solicitudes.uncheck();
    expect(guardados).toBe(0);
    await page.reload();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await hora.fill('08:37');
    await solicitudes.uncheck();
    await seccion.getByRole('button', { name: 'GUARDAR', exact: true }).click();
    await expect(seccion.getByRole('status')).toHaveText('Configuración guardada.');
    expect(guardados).toBe(1);
    await page.reload();
    await expect(checkbox).not.toBeChecked();
    await expect(hora).toHaveValue('08:37');
    await expect(solicitudes).not.toBeChecked();
  } finally {
    if (id && /^[0-9a-f-]{36}$/.test(id)) {
      execFileSync('docker', ['exec','supabase_db_litov2','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c', `update public.perfiles set es_administrador=false where id='${id}'`]);
      await admin.auth.admin.deleteUser(id);
    }
  }
});
