# Historia 13: Consultar clientes y su historial

## Historia

Como administrador, quiero consultar los datos de los clientes y su historial de citas, para gestionar sus reservas.

## Criterios de aceptación

- [x] Dado que soy administrador, cuando consulto un cliente, entonces veo su nombre completo, email, teléfono y sexo.
- [x] Dado que soy administrador, cuando consulto el historial de un cliente, entonces veo todas sus solicitudes y citas pasadas y futuras, cualquiera sea su estado, con servicio, fecha, hora y estado.
- [x] Dado que no soy administrador, cuando intento consultar los datos o el historial de otro cliente, entonces no puedo acceder a ellos.

## Plan

- Permitir al administrador consultar clientes y acceder a sus datos e historial.
- Mostrar todas sus solicitudes y citas con fecha y hora de Montevideo.
- Comprobar los permisos administrativos en el servidor y en la base de datos.
- Verificar la consulta y las restricciones de acceso.

## Fuera de alcance

- Gestionar citas futuras desde el historial; corresponde a la historia 15.
- Modificar los datos de clientes.
