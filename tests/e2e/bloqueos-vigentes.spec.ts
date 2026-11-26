import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

test('la lista oculta bloqueos al finalizar y mantiene los vigentes', async ({ page }) => {
  const email = `bloqueos-vigentes-${crypto.randomUUID()}@example.test`;
  const ids = Array.from({ length: 4 }, () => crypto.randomUUID());
  let admin = '';
  const sql = (statement: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', statement], { encoding: 'utf8' });
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signUp({ email, password: 'ClaveSegura123', options: { data: { nombre: 'Admin Prueba', telefono: '099123456', sexo: 'Mujer' } } });
    expect(error).toBeNull();
    admin = data.user!.id;
    sql(`update public.perfiles set es_administrador=true where id='${admin}'; insert into private.bloqueos(id,fecha,hora_inicio,hora_fin) values ('${ids[0]}','2000-06-14',9,11),('${ids[1]}','2000-06-15',9,11),('${ids[2]}','2000-06-15',0,24),('${ids[3]}','2000-06-16',9,11)`);
    await page.goto('/');
    const ingreso = page.getByRole('form', { name: 'Iniciar sesión' });
    await ingreso.getByLabel('Email').fill(email);
    await ingreso.getByLabel('Contraseña').fill('ClaveSegura123');
    await ingreso.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Ver agenda' })).toBeVisible();
    await page.clock.install({ time: new Date('2000-06-15T13:59:30Z') });
    await page.goto('/agenda-admin?seccion=bloqueos');
    const boton = (fecha: string, inicio: string, fin: string) => page.getByRole('button', { name: `Eliminar bloqueo del ${fecha} de ${inicio} a ${fin}` });
    await expect(boton('2000-06-15', '09:00', '11:00')).toBeVisible();
    await expect(boton('2000-06-15', '00:00', '24:00')).toBeVisible();
    await expect(boton('2000-06-16', '09:00', '11:00')).toBeVisible();
    await expect(boton('2000-06-14', '09:00', '11:00')).toHaveCount(0);
    await page.clock.fastForward('00:31');
    await expect(boton('2000-06-15', '09:00', '11:00')).toHaveCount(0);
    await expect(boton('2000-06-15', '00:00', '24:00')).toBeVisible();
    expect(sql(`select count(*) from private.bloqueos where id in ('${ids[0]}','${ids[1]}')`).trim()).toBe('2');
  } finally {
    sql(`delete from private.bloqueos where id in (${ids.map(id => `'${id}'`).join(',')}); ${admin ? `update public.perfiles set es_administrador=false where id='${admin}'; delete from auth.users where id='${admin}';` : ''}`);
  }
});
