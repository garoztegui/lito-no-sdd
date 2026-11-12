import solicitudCliente from './emails/plantillas/solicitud-cliente.mjs';
import solicitudAdmin from './emails/plantillas/solicitud-administrador.mjs';
import confirmacion from './emails/plantillas/confirmacion.mjs';
import propuesta from './emails/plantillas/propuesta.mjs';
import cancelacion from './emails/plantillas/cancelacion.mjs';

const plantillas = { solicitud_cliente: solicitudCliente, solicitud_admin: solicitudAdmin, confirmacion, propuesta, cancelacion };
const formato = new Intl.DateTimeFormat('es-UY', {
  timeZone: 'America/Montevideo', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23',
});

/** @param {'solicitud_cliente'|'solicitud_admin'|'confirmacion'|'propuesta'|'cancelacion'} tipo
 * @param {{inicio: string, servicio: string, nombre: string, motivo: string}} evento */
export function mensajeCita(tipo, evento) {
  const fecha = formato.format(new Date(evento.inicio));
  const plantilla = plantillas[tipo];
  const valores = { fecha, servicio: evento.servicio, nombre: evento.nombre, motivo: evento.motivo };
  const reemplazar = (/** @type {string} */ texto) => texto.replace(/\{\{(fecha|servicio|nombre|motivo)\}\}/g, (_, clave) => valores[/** @type {keyof typeof valores} */ (clave)]);
  return { subject: reemplazar(plantilla.subject), text: reemplazar(plantilla.text) };
}

/** @param {string[]} ids
 * @param {(id: string) => Promise<{tipo: 'solicitud_cliente'|'solicitud_admin'|'confirmacion'|'propuesta'|'cancelacion', destinatario: string, inicio: string, servicio: string, nombre: string, motivo: string}>} obtener
 * @param {(message: {to: string, subject: string, text: string}) => Promise<unknown>} enviar */
export async function enviarEventosCita(ids, obtener, enviar) {
  return Promise.allSettled(ids.map(async id => {
    const evento = await obtener(id);
    return enviar({ to: evento.destinatario, ...mensajeCita(evento.tipo, evento) });
  }));
}
