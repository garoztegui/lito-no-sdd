# Historia 17: Emails de solicitud de cita

## Historia

Como cliente y administrador, queremos recibir un email al solicitar una cita, para conocer sus datos y su estado pendiente.

## Criterios de aceptación

- [ ] Dada una cita solicitada, cuando se registra, el cliente recibe un email con el día, la hora, el servicio y el estado pendiente.
- [ ] Dada una cita solicitada, cuando se registra, cada usuario cuya bandera de administrador es verdadera recibe un email con el nombre del cliente, el día, la hora y el servicio.
- [ ] Dada una solicitud registrada, cuando falla el envío de alguno de los emails, la solicitud permanece pendiente y no se reintenta el email que falló.

## Plan

- Preparar los mensajes para el cliente y cada usuario administrador.
- Enviarlos cuando se registre la solicitud, sin reintentos si fallan.
- Verificar los destinatarios, los datos de cada mensaje y el comportamiento ante fallos.

## Configuración del envío

- Configurar `GMAIL_USER` y `GMAIL_APP_PASSWORD` para Gmail, y `SUPABASE_SECRET_KEY` con la clave secreta de Supabase, solo en el servidor. No usar el prefijo `NEXT_PUBLIC_` ni guardar claves en el repositorio.
- Aplicar las migraciones de destinatarios y eventos antes de habilitar el envío.

## Fuera de alcance

- Emails de aceptación, propuesta y cancelación, cubiertos por las historias 18 y 19.
