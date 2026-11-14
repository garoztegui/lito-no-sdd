import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

test('guardar un horario semanal libre persiste y deja de ofrecerse a clientes', async ({ page, browser }) => {
  const email = `disponibilidad-real-${crypto.randomUUID()}@example.test`;
  const emailCliente = `disponibilidad-cliente-${crypto.randomUUID()}@example.test`;
  const sql = (consulta: string) => execFileSync('docker', ['exec', '-i', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: consulta, encoding: 'utf8' }).trim();
  const slot = sql(`select d || ',' || h from generate_series(1,7) d cross join generate_series(7,18) h
    where not exists (select 1 from private.disponibilidad_semanal s where s.dia=d and s.hora=h)
    and not exists (select 1 from public.citas c where c.inicio > now() and c.estado in ('pendiente','confirmada','propuesta')
      and extract(isodow from timezone('America/Montevideo',c.inicio))=d and extract(hour from timezone('America/Montevideo',c.inicio))=h)
    limit 1`);
  if (!/^\d,\d{1,2}$/.test(slot)) throw new Error('No hay horario aislado para la prueba');
  const [dia, hora] = slot.split(',').map(Number);
  const faltantes: { dia: number; hora: number }[] = JSON.parse(sql(`select coalesce(json_agg(json_build_object('dia',dia,'hora',hora)),'[]'::json) from (
    select distinct extract(isodow from timezone('America/Montevideo',c.inicio))::integer dia, extract(hour from timezone('America/Montevideo',c.inicio))::integer hora
    from public.citas c where c.inicio>now() and c.estado in ('pendiente','confirmada','propuesta')
      and not exists (select 1 from private.disponibilidad_semanal s where s.dia=extract(isodow from timezone('America/Montevideo',c.inicio)) and s.hora=extract(hour from timezone('America/Montevideo',c.inicio)))
  ) faltantes`));
  const nombre = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][dia - 1];
  const etiqueta = `${String(hora).padStart(2, '0')}:00`;
  let insertado = false;
  const agregados: { dia: number; hora: number }[] = [];
  try {
    for (const faltante of faltantes) {
      if (!Number.isInteger(faltante.dia) || !Number.isInteger(faltante.hora)) throw new Error('Horario inválido');
      if (sql(`insert into private.disponibilidad_semanal (dia,hora) values (${faltante.dia},${faltante.hora}) on conflict do nothing returning dia`)) agregados.push(faltante);
    }
    const resultado = sql(`insert into private.disponibilidad_semanal (dia,hora) values (${dia},${hora}) on conflict do nothing returning dia`);
    if (!resultado) throw new Error('El horario ya estaba disponible');
    insertado = true;
    await page.goto('/');
    await page.getByRole('link', { name: 'CREAR UNA' }).click();
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Administrador de prueba');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'CREAR' }).click();
    await expect(registro).toBeHidden();
    sql(`update public.perfiles set es_administrador=true where id=(select id from auth.users where email='${email}')`);
    await page.goto('/agenda-admin');
    const control = page.getByRole('group', { name: nombre }).getByLabel(etiqueta);
    await expect(control).toBeChecked();
    await control.uncheck();
    const respuesta = page.waitForResponse(response => response.url().includes('/rpc/guardar_disponibilidad_semanal'));
    await page.getByRole('button', { name: 'Guardar disponibilidad' }).click();
    const guardado = await respuesta;
    expect(guardado.status(), await guardado.text()).toBe(200);
    await expect(page.getByText('Disponibilidad guardada.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('group', { name: nombre }).getByLabel(etiqueta)).not.toBeChecked();
    expect(sql(`select count(*) from private.disponibilidad_semanal where dia=${dia} and hora=${hora}`)).toBe('0');
    const contextoCliente = await browser.newContext({ baseURL: 'http://localhost:3000' });
    try {
      const cliente = await contextoCliente.newPage();
      await cliente.goto('/');
      await cliente.getByRole('link', { name: 'CREAR UNA' }).click();
      const formulario = cliente.getByRole('form', { name: 'Registro' });
      await formulario.getByLabel('Nombre completo').fill('Cliente de prueba');
      await formulario.getByLabel('Email').fill(emailCliente);
      await formulario.getByLabel('Teléfono').fill('099123456');
      await formulario.getByLabel('Contraseña').fill('ClaveSegura123');
      await formulario.getByRole('button', { name: 'CREAR' }).click();
      await expect(formulario).toBeHidden();
      await cliente.reload();
      const fecha = new Date(Date.now() + 21 * 86400000);
      fecha.setUTCHours(12, 0, 0, 0);
      while ((fecha.getUTCDay() || 7) !== dia) fecha.setUTCDate(fecha.getUTCDate() + 1);
      await cliente.getByLabel('Fecha').fill(fecha.toISOString().slice(0, 10));
      await expect(cliente.getByText('Consultando horarios...')).toHaveCount(0);
      await expect(cliente.getByRole('button', { name: new RegExp(`^${etiqueta} (Disponible|Ocupado|Seleccionado)$`) })).toHaveCount(0);
    } finally {
      await contextoCliente.close();
    }
  } finally {
    if (insertado) sql(`delete from private.disponibilidad_semanal d where d.dia=${dia} and d.hora=${hora}
      and not exists (select 1 from public.citas c where c.inicio>now() and c.estado in ('pendiente','confirmada','propuesta')
        and extract(isodow from timezone('America/Montevideo',c.inicio))=d.dia and extract(hour from timezone('America/Montevideo',c.inicio))=d.hora)`);
    for (const agregado of agregados) sql(`delete from private.disponibilidad_semanal where dia=${agregado.dia} and hora=${agregado.hora}`);
    sql(`delete from auth.users where email='${email}'`);
    sql(`delete from auth.users where email='${emailCliente}'`);
  }
});
