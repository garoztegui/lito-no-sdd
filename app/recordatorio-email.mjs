const escapar = valor => String(valor).replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);
const direccionPredeterminada = 'Isla de Gaspar 2445, Montevideo, Uruguay';
const fecha = new Intl.DateTimeFormat('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23' });

export function mensajeRecordatorio(cita, direccion = direccionPredeterminada) {
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
  const cuando = fecha.format(new Date(cita.inicio));
  const saludo = cita.nombre ? `Hola, ${cita.nombre}` : 'Hola';
  return {
    to: cita.destinatario,
    subject: 'Recordatorio de tu cita en LITO',
    text: `${saludo} 😊\nTe esperamos para tu cita de ${cita.servicio} el ${cuando}.\n📍 ${direccion}: ${mapa}\n¡Nos vemos pronto! 💆`,
    html: `<p>${escapar(saludo)} 😊</p><p>Te esperamos para tu cita de <strong>${escapar(cita.servicio)}</strong> el <strong>${escapar(cuando)}</strong>.</p><p>📍 <a href="${escapar(mapa)}">${escapar(direccion)}</a></p><p>¡Nos vemos pronto! 💆</p>`,
  };
}
