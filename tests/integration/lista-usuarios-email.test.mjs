import test from 'node:test';
import assert from 'node:assert/strict';
import { mensajeListaUsuarios } from '../../app/lista-usuarios-email.mjs';

test('la tabla incluye los datos solicitados sin identificadores y escapa HTML', () => {
  const mensaje = mensajeListaUsuarios('admin@example.test', [
    { id: 'identificador-secreto', nombre: '<Ana>', email: 'ana@example.test', telefono: '123', sexo: 'Mujer', es_administrador: false },
    { id: 'otro-identificador', nombre: 'Luis', email: 'luis@example.test', telefono: '456', sexo: 'Hombre', es_administrador: true },
  ]);
  assert.equal(mensaje.to, 'admin@example.test');
  for (const valor of ['&lt;Ana&gt;', 'ana@example.test', '123', 'Mujer', 'Luis', 'Sí', 'No']) assert.ok(mensaje.html.includes(valor));
  assert.ok(!mensaje.html.includes('identificador-secreto'));
  assert.ok(!mensaje.html.includes('<Ana>'));
});
