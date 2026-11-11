# Historia 7: Responder una propuesta de horario

## Historia

Como cliente, quiero consultar una propuesta de horario y aceptarla o rechazarla, para resolver mi solicitud.

## Criterios de aceptación

- [x] Dada una propuesta vigente, cuando el cliente inicia sesión y la acepta o rechaza, entonces la cita queda confirmada o cancelada, respectivamente; al cancelarse, el horario queda disponible.
- [x] Dada una solicitud pendiente de aprobación del administrador o una propuesta pendiente de respuesta del cliente, cuando faltan 24 horas para el inicio de la cita, entonces se cancela automáticamente y el horario queda disponible.

## Plan

- Permitir que el cliente inicie sesión y responda a su propia propuesta vigente.
- Confirmar o cancelar la cita según la respuesta y reflejar su estado.
- Aplicar el vencimiento de 24 horas a las propuestas pendientes y mantenerlo para las solicitudes pendientes del administrador.
- Verificar las respuestas, el vencimiento, la disponibilidad y los permisos.

## Fuera de alcance

- Permitir contrapropuestas del cliente.
- Enviar emails, incluida la notificación de propuestas; corresponde a la historia 16.
- Cambiar la cancelación de citas confirmadas.
