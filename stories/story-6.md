# Historia 6: Proponer otro horario

## Historia

Como administrador, quiero proponer otro horario para una solicitud pendiente, para ofrecer una alternativa al cliente.

## Criterios de aceptación

- [x] Dada una solicitud pendiente, cuando el administrador propone un horario disponible, entonces la solicitud pasa a tener el horario propuesto y ese horario queda ocupado.
- [x] Cuando se propone otro horario, entonces el horario original queda disponible.
- [x] Dada una solicitud que ya no está pendiente o un horario alternativo que dejó de estar disponible, cuando el administrador intenta proponerlo, entonces la solicitud no se modifica y se informa que no se pudo actualizar.
- [x] Dada una solicitud pendiente dentro de las 24 horas previas a su inicio, cuando el administrador intenta proponer otro horario, entonces se cancela según la regla de vencimiento existente.

## Plan

- Permitir iniciar una propuesta desde una solicitud pendiente en la agenda administrativa.
- Dejar que el administrador seleccione una fecha y un horario disponibles.
- Aplicar el cambio de horario y mostrar el resultado en la agenda.

## Fuera de alcance

- Enviar el email con la propuesta y permitir que el cliente la acepte o rechace; corresponde a la story 7.
- Permitir contrapropuestas del cliente.
- Cambiar las reglas generales de disponibilidad o cancelación.

## Sugerencias (tu decisión)

- La visión indica que una propuesta aceptada confirma la cita y una rechazada la cancela. Como la respuesta del cliente queda para la story 7, conviene mantener ese comportamiento documentado allí.
