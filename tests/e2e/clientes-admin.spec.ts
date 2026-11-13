import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';

// Este recorrido requiere una instancia local aislada con únicamente datos sintéticos.
const contenedor = process.env.STORY13_DB_CONTAINER ?? '';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
test.skip(!/^supabase_db_litov2-story13-[a-f0-9]{8}$/.test(contenedor) || url !== 'http://127.0.0.1:58621', 'Requiere el entorno aislado de la historia 13.');

async function registrar(page: Page, email: string) {
  await page.goto('/');
  const registro = page.getByRole('form', { name: 'Registro' });
  await registro.getByLabel('Nombre completo').fill('Cuenta de Prueba');
  await registro.getByLabel('Email').fill(email);
  await registro.getByLabel('Teléfono').fill('099123456');
  await registro.getByLabel('Contraseña').fill('ClaveSegura123');
  await registro.getByRole('button', { name: 'Registrarse' }).click();
  await expect(registro.getByText('Cuenta creada.')).toBeVisible();
}

test('solo el administrador consulta datos e historial completo de clientes', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.use.baseURL !== 'http://127.0.0.1:3137', 'Requiere el servidor aislado en el puerto 3137.');
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  const clienteId = crypto.randomUUID();
  const vacioId = crypto.randomUUID();
  const sufijo = crypto.randomUUID();
  const adminEmail = `story13-admin-${sufijo}@example.test`;
  const usuarioEmail = `story13-usuario-${sufijo}@example.test`;
  const clienteEmail = `story13-cliente-${sufijo}@example.test`;
  const vacioEmail = `story13-vacio-${sufijo}@example.test`;
  const fechaFutura = new Date(Date.now() + 400 * 86400000);
  fechaFutura.setUTCHours(13, 0, 0, 0);
  const fechaFuturaTexto = new Intl.DateTimeFormat('es-UY', { dateStyle: 'long', timeZone: 'America/Montevideo' }).format(fechaFutura);
  const fechaFuturaEn = (dias: number) => new Date(fechaFutura.getTime() + dias * 86400000).toISOString();
  const sql = (consulta: string) => execFileSync('docker', ['exec', contenedor, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', consulta], { encoding: 'utf8' }).trim();
  const contextoCliente = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  try {
    sql(`insert into auth.users (id, email, raw_user_meta_data) values
      ('${clienteId}', '${clienteEmail}', '{"nombre":"Cliente Historia Trece","telefono":"099111222","sexo":"Mujer"}'),
      ('${vacioId}', '${vacioEmail}', '{"nombre":"Cliente Sin Citas","telefono":"099333444","sexo":"Hombre"}')`);
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado) values
      ('${clienteId}', '2020-01-15T13:00:00Z', 'Cuerpo entero', 'confirmada'),
      ('${clienteId}', '${fechaFuturaEn(0)}', 'Espalda', 'pendiente'),
      ('${clienteId}', '${fechaFuturaEn(1)}', 'Espalda', 'confirmada'),
      ('${clienteId}', '${fechaFuturaEn(2)}', 'Espalda', 'propuesta'),
      ('${clienteId}', '${fechaFuturaEn(3)}', 'Espalda', 'cancelada'),
      ('${clienteId}', '${fechaFuturaEn(4)}', 'Espalda', 'rechazada')`);

    await page.goto(`/agenda-admin/clientes/${clienteId}`);
    await expect(page.getByText('Ingresá con una cuenta de administrador para consultar clientes.')).toBeVisible();
    await expect(page.getByText(clienteEmail)).toHaveCount(0);

    const clientePage = await contextoCliente.newPage();
    await registrar(clientePage, usuarioEmail);
    await clientePage.goto(`/agenda-admin/clientes/${clienteId}`);
    await expect(clientePage.getByText('No tenés acceso a esta sección.')).toBeVisible();
    await expect(clientePage.getByText(clienteEmail)).toHaveCount(0);
    await clientePage.goto('/agenda-admin/clientes');
    await expect(clientePage.getByText('No tenés acceso a esta sección.')).toBeVisible();

    await registrar(page, adminEmail);
    sql(`update public.perfiles set es_administrador = true where id = (select id from auth.users where email = '${adminEmail}')`);
    await page.goto('/agenda-admin');
    await page.getByRole('link', { name: 'Listado de usuarios' }).focus();
    await page.keyboard.press('Enter');
    const lista = page.getByRole('region', { name: 'Lista de clientes' });
    const filaCliente = lista.getByRole('row').filter({ hasText: 'Cliente Historia Trece' });
    await expect(filaCliente).toBeVisible();
    await filaCliente.getByRole('link', { name: 'Ver citas del usuario' }).click();
    const datos = page.getByRole('region', { name: 'Datos del cliente' });
    for (const texto of ['Cliente Historia Trece', clienteEmail, '099111222', 'Mujer']) await expect(datos).toContainText(texto);
    const historial = page.getByRole('region', { name: 'Historial de citas' });
    await expect(historial.getByRole('listitem')).toHaveCount(6);
    for (const estado of ['pendiente', 'confirmada', 'propuesta', 'cancelada', 'rechazada']) await expect(historial.getByText(`Estado: ${estado}`).first()).toBeVisible();
    await expect(historial.getByText('15 de enero de 2020')).toBeVisible();
    await expect(historial.getByText(fechaFuturaTexto)).toBeVisible();
    await expect(historial.getByRole('listitem').filter({ hasText: fechaFuturaTexto })).toContainText('10:00');
    await expect(page.getByText(vacioEmail)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    sql(`insert into public.citas (cliente_id, inicio, servicio, estado)
      select '${clienteId}', '2021-01-01T12:00:00Z'::timestamptz + n * interval '1 minute', 'Espalda', 'cancelada' from generate_series(1, 501) n`);
    await page.reload();
    await expect(page.getByRole('region', { name: 'Historial de citas' }).getByRole('listitem')).toHaveCount(507);
    sql(`insert into auth.users (id, email, raw_user_meta_data)
      select gen_random_uuid(), 'story13-bulk-${sufijo}-' || n || '@example.test',
        jsonb_build_object('nombre', 'ZZ Cliente ' || lpad(n::text, 4, '0'), 'telefono', '099555555', 'sexo', 'Mujer')
      from generate_series(1, 501) n`);
    await page.getByRole('link', { name: 'Volver a clientes' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'ZZ Cliente 0501' })).toBeVisible();
    await page.getByRole('row').filter({ hasText: 'Cliente Sin Citas' }).getByRole('link', { name: 'Ver citas del usuario' }).click();
    await expect(page.getByText('Este cliente no tiene citas.')).toBeVisible();
  } finally {
    await contextoCliente.close();
    sql(`delete from public.citas where cliente_id in ('${clienteId}', '${vacioId}');
      delete from auth.users where id in ('${clienteId}', '${vacioId}') or email in ('${adminEmail}', '${usuarioEmail}')
        or email like 'story13-bulk-${sufijo}-%@example.test'`);
  }
});
