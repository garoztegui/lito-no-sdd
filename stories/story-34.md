# Historia 34: Configurar plazos de reserva y cancelación

## Historia

Como administrador, quiero configurar los plazos de reserva y cancelación, para adaptar esas reglas a las necesidades de LITO y mantener informados a los usuarios.

## Criterios de aceptación

- [x] Dado que soy administrador, cuando abro Configuración, veo los plazos actuales y una explicación clara de qué incluye cada uno: el plazo de reserva también determina el vencimiento de solicitudes y propuestas pendientes.
- [x] Dado que modifico los plazos y presiono «GUARDAR», las reglas de reserva, vencimiento de solicitudes y propuestas, y cancelación se aplican con los nuevos valores.
- [x] Dado que cambio un plazo, todos los usuarios ven los valores actualizados en las alertas y mensajes de la aplicación. Por ejemplo, si cambio el plazo de reserva a 3 o 6 horas, los mensajes correspondientes muestran 3 o 6 horas.

## Plan

- Mostrar los plazos y su explicación en Configuración.
- Guardar los valores al presionar «GUARDAR».
- Aplicar los valores a las reglas correspondientes.
- Actualizar las alertas y mensajes para que reflejen la configuración vigente.

## Fuera de alcance

- Cambiar otros plazos que no pertenezcan a estas reglas.
