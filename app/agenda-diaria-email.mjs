const escapar = valor => String(valor).replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);

export function mensajeAgendaDiaria(agenda) {
  const filas = agenda.filas.map(fila => `<tr><td>${String(fila.hora).padStart(2, '0')}:00</td><td>${escapar(fila.nombre ?? '—')}</td><td>${escapar(fila.servicio ?? '—')}</td><td>${escapar(fila.estado)}</td></tr>`).join('');
  return { to: agenda.destinatario, subject: `Agenda diaria - ${agenda.fecha}`, html: `<h1>Agenda del ${escapar(agenda.fecha)}</h1><table border="1" cellpadding="6"><thead><tr><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>` };
}
