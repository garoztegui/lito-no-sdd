# Visión de producto: LITO masajes & fisioterapia

LITO masajes & fisioterapia contará con una aplicación web para gestionar sus citas,
que actualmente se registran en una libreta. Habrá una única agenda compartida para LITO,
con acceso para un único administrador. Debe ser cómoda de usar desde el celular.

## Acordado

### Clientes y solicitudes

- Los clientes pueden registrarse, iniciar sesión y solicitar citas.
- Las cuentas administradoras no pueden reservar citas para sí mismas. Pueden
  reservar citas confirmadas para usuarios registrados o personas sin cuenta,
  en turnos futuros disponibles y sin la anticipación mínima de clientes. Para
  una persona sin cuenta solo es obligatorio el nombre; apellido, email y
  teléfono son opcionales. Si se proporciona un email, se envía una confirmación;
  un fallo de envío no anula la cita.
- Para crear una cuenta se solicitan nombre completo, email, teléfono, sexo y
  contraseña.
- Las opciones de sexo son hombre, mujer y prefiero no especificar.
- Una solicitud pendiente ocupa el horario. Otros clientes lo ven ocupado, sin
  conocer los datos de quien reservó.
- Una solicitud pendiente de aprobación del administrador o una propuesta de
  horario pendiente de respuesta del cliente se cancela automáticamente al
  alcanzar el plazo de reserva configurado y libera el horario. El valor inicial es de 4 horas.
- Los administradores pueden aceptar, rechazar o proponer otro horario.
- Al proponer otro horario se libera el original y se ocupa el propuesto. El
  cliente recibe un email y, tras iniciar sesión, puede aceptar o rechazar la
  propuesta antes de su vencimiento, sin contrapropuestas. Si acepta, la cita
  queda confirmada; si rechaza, se cancela.
- Los clientes solo pueden acceder a sus propios datos y citas.
- Los clientes pueden eliminar su cuenta tras confirmar una advertencia. Se eliminan sus datos personales y todas sus citas futuras; las citas pasadas se conservan con el nombre «USUARIO ELIMINADO» para reportes, sin el motivo de cancelación, que podría contener datos personales.
- El cliente no puede cancelar una cita cuando falta el plazo de cancelación configurado o menos, salvo al rechazar una propuesta de horario. El valor inicial es de 12 horas.
- El administrador puede cancelar una cita confirmada hasta una hora antes de su inicio
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
  la disponibilidad semanal. El administrador ve los que aún no terminaron y
  puede eliminarlos; los bloqueos terminados dejan de aparecer en la lista.
- Los días 1.º de enero, 1.º de mayo, 18 de julio, 25 de agosto y 25 de diciembre se bloquean automáticamente cada año para reservas. El administrador ve una nota informativa y no puede quitar esos bloqueos.
- Los servicios iniciales son masaje deportivo, cuerpo entero y espalda. Los
  administradores pueden administrar el catálogo.
- Los servicios tienen un nombre único. El administrador puede crearlos y
  cambiar su nombre; al renombrar uno se actualiza el nombre en sus citas futuras.
- Un administrador puede bloquear un servicio para impedir nuevas reservas y
  desbloquearlo para volver a ofrecerlo, sin modificar las citas existentes.
  También puede borrarlo si no tiene citas
  futuras pendientes, con propuesta o confirmadas; si las tiene, se le informa
  y se le recomienda bloquearlo. Las citas pasadas conservan el nombre del
  servicio borrado.
- Inicialmente todas las sesiones duran 60 minutos y se permiten turnos
  consecutivos.
- Mientras no se configure la disponibilidad, se ofrecen turnos de lunes a
  viernes de 7:00 a 19:00, con inicios cada 60 minutos.
- Se pueden solicitar turnos con la anticipación configurada por el administrador, inicialmente 4 horas, y hasta tres meses a futuro.
- Las fechas y horas se muestran en `America/Montevideo`.
- Deben impedirse las reservas superpuestas incluso ante solicitudes simultáneas,
  con garantías en la base de datos.

### Administración y acceso

- Los administradores pueden consultar clientes, los datos personales necesarios,
  el historial de citas y la agenda. En el calendario, las citas confirmadas cuya
  sesión terminó se muestran como «Completada», sin acciones.
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
