import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarRecordatorios } from '../../app/recordatorios-envio.mjs';

test('omite citas canceladas, registra los envíos y libera los fallos para reintento', async () => {
  const enviados = [];
  const estados = [];
  const resultado = await procesarRecordatorios(['confirmada', 'cancelada', 'fallo'],
    async id => id === 'cancelada' ? null : { id },
    async cita => { if (cita.id === 'fallo') throw new Error('SMTP'); enviados.push(cita.id); },
    async (id, enviado) => estados.push([id, enviado]), () => {});
  assert.deepEqual(enviados, ['confirmada']);
  assert.deepEqual(estados.sort(), [['cancelada', false], ['confirmada', true], ['fallo', false]]);
  assert.deepEqual(resultado, { procesados: 3, enviados: 1, errores: 1 });
});
