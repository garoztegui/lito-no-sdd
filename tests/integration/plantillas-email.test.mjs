import { test } from 'node:test';
import assert from 'node:assert/strict';
import bienvenida from '../../app/emails/plantillas/bienvenida.mjs';
import solicitudCliente from '../../app/emails/plantillas/solicitud-cliente.mjs';
import solicitudAdmin from '../../app/emails/plantillas/solicitud-administrador.mjs';
import confirmacion from '../../app/emails/plantillas/confirmacion.mjs';
import propuesta from '../../app/emails/plantillas/propuesta.mjs';
import cancelacion from '../../app/emails/plantillas/cancelacion.mjs';
import { mensajeCita } from '../../app/notificaciones-citas.mjs';

test('cada email tiene una plantilla editable con asunto y texto', () => {
  for (const plantilla of [bienvenida, solicitudCliente, solicitudAdmin, confirmacion, propuesta, cancelacion]) {
    assert.equal(typeof plantilla.subject, 'string');
    assert.equal(typeof plantilla.text, 'string');
    assert.ok(plantilla.subject && plantilla.text);
  }
});

test('los datos variables se sustituyen literalmente sin interpretar su contenido', () => {
  const mensaje = mensajeCita('cancelacion', { inicio: '2027-01-14T13:00:00Z', servicio: 'Espalda', nombre: 'Ana', motivo: 'Costo $& {{servicio}}' });
  assert.match(mensaje.text, /Costo \$& \{\{servicio\}\}/);
  assert.match(mensaje.text, /10:00/);
});
