# Plantillas de email

Cada archivo `.mjs` contiene el asunto (`subject`) y el mensaje (`text`) de un email. Editá el texto entre los acentos graves (`\``); conservá esos delimitadores y el resto del archivo. No escribas acentos graves ni `${` dentro del texto.

Los marcadores son `{{fecha}}`, `{{servicio}}`, `{{nombre}}` y `{{motivo}}`; la aplicación los reemplaza por los datos de la cita. Conservá los que ya están en cada plantilla: `{{motivo}}` solo tiene valor para la cancelación. La plantilla de bienvenida no utiliza marcadores.

Para comprobar los mensajes después de editarlos, ejecutá:

```powershell
node --test tests/integration/plantillas-email.test.mjs tests/integration/bienvenida-envio.test.mjs tests/integration/notificaciones-citas.test.mjs
```

Para que un cambio aparezca en producción, debe incluirse en un nuevo despliegue.
