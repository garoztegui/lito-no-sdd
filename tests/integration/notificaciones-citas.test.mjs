import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviarEventosCita, mensajeCita } from '../../app/notificaciones-citas.mjs';

const evento = { inicio: '2027-01-14T13:00:00Z', servicio: 'Espalda', nombre: 'Ana Ejemplo', motivo: 'Viaje' };

test('la solicitud informa al cliente y al administrador los datos correspondientes', () => {
  const cliente = mensajeCita('solicitud_cliente', evento);
  const admin = mensajeCita('solicitud_admin', evento);
  assert.match(cliente.text, /Espalda/);
  assert.match(cliente.text, /10:00/);
  assert.match(cliente.text, /pendiente/i);
  assert.match(admin.text, /Ana Ejemplo/);
  assert.match(admin.text, /Espalda/);
  assert.match(admin.text, /10:00/);
});

test('la aceptación y la propuesta comunican la decisión y cómo responder', () => {
  assert.match(mensajeCita('confirmacion', evento).text, /confirmada/i);
  const propuesta = mensajeCita('propuesta', evento);
  assert.match(propuesta.text, /10:00/);
  assert.match(propuesta.text, /aceptar.*rechazar/is);
  assert.match(propuesta.text, /aplicación/i);
});

test('la cancelación informa el motivo', () => {
  const cancelacion = mensajeCita('cancelacion', evento);
  assert.match(cancelacion.text, /cancelad/i);
  assert.match(cancelacion.text, /Viaje/);
});

test('un fallo no impide el envío independiente a los demás destinatarios', async () => {
  const intentos = [];
  const resultados = await enviarEventosCita(['uno', 'dos'], async id => ({ ...evento, tipo: 'solicitud_admin', destinatario: `${id}@example.test` }), async mensaje => {
    intentos.push(mensaje.to);
    if (mensaje.to.startsWith('uno')) throw new Error('SMTP no disponible');
  });
  assert.deepEqual(intentos.sort(), ['dos@example.test', 'uno@example.test']);
  assert.deepEqual(resultados.map(resultado => resultado.status), ['rejected', 'fulfilled']);
});
