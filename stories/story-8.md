# Historia 8: Cancelar una cita

## Historia

Como cliente, quiero cancelar una cita respetando el límite de 24 horas, para liberar un horario que no voy a utilizar.

## Criterios de aceptación

- [ ] Dada una solicitud propia pendiente de aprobación o una cita propia confirmada con más de 24 horas de anticipación, cuando el cliente la cancela, entonces queda cancelada y el horario queda disponible.
- [ ] Dada una cita confirmada propia a la que le faltan 24 horas o menos para comenzar, cuando el cliente intenta cancelarla, entonces la cita permanece confirmada y se informa que ya no puede cancelarla.
- [ ] Dada una cita de otro cliente, cuando se intenta cancelar, entonces la cita no se modifica ni se libera el horario.

## Plan

- Permitir cancelar solicitudes pendientes y citas confirmadas desde las citas del cliente.
- Comprobar que la cita pertenece al cliente y que se encuentra fuera del límite de 24 horas.
- Mostrar el resultado y reflejar la disponibilidad del horario.
- Verificar los estados, el límite de tiempo y los permisos.

## Fuera de alcance

- Aceptar o rechazar propuestas de horario; corresponde a la historia 7.
- Cancelar citas desde la agenda del administrador.
- Enviar notificaciones de cancelación.
