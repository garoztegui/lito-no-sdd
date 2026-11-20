import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeRecordatorio } from '../../app/recordatorio-email.mjs';

test('el recordatorio incluye hora local, servicio y dirección enlazada', () => {
  const mensaje = mensajeRecordatorio({ destinatario: 'cliente@example.test', nombre: '<Ana>', servicio: 'Espalda & cuello', inicio: '2027-02-10T13:00:00Z' });
  assert.equal(mensaje.to, 'cliente@example.test');
  assert.match(mensaje.html, /10:00/);
  assert.match(mensaje.html, /Espalda &amp; cuello/);
  assert.match(mensaje.html, /&lt;Ana&gt;/);
  assert.match(mensaje.html, /Isla de Gaspar 2445/);
  assert.match(mensaje.html, /https:\/\/www\.google\.com\/maps/);
  assert.match(mensaje.text, /10:00/);
});

test('el recordatorio usa y escapa la dirección configurada en texto y mapa', () => {
  const mensaje = mensajeRecordatorio({ destinatario: 'cliente@example.test', nombre: 'Ana', servicio: 'Masaje', inicio: '2027-02-10T13:00:00Z' }, 'Calle Ficticia 123 & Sur');
  assert.match(mensaje.text, /Calle Ficticia 123 & Sur/);
  assert.match(mensaje.html, /Calle Ficticia 123 &amp; Sur/);
  assert.match(mensaje.html, /Calle%20Ficticia%20123%20%26%20Sur/);
});
