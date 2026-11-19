# Historia 30: Bloquear automáticamente los feriados no laborables

## Historia

Como cliente, quiero que los cinco feriados no laborables de Uruguay estén bloqueados automáticamente todos los años, para no poder reservar citas en esos días.

## Criterios de aceptación

- [x] Dado que consulto horarios para el 1.º de enero, 1.º de mayo, 18 de julio, 25 de agosto o 25 de diciembre, entonces no puedo reservar una cita ese día.
- [x] Dado que soy administrador y consulto la configuración de bloqueos, entonces veo una nota que indica que esos cinco feriados se bloquean automáticamente para reservas: 1.º de enero, 1.º de mayo, 18 de julio, 25 de agosto y 25 de diciembre.

## Plan

- Bloquear automáticamente cada año las cinco fechas indicadas.
- Mostrar la nota informativa en la configuración de bloqueos.

## Fuera de alcance

- Bloquear otros feriados o fechas especiales.
- Permitir que el administrador gestione esos bloqueos.
