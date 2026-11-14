import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

const contenedor = process.env.STORY15_DB_CONTAINER ?? '';
test.skip(!/^supabase_db_litov2-story13-[a-f0-9]{8}$/.test(contenedor) || process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:58621', 'Requiere una instancia local aislada con datos sintéticos.');

test('el administrador gestiona las citas futuras según su estado', async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.baseURL !== 'http://127.0.0.1:3137', 'Requiere el servidor aislado.');
  test.setTimeout(90000);
  const cliente = crypto.randomUUID();
  const email = `story15-${crypto.randomUUID()}@example.test`;
  const fecha = new Date(Date.now() + 45 * 86400000);
  while ([0, 6].includes(fecha.getUTCDay())) fecha.setUTCDate(fecha.getUTCDate() + 1);
  const dia = fecha.toISOString().slice(0, 10);
  const sql = (consulta: string) => execFileSync('docker', ['exec', contenedor, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  try {
    sql(`insert into auth.users (id,email,raw_user_meta_data) values ('${cliente}','cliente-${email}','{"nombre":"Cliente Sintético","telefono":"099111222","sexo":"Mujer"}');
      insert into public.citas (cliente_id,inicio,servicio,estado) values
      ('${cliente}', '${dia} 10:00 America/Montevideo','Espalda','pendiente'),
      ('${cliente}', '${dia} 12:00 America/Montevideo','Cuerpo entero','pendiente'),
      ('${cliente}', '${dia} 13:00 America/Montevideo','Masaje deportivo','confirmada'),
      ('${cliente}', '${dia} 14:00 America/Montevideo','Espalda','propuesta'),
      ('${cliente}', now() + interval '2 hours 17 seconds','Cuerpo entero','confirmada'),
      ('${cliente}', now() - interval '1 day','Espalda','confirmada')`);
    await page.setViewportSize({ width: 390, height: 844 });
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
    const propuesta = filas.filter({ hasText: 'Estado: propuesta' });
    await expect(propuesta.getByRole('button')).toHaveCount(0);
    const confirmada = filas.filter({ hasText: 'Masaje deportivo' });
    await expect(confirmada.getByRole('button', { name: 'Proponer otro horario' })).toHaveCount(0);
    const rechazo = filas.filter({ hasText: 'Cuerpo entero' }).filter({ hasText: 'Estado: pendiente' });
    await rechazo.getByRole('button', { name: 'Rechazar solicitud' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Confirmar rechazo' }).getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(filas.filter({ hasText: 'Cuerpo entero' }).filter({ hasText: 'Estado: rechazada' })).toBeVisible();
    const pendiente = filas.filter({ hasText: 'Espalda' }).filter({ hasText: 'Estado: pendiente' });
    await pendiente.getByRole('button', { name: 'Proponer otro horario' }).click();
    await pendiente.getByLabel('Fecha').fill(dia);
    await pendiente.getByRole('button', { name: '11:00 Disponible' }).click();
    await pendiente.getByRole('button', { name: 'Confirmar propuesta' }).click();
    await expect(filas.filter({ hasText: 'Estado: propuesta' })).toHaveCount(2);
    await confirmada.getByLabel('Motivo de cancelación').fill('  Motivo de prueba  ');
    await confirmada.getByRole('button', { name: 'Cancelar cita' }).click();
    const confirmacion = page.getByRole('dialog', { name: 'Confirmar cancelación' });
    await confirmacion.getByRole('button', { name: 'No', exact: true }).click();
    await expect(confirmada).toContainText('Estado: confirmada');
    await confirmada.getByRole('button', { name: 'Cancelar cita' }).click();
    await confirmacion.getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(filas.filter({ hasText: 'Masaje deportivo' })).toContainText('Estado: cancelada');
    const cerca = filas.filter({ hasText: 'Cuerpo entero' }).filter({ hasText: 'Estado: confirmada' });
    await cerca.getByLabel('Motivo de cancelación').fill('Motivo');
    await cerca.getByRole('button', { name: 'Cancelar cita' }).click();
    await confirmacion.getByRole('button', { name: 'Sí', exact: true }).click();
    await expect(cerca.getByRole('alert')).toContainText('24 horas o menos');
    expect(sql(`select estado || ':' || motivo_cancelacion from public.citas where cliente_id='${cliente}' and servicio='Masaje deportivo'`)).toBe('cancelada:Motivo de prueba');
    expect(sql(`select count(*) from public.citas where inicio='${dia} 10:00 America/Montevideo' and estado in ('pendiente','confirmada','propuesta')`)).toBe('0');
    expect(sql(`select count(*) from public.citas where inicio='${dia} 11:00 America/Montevideo' and estado='propuesta'`)).toBe('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    sql(`delete from public.citas where cliente_id='${cliente}'; delete from auth.users where id='${cliente}' or email='${email}'`);
  }
});
