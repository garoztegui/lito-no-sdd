# Historia 3: Consultar mis solicitudes y citas

## Historia

Como cliente, quiero consultar mis solicitudes y citas, para conocer su estado.

## Criterios de aceptación

- [x] Dado que inicié sesión y tengo solicitudes o citas, cuando consulto «Mis citas», entonces veo mis citas futuras y pasadas con su servicio, fecha, hora y estado, sin acceder a las de otros clientes.
- [x] Dado que inicié sesión y no tengo solicitudes ni citas, cuando consulto «Mis citas», entonces veo un mensaje que indica que todavía no tengo citas.
- [x] Dado que intento consultar mis citas, cuando no se pueden cargar, entonces veo un mensaje que informa del problema y puedo volver a intentarlo.

Las fechas y horas se muestran en la zona de Montevideo. Por ahora, el único estado que la aplicación crea es **pendiente**; los demás se incorporarán con las historias correspondientes.

## Plan

- Mostrar una sección «Mis citas» accesible desde la cuenta.
- Presentar las citas propias, futuras y pasadas, con los datos acordados.
- Mostrar estados de carga, lista vacía y error con reintento.
- Verificar el flujo en celular y escritorio y comprobar con pruebas reales que cada cliente solo acceda a sus propias citas.

## Fuera de alcance

- Aceptar, rechazar o cancelar citas.
- Proponer, aceptar o rechazar cambios de horario.
- Crear nuevos estados o consultar la agenda de otros clientes.
- Enviar notificaciones.
