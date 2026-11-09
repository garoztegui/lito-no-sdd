# Historia 5: Aceptar o rechazar solicitudes

## Historia

Como administrador, quiero aceptar o rechazar solicitudes pendientes, para gestionar las citas.

## Criterios de aceptación

- [ ] Dado que existe una solicitud pendiente, cuando la acepto, entonces queda confirmada y el cliente tiene una cita confirmada.
- [ ] Dado que existe una solicitud pendiente, cuando la rechazo, entonces el cupo queda disponible y el cliente se queda sin cita.
- [ ] Dado que no soy administrador o la solicitud ya no está pendiente, cuando intento aceptarla o rechazarla, entonces no se modifica la cita ni se ocupa o libera el cupo.
- [ ] Dado que existe una solicitud pendiente, cuando faltan 24 horas para su inicio, entonces se cancela automáticamente y el cupo queda disponible.

## Plan

- Mostrar acciones para aceptar o rechazar solicitudes pendientes de la agenda.
- Reflejar al aceptar que la cita quedó confirmada.
- Reflejar al rechazar que el cliente se queda sin cita y que el horario vuelve a estar disponible.
- Impedir cambios de usuarios no administradores y sobre solicitudes que ya no están pendientes.
- Cancelar automáticamente las solicitudes pendientes al alcanzar las 24 horas previas al inicio y liberar el horario.
- Verificar los cambios de estado, la disponibilidad del cupo y los permisos.

## Fuera de alcance

- Proponer otro horario.
- Enviar emails o gestionar notificaciones.

## Sugerencias (tu decisión)

- Ninguna.
