export default function MenuAdmin({ onJugar }: { onJugar?: () => void }) {
  return <nav className="menu-admin" aria-label="Opciones de administración">
    <a href="/agenda-admin/reservar">Reservar una cita</a>
    <a href="/agenda-admin?seccion=agenda">Ver agenda</a>
    <a href="/agenda-admin/clientes">Listado de usuarios</a>
    <a href="/agenda-admin?seccion=disponibilidad">Modificar horarios disponibles</a>
    <a href="/agenda-admin?seccion=bloqueos">Bloquear horarios</a>
    <a href="/agenda-admin?seccion=servicios">Administrar servicios</a>
    {onJugar ? <button type="button" onClick={onJugar}>Jugar a ser Lito</button> : <a href="/?juego=1">Jugar a ser Lito</a>}
  </nav>;
}
