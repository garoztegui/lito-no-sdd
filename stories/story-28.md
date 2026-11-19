# Historia 28: Recordatorio de cita por WhatsApp

**Estado: BLOQUEADA.** Implementación pospuesta; queda pendiente definir y configurar el servicio de WhatsApp Business.

## Historia

Como cliente, quiero recibir por WhatsApp un recordatorio amigable con emojis, la hora, el servicio y la dirección enlazada a Google Maps tres horas antes de mi cita confirmada, para recordar cuándo y dónde asistir.

## Criterios de aceptación

- [ ] Dada una cita confirmada, cuando faltan tres horas para su inicio, el cliente recibe un WhatsApp con la hora, el servicio, la dirección de LITO como enlace a Google Maps y un mensaje amigable con emojis.
- [ ] Dada una cita que fue cancelada antes del recordatorio, cuando llega el momento de enviarlo, el cliente no recibe el mensaje.

## Plan

- Enviar el recordatorio a la hora prevista para cada cita confirmada.
- Incluir la hora, el servicio y un enlace a la ubicación de LITO en Google Maps.
- Evitar el envío si la cita ya no está confirmada.

## Fuera de alcance

- Recordatorios por otros canales.
- Elegir el texto del mensaje o configurar el envío desde la aplicación.
