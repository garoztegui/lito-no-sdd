# Historia 19: Email de cancelación administrativa

## Historia

Como cliente, quiero recibir un email cuando el administrador cancele mi cita, para conocer la cancelación y su motivo.

## Criterios de aceptación

- [ ] Dada una cita confirmada, cuando el administrador la cancela, el cliente recibe un email que informa la cancelación y su motivo.
- [ ] Dada una cancelación registrada, cuando falla el envío del email, la cita permanece cancelada y no se reintenta el envío.

## Plan

- Preparar el mensaje de cancelación con el motivo indicado por el administrador.
- Enviarlo al cliente cuando se registre la cancelación, sin reintentos si falla.
- Verificar el destinatario, el contenido y el comportamiento ante fallos.

## Fuera de alcance

- Cambiar las reglas para cancelar citas.
- Notificar otras acciones sobre citas.
