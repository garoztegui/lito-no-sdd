# Visión de producto: LITO Reservas

LITO Reservas será una aplicación web para gestionar las citas de un masajista
que actualmente usa una libreta. Habrá una única agenda compartida para LITO,
con acceso para un único administrador. Debe ser cómoda de usar desde el celular.

## Acordado

### Clientes y solicitudes

- Los clientes pueden registrarse, iniciar sesión y solicitar citas.
- Las cuentas administradoras no pueden solicitar ni reservar citas.
- Para crear una cuenta se solicitan nombre completo, email, teléfono, sexo y
  contraseña.
- Las opciones de sexo son hombre, mujer y prefiero no especificar.
- Una solicitud pendiente ocupa el horario. Otros clientes lo ven ocupado, sin
  conocer los datos de quien reservó.
- Una solicitud pendiente de aprobación del administrador o una propuesta de
  horario pendiente de respuesta del cliente se cancela automáticamente al
  alcanzar las 24 horas previas a su inicio y libera el horario.
- Los administradores pueden aceptar, rechazar o proponer otro horario.
- Al proponer otro horario se libera el original y se ocupa el propuesto. El
  cliente recibe un email y, tras iniciar sesión, puede aceptar o rechazar la
  propuesta antes de su vencimiento, sin contrapropuestas. Si acepta, la cita
  queda confirmada; si rechaza, se cancela.
- Los clientes solo pueden acceder a sus propios datos y citas.
- Una cita no puede cancelarse dentro de las 24 horas anteriores a su inicio.
- El administrador puede cancelar una cita confirmada antes de ese plazo
  indicando el motivo, que se envía por email al cliente. No puede proponer
  otro horario para una cita confirmada.
- Mientras una propuesta de horario espera la respuesta del cliente, el
  administrador no puede realizar acciones sobre esa cita.

### Agenda y servicios

- Los administradores configuran una disponibilidad semanal habitual y pueden
  bloquear horarios o días específicos. Si una reducción de disponibilidad o un
  bloqueo afecta citas, se informa al administrador y se le pregunta si desea
  cancelar todas las citas afectadas para realizar el cambio. Si alguna está
  dentro de las próximas 24 horas, se informa que no se puede realizar la
  operación y no se modifica la disponibilidad ni se cancelan citas.
- Los bloqueos corresponden a fechas y horarios específicos, independientes de
  la disponibilidad semanal. El administrador puede verlos y eliminar los que
  aún no hayan pasado.
- Los servicios iniciales son masaje deportivo, cuerpo entero y espalda. Los
  administradores pueden administrar el catálogo.
- Los servicios tienen un nombre único. El administrador puede crearlos y
  cambiar su nombre; al renombrar uno se actualiza el nombre en sus citas futuras.
- Un administrador puede bloquear un servicio para impedir nuevas reservas sin
  modificar las citas existentes. También puede borrarlo si no tiene citas
  futuras pendientes, con propuesta o confirmadas; si las tiene, se le informa
  y se le recomienda bloquearlo. Las citas pasadas conservan el nombre del
  servicio borrado.
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
- El historial de cada cliente incluye todas sus solicitudes y citas, pasadas y
  futuras, cualquiera sea su estado. Desde allí el administrador puede gestionar
  citas futuras según las reglas correspondientes a cada estado.
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
