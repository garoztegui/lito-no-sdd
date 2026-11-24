# Historia 36: Enviar lista de usuarios por email

## Historia

Como administrador, quiero pulsar «Enviarme lista de usuarios por mail» en la sección de usuarios, para recibir en el correo de mi cuenta una tabla con sus datos.

## Criterios de aceptación

- [ ] Dado que soy administrador, cuando consulto la sección de usuarios, veo el botón «Enviarme lista de usuarios por mail».
- [ ] Dado que pulso el botón, recibo en el correo de mi cuenta una tabla de usuarios con nombre completo, email, teléfono, sexo y si cada uno es administrador. La tabla no incluye identificadores.
- [ ] Dado que solicito el envío, veo una confirmación si se envió o un mensaje de error si no se pudo enviar.

## Plan

- Agregar el botón en la sección de usuarios.
- Obtener los datos actualizados y comprobar que quien solicita el envío sea administrador.
- Preparar y enviar la tabla al correo de la cuenta administradora.
- Mostrar el resultado y verificar el envío y las restricciones de acceso.

## Fuera de alcance

- Incluir identificadores u otros datos técnicos.
- Enviar la lista a una dirección elegida manualmente.
- Programar envíos automáticos.
