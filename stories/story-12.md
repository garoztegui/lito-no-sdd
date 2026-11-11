# Historia 12: Bloquear o borrar un servicio

## Historia

Como administrador, quiero bloquear o borrar un servicio, para controlar las opciones disponibles y mantener actualizado el catálogo.

## Criterios de aceptación

- [ ] Dado un servicio, cuando el administrador lo bloquea, entonces deja de estar disponible para nuevas reservas y las citas existentes conservan su estado y servicio.
- [ ] Dado un servicio sin citas futuras pendientes, con propuesta o confirmadas, cuando el administrador lo borra, entonces deja de estar disponible y las citas pasadas conservan el nombre del servicio.
- [ ] Dado un servicio con alguna cita futura pendiente, con propuesta o confirmada, cuando el administrador intenta borrarlo, entonces no se borra, se informa que tiene citas futuras y se recomienda bloquearlo para impedir nuevas reservas.

## Plan

- Permitir al administrador bloquear servicios para impedir nuevas reservas sin modificar sus citas.
- Permitir borrar un servicio tras comprobar que no tenga citas futuras pendientes, con propuesta o confirmadas.
- Informar cuándo no puede borrarse y recomendar el bloqueo.
- Conservar el nombre del servicio en las citas pasadas y verificar los permisos.

## Fuera de alcance

- Crear o renombrar servicios; corresponde a la historia 11.
- Cancelar citas para borrar un servicio.
