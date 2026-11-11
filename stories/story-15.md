# Historia 15: Gestionar citas futuras desde el historial

## Historia

Como administrador, quiero gestionar las citas futuras desde el historial de un cliente, para atender cambios y cancelaciones.

## Criterios de aceptación

- [ ] Dada una solicitud pendiente en el historial, cuando el administrador la rechaza o propone un horario disponible, entonces se aplica la acción correspondiente: al rechazarla se libera el horario; al proponer otro, se libera el original y la propuesta queda pendiente de respuesta del cliente.
- [ ] Dada una cita confirmada a la que le faltan más de 24 horas, cuando el administrador la cancela indicando el motivo, entonces la cita queda cancelada, el horario queda disponible y el cliente recibe por email el motivo; si faltan 24 horas o menos, no puede cancelarla.
- [ ] Dada una propuesta pendiente de respuesta del cliente, cuando el administrador consulta la cita en el historial, entonces no puede realizar acciones sobre ella; tampoco puede proponer otro horario para una cita confirmada.

## Plan

- Mostrar en el historial las acciones disponibles según el estado de cada cita.
- Permitir rechazar solicitudes pendientes o proponer otro horario, respetando las reglas existentes.
- Permitir cancelar citas confirmadas fuera del límite de 24 horas con un motivo obligatorio.
- Enviar por email al cliente el motivo de la cancelación y reflejar el resultado en el historial.
- Verificar los estados, los permisos administrativos y el límite de tiempo.

## Fuera de alcance

- Permitir al administrador actuar sobre propuestas pendientes de respuesta del cliente.
- Proponer otro horario para una cita confirmada.
- Cambiar las reglas de respuesta del cliente a una propuesta.
