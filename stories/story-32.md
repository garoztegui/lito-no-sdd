# Historia 32: Cambiar la hora de la agenda diaria

## Historia

Como administrador, quiero cambiar desde Configuración la hora del email de agenda diaria, para recibirlo en el horario que prefiera.

## Criterios de aceptación

- [x] Dado que soy administrador, cuando abro «Configurar aplicación», veo la hora de envío de la agenda diaria en horario de Montevideo.
- [x] Dado que cambio la hora y presiono «GUARDAR», las próximas agendas se envían a la nueva hora.
- [x] Dado que el envío de agenda diaria está desactivado, no recibo el email aunque haya una hora configurada.

## Plan

- Agregar un selector de hora a «Configurar aplicación».
- Guardar la hora junto con la preferencia de envío.
- Usar la hora guardada para los próximos envíos.

## Fuera de alcance

- Cambiar el contenido de la agenda o las condiciones para enviarla.
