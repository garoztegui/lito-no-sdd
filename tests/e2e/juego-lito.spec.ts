import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

for (const administrador of [false, true]) {
  test(`${administrador ? 'Administrador' : 'Cliente'} puede jugar una partida de 15 segundos`, async ({ page }) => {
    const email = `juego-${crypto.randomUUID()}@example.test`;
    const sql = (consulta: string) => execFileSync('docker', ['exec', 'supabase_db_litov2', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', consulta]);
    try {
    await page.goto('/');
    await page.getByRole('link', { name: 'Crear cuenta.' }).click();
    const registro = page.getByRole('form', { name: 'Registro' });
    await registro.getByLabel('Nombre completo').fill('Jugador Prueba');
    await registro.getByLabel('Email').fill(email);
    await registro.getByLabel('Teléfono').fill('099123456');
    await registro.getByLabel('Contraseña').fill('ClaveSegura123');
    await registro.getByRole('button', { name: 'CREAR' }).click();
    await expect(registro).toBeHidden();
    if (administrador) {
      sql(`update public.perfiles set es_administrador=true where id=(select id from auth.users where email='${email}')`);
      await page.reload();
    }
    await page.getByRole('button', { name: 'Jugar a ser Lito' }).click();
    await expect(page.getByText('Tiempo: 15 s')).toBeVisible();
    await page.clock.install();
    await page.getByRole('button', { name: 'JUGAR', exact: true }).click();
    await page.getByRole('button', { name: 'Atrapar nudo' }).click();
    await expect(page.getByText('Puntos: 1')).toBeVisible();
    await page.clock.fastForward(15000);
    await expect(page.getByRole('status')).toHaveText('Hiciste 1 puntos');
    await expect(page.getByRole('button', { name: 'Atrapar nudo' })).toHaveCount(0);
    await page.getByLabel('Nombre de juego').fill('Jugador Prueba');
    await page.getByRole('button', { name: 'Guardar puntaje' }).click();
    await expect(page.getByText('Tu récord: 1 puntos')).toBeVisible();
    await page.getByRole('button', { name: 'JUGAR DE NUEVO' }).click();
    await page.clock.fastForward(15000);
    await expect(page.getByRole('status')).toHaveText('Hiciste 0 puntos');
    await expect(page.getByText('Tu récord: 1 puntos')).toBeVisible();
    await page.getByRole('button', { name: 'Ver ranking' }).click();
    await expect(page.getByRole('region', { name: 'Ranking' }).getByText('Jugador Prueba: 1 puntos')).toBeVisible();
    } finally {
      sql(`update public.perfiles set es_administrador=false where id=(select id from auth.users where email='${email}'); delete from auth.users where email='${email}'`);
    }
  });
}
