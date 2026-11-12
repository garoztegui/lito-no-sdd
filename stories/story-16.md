# Historia 16: Email de bienvenida

## Historia

Como cliente, quiero recibir un email de bienvenida al crear mi cuenta, para saber que mi registro se completó.

## Criterios de aceptación

- [ ] Dado que un cliente crea su cuenta, cuando el registro se completa, recibe un email de bienvenida en la dirección registrada.
- [ ] Dado el email de bienvenida, cuando el cliente lo lee, encuentra un mensaje formal, divertido y con emojis.
- [ ] Dado que falla el envío del email, cuando la cuenta ya fue creada, la cuenta permanece activa y no se reintenta el envío.

## Plan

- Preparar el mensaje con el tono acordado.
- Enviar el email al completar el registro, sin reintentos si falla.
- Verificar el contenido, el destinatario y el comportamiento ante fallos.

## Configuración del envío

- Activar la verificación en dos pasos de la cuenta de Gmail y crear una contraseña de aplicación.
- Configurar `GMAIL_USER` con la dirección remitente y `GMAIL_APP_PASSWORD` con la contraseña de aplicación como variables privadas del servidor. En Vercel, configurarlas para el entorno correspondiente y volver a desplegar.
- Aplicar la migración de la historia 16 antes de habilitar el envío. Nunca guardar la contraseña en el repositorio.
- Un fallo de configuración o envío consume el único intento; no se reenvía automáticamente.

## Fuera de alcance

- Comprobar que la dirección ingresada pertenece al cliente o que existe.
- Enviar emails relacionados con citas.
