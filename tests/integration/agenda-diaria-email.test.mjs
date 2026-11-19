import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeAgendaDiaria } from '../../app/agenda-diaria-email.mjs';

test('el correo presenta los horarios y escapa los datos de clientes', () => {
  const mensaje = mensajeAgendaDiaria({ destinatario: 'admin@example.test', fecha: '2026-11-19', filas: [
    { hora: 8, nombre: '<Ana & Luis>', servicio: 'Espalda', estado: 'confirmada' },
    { hora: 9, nombre: null, servicio: null, estado: 'libre' },
  ] });
  assert.equal(mensaje.to, 'admin@example.test');
  assert.match(mensaje.html, /08:00/);
  assert.match(mensaje.html, /&lt;Ana &amp; Luis&gt;/);
  assert.match(mensaje.html, /Espalda/);
  assert.match(mensaje.html, /confirmada/);
  assert.match(mensaje.html, /09:00/);
  assert.match(mensaje.html, /libre/);
});
