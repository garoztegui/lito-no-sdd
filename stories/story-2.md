# Historia 2: Solicitar una cita

## Historia

Como cliente, quiero solicitar una cita en un horario disponible, para reservar una sesión.

## Criterios de aceptación

- [x] Dado que inicié sesión, cuando consulto los turnos, entonces veo los horarios de lunes a viernes entre las 7:00 y las 19:00, con inicios cada 60 minutos, para citas que comiencen al menos 24 horas después del momento de la consulta y hasta tres meses a futuro. Los horarios ocupados se distinguen sin mostrar datos de otros clientes.
- [x] Dado que elijo uno de los servicios disponibles y un horario libre, cuando envío la solicitud, entonces recibo una confirmación y mi cita queda pendiente, ocupando ese horario durante 60 minutos.
- [x] Dado que un horario ya está ocupado o deja de estar disponible mientras lo solicito, cuando intento reservarlo, entonces se me informa que no se pudo completar la solicitud y no se crea una cita superpuesta.
- [x] Dada una cuenta administradora, cuando accede a la aplicación o intenta solicitar una cita, no puede reservar; la base de datos rechaza también las solicitudes directas.

Las horas se muestran en la zona de Montevideo. El último turno del día comienza a las 18:00 y termina a las 19:00.

## Plan

- Ofrecer los tres servicios iniciales y mostrar los turnos según la disponibilidad acordada.
- Permitir que un cliente autenticado seleccione servicio y horario y envíe su solicitud.
- Impedir que las cuentas administradoras soliciten citas, en la interfaz y en la base de datos.
- Guardar la solicitud como pendiente y proteger los datos de cada cliente.
- Impedir reservas superpuestas, incluso cuando dos personas soliciten el mismo horario al mismo tiempo.
- Verificar el flujo en celular y las reglas de disponibilidad, permisos y concurrencia.

## Fuera de alcance

- Consultar el listado de citas propias o la agenda del administrador.
- Aceptar, rechazar, cancelar o proponer cambios de horario.
- Configurar la disponibilidad semanal, bloquear horarios o administrar servicios.
- Enviar notificaciones por email.
