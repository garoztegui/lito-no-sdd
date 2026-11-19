# Historia 27: Agenda diaria por email

## Historia

Como administrador, quiero recibir cada día a las 6:00, hora de Montevideo, un email con la agenda del día y poder activar o desactivar mi envío desde Configuración, para planificar mi jornada y conocer los huecos disponibles.

## Criterios de aceptación

- [ ] Dado que soy administrador, cuando abro Configuración, entonces veo «enviar agenda diaria por mail» activado por defecto y puedo cambiar mi preferencia individual.
- [ ] Dado que tengo el envío activado y hay horarios de atención habilitados, cuando llegan las 6:00, entonces recibo una tabla con hora, cliente, servicio y estado, que distingue citas confirmadas, pendientes, propuestas y horarios libres o bloqueados. Recibo el correo también si todos los horarios están reservados.
- [ ] Dado que desactivé el envío o no hay horarios de atención habilitados para ese día, cuando llegan las 6:00, entonces no recibo el correo.

## Plan

- Agregar y guardar la preferencia individual del administrador.
- Preparar la agenda diaria con los horarios y estados correspondientes.
- Programar el envío para las 6:00 de Montevideo, respetando la preferencia.
- Verificar el correo, los días sin atención y la configuración de cada administrador.

## Fuera de alcance

- Agregar las futuras preferencias de otras funcionalidades.
- Cambiar las reglas de disponibilidad o reservas.
