# Historia 7: Responder una propuesta de horario

## Historia

Como cliente, quiero recibir por email una propuesta de horario y aceptarla o rechazarla, para resolver mi solicitud.

## Criterios de aceptación

- [ ] Dada una propuesta de horario, cuando el administrador la registra, entonces el cliente recibe un email con la propuesta.
- [ ] Dada una propuesta vigente, cuando el cliente inicia sesión y la acepta o rechaza, entonces la cita queda confirmada o cancelada, respectivamente; al cancelarse, el horario queda disponible.
- [ ] Dada una solicitud pendiente de aprobación del administrador o una propuesta pendiente de respuesta del cliente, cuando faltan 24 horas para el inicio de la cita, entonces se cancela automáticamente y el horario queda disponible.

## Plan

- Enviar al cliente un email cuando se registre una propuesta de horario.
- Permitir que el cliente inicie sesión y responda a su propia propuesta vigente.
- Confirmar o cancelar la cita según la respuesta y reflejar su estado.
- Aplicar el vencimiento de 24 horas a las propuestas pendientes y mantenerlo para las solicitudes pendientes del administrador.
- Verificar las respuestas, el vencimiento, la disponibilidad y los permisos.

## Fuera de alcance

- Permitir contrapropuestas del cliente.
- Agregar otras notificaciones.
- Cambiar la cancelación de citas confirmadas.
