const escapar = valor => String(valor ?? '—').replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);

export function mensajeListaUsuarios(destinatario, usuarios) {
  const filas = usuarios.map(usuario => `<tr><td>${escapar(usuario.nombre)}</td><td>${escapar(usuario.email)}</td><td>${escapar(usuario.telefono)}</td><td>${escapar(usuario.sexo)}</td><td>${usuario.es_administrador ? 'Sí' : 'No'}</td></tr>`).join('');
  return { to: destinatario, subject: 'Lista de usuarios de LITO', html: `<h1>Lista de usuarios</h1><table border="1" cellpadding="6"><thead><tr><th>Nombre completo</th><th>Email</th><th>Teléfono</th><th>Sexo</th><th>Administrador</th></tr></thead><tbody>${filas}</tbody></table>` };
}
