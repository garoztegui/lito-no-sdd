# Visión de producto: LITO Reservas

LITO Reservas será una aplicación web para gestionar las citas de un masajista
que actualmente usa una libreta. Habrá una única agenda compartida para LITO,
con acceso para varios administradores. Debe ser cómoda de usar desde el celular.

## Acordado

### Clientes y solicitudes

- Los clientes pueden registrarse, iniciar sesión y solicitar citas.
- Una solicitud pendiente ocupa el horario. Otros clientes lo ven ocupado, sin
  conocer los datos de quien reservó.
- Los administradores pueden aceptar, rechazar o proponer otro horario.
- Al proponer otro horario se libera el original y se ocupa el propuesto. El
  cliente recibe un email y puede aceptar o rechazar, sin contrapropuestas. Si
  acepta, la cita queda confirmada; si rechaza, se cancela.
- Los clientes solo pueden acceder a sus propios datos y citas.

### Agenda y servicios

- Los administradores configuran una disponibilidad semanal habitual y pueden
  bloquear horarios o días específicos. Los bloqueos no pueden superponerse con
  citas que ya ocupan disponibilidad.
- Los servicios iniciales son masaje deportivo, cuerpo entero y espalda. Los
  administradores pueden administrar el catálogo.
- Inicialmente todas las sesiones duran 60 minutos y se permiten turnos
  consecutivos.
- Las fechas y horas se muestran en `America/Montevideo`.
- Deben impedirse las reservas superpuestas incluso ante solicitudes simultáneas,
  con garantías en la base de datos.

### Administración y acceso

- Los administradores pueden consultar clientes, los datos personales necesarios,
  el historial de citas y la agenda futura.
- Los permisos administrativos deben comprobarse tanto en el servidor como en la
  base de datos.

## Propuestas técnicas iniciales

Next.js, TypeScript, Supabase y Vercel son tecnologías propuestas. Su elección y
adecuación aún deben evaluarse; no son decisiones verificadas.

## Decisiones pendientes

- Cómo retirar un servicio del catálogo sin perjudicar el historial de citas.
- Qué datos personales son necesarios y cómo se administran los accesos de los
  administradores.
- Las reglas de cancelación, vencimientos y anticipación de reservas, si las hay.
- Las notificaciones adicionales al email de propuesta de horario, si las hay.
- Los detalles de implementación y la validación de las tecnologías propuestas.
