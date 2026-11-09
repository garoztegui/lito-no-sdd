# Historia 4: Consultar la agenda futura

## Historia

Como administrador, quiero consultar la agenda futura, para conocer las citas solicitadas y confirmadas.

## Criterios de aceptación

- [x] Dado que soy administrador, cuando consulto la agenda, entonces veo las citas futuras solicitadas y confirmadas con fecha, hora de Montevideo, servicio, estado y los datos del cliente: nombre completo, email, teléfono y sexo.
- [x] Dado que no hay citas futuras solicitadas ni confirmadas, cuando consulto la agenda, entonces veo un mensaje que indica que no hay citas.
- [x] Dado que no soy administrador, cuando intento consultar la agenda administrativa, entonces no puedo acceder a las citas ni a los datos de otros clientes.

## Plan

- Permitir la consulta de la agenda únicamente al administrador, comprobando sus permisos en el servidor y en la base de datos.
- Obtener las citas futuras solicitadas y confirmadas con los datos de cada cliente.
- Mostrar la agenda y sus estados de carga, error y lista vacía, adaptados al celular.
- Verificar la consulta y los permisos con pruebas.

## Fuera de alcance

- Aceptar o rechazar solicitudes y proponer otros horarios.
- Consultar el historial de citas o administrar los datos de clientes.
