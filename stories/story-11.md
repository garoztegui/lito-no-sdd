# Historia 11: Administrar el catálogo de servicios

## Historia

Como administrador, quiero administrar el catálogo de servicios, para mantener actualizadas las opciones disponibles.

## Criterios de aceptación

- [ ] Dado un nombre que no pertenece a otro servicio, cuando el administrador crea un servicio con ese nombre, entonces queda disponible para nuevas solicitudes y sus sesiones duran 60 minutos.
- [ ] Dado un servicio existente y un nombre que no pertenece a otro servicio, cuando el administrador cambia su nombre, entonces se actualiza el catálogo y el nombre en todas las citas futuras de ese servicio.
- [ ] Dado un nombre que ya pertenece a otro servicio, cuando el administrador intenta crear o renombrar un servicio con ese nombre, entonces no se guarda el cambio y se informa que el nombre ya existe.

## Plan

- Permitir al administrador consultar, crear y renombrar servicios.
- Impedir nombres repetidos y mantener la duración fija de 60 minutos.
- Actualizar las citas futuras del servicio al cambiar su nombre.
- Mostrar los servicios disponibles al solicitar una cita y verificar los permisos.

## Fuera de alcance

- Retirar servicios del catálogo; corresponde a la historia 12.
- Cambiar la duración de las sesiones.
