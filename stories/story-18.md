# Historia 18: Emails de aceptación y propuesta de horario

## Historia

Como cliente, quiero recibir un email cuando el administrador acepte mi cita o proponga otro horario, para conocer la decisión y responder a una propuesta.

## Criterios de aceptación

- [ ] Dada una solicitud pendiente, cuando el administrador la acepta, el cliente recibe un email que le informa que su cita fue confirmada.
- [ ] Dada una solicitud pendiente, cuando el administrador propone otro horario, el cliente recibe un email con el nuevo horario y la indicación de entrar a la aplicación para aceptarlo o rechazarlo.
- [ ] Dada una aceptación o propuesta registrada, cuando falla el envío del email, la acción se conserva y no se reintenta el envío.

## Plan

- Preparar los mensajes de confirmación y propuesta.
- Enviarlos al cliente al registrar cada acción, sin reintentos si fallan.
- Verificar los destinatarios, el contenido y el comportamiento ante fallos.

## Fuera de alcance

- Responder la propuesta por email.
- Email de cancelación, cubierto por la historia 19.
