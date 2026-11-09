# Visión de producto: LITO Reservas

LITO Reservas será una aplicación web para gestionar las citas de un masajista
que actualmente usa una libreta. Habrá una única agenda compartida para LITO,
con acceso para un único administrador. Debe ser cómoda de usar desde el celular.

## Acordado

### Clientes y solicitudes

- Los clientes pueden registrarse, iniciar sesión y solicitar citas.
- Para crear una cuenta se solicitan nombre completo, email, teléfono, sexo y
  contraseña.
- Las opciones de sexo son hombre, mujer y prefiero no especificar.
- Una solicitud pendiente ocupa el horario. Otros clientes lo ven ocupado, sin
  conocer los datos de quien reservó.
- Una solicitud que siga pendiente se cancela automáticamente al alcanzar las
  24 horas previas a su inicio y libera el horario.
- Los administradores pueden aceptar, rechazar o proponer otro horario.
- Al proponer otro horario se libera el original y se ocupa el propuesto. El
  cliente recibe un email y puede aceptar o rechazar, sin contrapropuestas. Si
  acepta, la cita queda confirmada; si rechaza, se cancela.
- Los clientes solo pueden acceder a sus propios datos y citas.
- Una cita no puede cancelarse dentro de las 24 horas anteriores a su inicio.
  Como excepción, el cliente puede rechazar una propuesta de horario incluso
  dentro de ese plazo; al hacerlo, la cita se cancela.

### Agenda y servicios

- Los administradores configuran una disponibilidad semanal habitual y pueden
  bloquear horarios o días específicos. Los bloqueos no pueden superponerse con
  citas que ya ocupan disponibilidad.
- Los servicios iniciales son masaje deportivo, cuerpo entero y espalda. Los
  administradores pueden administrar el catálogo.
- Un servicio no puede retirarse del catálogo si tiene reservas futuras.
- Inicialmente todas las sesiones duran 60 minutos y se permiten turnos
  consecutivos.
- Mientras no se configure la disponibilidad, se ofrecen turnos de lunes a
  viernes de 7:00 a 19:00, con inicios cada 60 minutos.
- Se pueden solicitar turnos con al menos 24 horas de anticipación y hasta tres
  meses a futuro.
- Las fechas y horas se muestran en `America/Montevideo`.
- Deben impedirse las reservas superpuestas incluso ante solicitudes simultáneas,
  con garantías en la base de datos.

### Administración y acceso

- Los administradores pueden consultar clientes, los datos personales necesarios,
  el historial de citas y la agenda futura.
- Habrá un único administrador. Por ahora no habrá gestión de accesos
  administrativos: su bandera de administrador se configurará manualmente en
  la base de datos.
- Los permisos administrativos deben comprobarse tanto en el servidor como en la
  base de datos.

## Propuestas técnicas iniciales

Next.js, TypeScript, Supabase y Vercel son tecnologías propuestas. Su elección y
adecuación aún deben evaluarse; no son decisiones verificadas.

## Decisiones pendientes

- Las notificaciones adicionales al email de propuesta de horario, si las hay.
- Los detalles de implementación y la validación de las tecnologías propuestas.
