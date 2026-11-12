# Historia 10: Bloquear días u horarios específicos

## Historia

Como administrador, quiero bloquear horarios o días específicos, para impedir nuevas solicitudes en esos períodos.

## Criterios de aceptación

- [x] Dado un día u horario específico sin citas afectadas, cuando el administrador lo bloquea, entonces no se ofrecen nuevas solicitudes para ese período; puede consultar el bloqueo en una lista y eliminarlo mientras no haya pasado.
- [x] Dado un bloqueo que afecta citas y ninguna ocurre dentro de las próximas 24 horas, cuando el administrador intenta guardarlo, entonces se le informa y se le pregunta si desea cancelar todas las citas afectadas; si acepta, se cancelan y se guarda el bloqueo, y si no acepta, no se modifican las citas ni se crea el bloqueo.
- [x] Dado un bloqueo que afecta alguna cita dentro de las próximas 24 horas, cuando el administrador intenta guardarlo, entonces se le informa que no puede realizarlo y no se modifican las citas ni se crea el bloqueo.

## Plan

- Permitir al administrador bloquear fechas y horarios específicos y consultar sus bloqueos.
- Identificar las citas afectadas y solicitar confirmación para cancelarlas cuando corresponda.
- Impedir el bloqueo si alguna cita afectada está dentro de las próximas 24 horas.
- Permitir eliminar bloqueos que aún no hayan pasado y reflejar la disponibilidad resultante.
- Verificar los bloqueos, sus efectos sobre las citas y los permisos.

## Fuera de alcance

- Configurar la disponibilidad semanal habitual; corresponde a la historia 9.
- Enviar notificaciones de cancelación.
