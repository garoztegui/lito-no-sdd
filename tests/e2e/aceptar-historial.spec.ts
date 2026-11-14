import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('permite aceptar y confirmar el rechazo desde el historial', async ({ page }) => {
  const cliente = crypto.randomUUID();
  const email = `historial-admin-${crypto.randomUUID()}@example.test`;
  const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  const fecha = new Date(Date.now() + 45 * 86400000);
  while (sql(`select count(*) from public.citas where inicio in (('${fecha.toISOString().slice(0, 10)} 10:00'::timestamp at time zone 'America/Montevideo'), ('${fecha.toISOString().slice(0, 10)} 12:00'::timestamp at time zone 'America/Montevideo')) and estado in ('pendiente','confirmada','propuesta')`) !== '0') fecha.setUTCDate(fecha.getUTCDate() + 1);
  const dia = fecha.toISOString().slice(0, 10);
  try {
    sql(`insert into auth.users (id,email,raw_user_meta_data) values ('${cliente}','historial-${cliente}@example.test','{"nombre":"Cliente Historial","telefono":"099111222","sexo":"Mujer"}');
      insert into public.citas (cliente_id,inicio,servicio,estado) values ('${cliente}', '${dia} 10:00 America/Montevideo','Espalda','pendiente'), ('${cliente}', '${dia} 12:00 America/Montevideo','Cuerpo entero','pendiente')`);
    await page.goto('/');
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Admin Prueba');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'Registrarse' }).click();
    await expect(registro.getByText('Cuenta creada.')).toBeVisible();
    sql(`update public.perfiles set es_administrador=true where id=(select id from auth.users where email='${email}')`);
    await page.goto(`/agenda-admin/clientes/${cliente}`);
    const filas = page.getByRole('region', { name: 'Historial de citas' }).getByRole('listitem');
    const aceptar = filas.filter({ hasText: 'Espalda' });
    const rechazar = filas.filter({ hasText: 'Cuerpo entero' });
    await expect(aceptar.getByRole('button', { name: 'Aceptar solicitud' })).toBeVisible();
    await expect(aceptar.getByRole('form', { name: 'Proponer horario' })).toBeVisible();
    await aceptar.getByRole('button', { name: 'Aceptar solicitud' }).click();
    await expect(aceptar).toContainText('Estado: confirmada');
    expect(sql(`select count(*) from private.eventos_email_citas where cita_id=(select id from public.citas where cliente_id='${cliente}' and servicio='Espalda') and tipo='confirmacion' and intentado`)).toBe('1');
    await rechazar.getByRole('button', { name: 'Rechazar solicitud' }).click();
    const confirmacion = page.getByRole('dialog', { name: 'Confirmar rechazo' });
    await confirmacion.getByRole('button', { name: 'No', exact: true }).click();
    await expect(rechazar).toContainText('Estado: pendiente');
    await rechazar.getByRole('button', { name: 'Rechazar solicitud' }).click();
    await confirmacion.getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(rechazar).toContainText('Estado: rechazada');
  } finally {
    sql(`delete from public.citas where cliente_id='${cliente}'; delete from auth.users where id='${cliente}' or email='${email}'`);
  }
});
