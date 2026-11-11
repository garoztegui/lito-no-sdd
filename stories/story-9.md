# Historia 9: Configurar la disponibilidad semanal

## Historia

Como administrador, quiero configurar la disponibilidad semanal habitual, para definir cuándo se pueden solicitar citas.

## Criterios de aceptación

- [ ] Dada una configuración semanal sin citas afectadas, cuando el administrador la guarda, entonces los horarios ofrecidos para solicitar citas reflejan la nueva disponibilidad.
- [ ] Dada una reducción de disponibilidad que afecta citas y ninguna ocurre dentro de las próximas 24 horas, cuando el administrador intenta guardarla, entonces se le informa y se le pregunta si desea cancelar todas las citas afectadas; si acepta, se cancelan y se guarda el cambio, y si no acepta, no se modifican las citas ni la disponibilidad.
- [ ] Dada una reducción de disponibilidad que afecta alguna cita dentro de las próximas 24 horas, cuando el administrador intenta guardarla, entonces se le informa que no puede realizar el cambio y no se modifican las citas ni la disponibilidad.

## Plan

- Permitir al administrador consultar y configurar la disponibilidad semanal habitual.
- Identificar las citas afectadas antes de reducir la disponibilidad.
- Informar y solicitar confirmación para cancelar las citas afectadas cuando corresponda.
- Impedir el cambio si alguna cita afectada está dentro de las próximas 24 horas.
- Reflejar la disponibilidad guardada en los horarios ofrecidos y verificar los permisos.

## Fuera de alcance

- Bloquear días u horarios específicos; corresponde a la historia 10.
- Enviar notificaciones de cancelación.
