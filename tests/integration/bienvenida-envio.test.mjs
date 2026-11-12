import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviarBienvenida } from '../../app/bienvenida.mjs';

test('envía al usuario autenticado una sola vez con el mensaje de bienvenida', async () => {
  let claimed = false;
  const mensajes = [];
  const supabase = { auth: { getUser: async () => ({ data: { user: { email: 'cliente@example.test' } }, error: null }) },
    rpc: async () => ({ data: !claimed && (claimed = true), error: null }) };
  const send = async message => mensajes.push(message);
  await enviarBienvenida(supabase, send);
  await enviarBienvenida(supabase, send);
  assert.equal(mensajes.length, 1);
  assert.equal(mensajes[0].to, 'cliente@example.test');
  assert.match(mensajes[0].subject, /bienvenid/i);
  assert.match(mensajes[0].text, /😊|🎉|✨/u);
});

test('si el envío falla no se reintenta ni se propaga el error', async () => {
  let claimed = false;
  let intentos = 0;
  const supabase = { auth: { getUser: async () => ({ data: { user: { email: 'cliente@example.test' } }, error: null }) },
    rpc: async () => ({ data: !claimed && (claimed = true), error: null }) };
  const send = async () => { intentos++; throw new Error('falló SMTP'); };
  await enviarBienvenida(supabase, send);
  await enviarBienvenida(supabase, send);
  assert.equal(intentos, 1);
});

test('no envía si no hay usuario autenticado', async () => {
  const supabase = { auth: { getUser: async () => ({ data: { user: null }, error: null }) }, rpc: async () => { throw new Error('no debe llamar RPC'); } };
  await enviarBienvenida(supabase, async () => { throw new Error('no debe enviar'); });
});
