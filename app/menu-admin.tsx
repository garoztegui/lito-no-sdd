export default function MenuAdmin() {
  return <nav className="menu-admin" aria-label="Opciones de administración">
    <a href="/agenda-admin?seccion=agenda">Ver agenda</a>
    <a href="/agenda-admin/clientes">Listado de usuarios</a>
    <a href="/agenda-admin?seccion=disponibilidad">Modificar horarios disponibles</a>
    <a href="/agenda-admin?seccion=bloqueos">Bloquear horarios</a>
    <a href="/agenda-admin?seccion=servicios">Administrar servicios</a>
  </nav>;
}
