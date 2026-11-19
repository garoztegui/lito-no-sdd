# Historia 29: Eliminar cuenta de cliente

## Historia

Como cliente, quiero eliminar mi cuenta y todas mis citas futuras, para dejar de usar LITO y liberar esos horarios.

## Criterios de aceptación

- [x] Dado que elijo eliminar mi cuenta, cuando aparece el modal de advertencia, entonces puedo cancelar la acción o confirmar que quiero eliminarla.
- [x] Dado que confirmo la eliminación, entonces se eliminan mis datos personales y todas mis citas futuras, incluidas solicitudes pendientes, propuestas y citas confirmadas, y ya no puedo iniciar sesión en LITO con esa cuenta.
- [x] Dado que tengo citas pasadas, cuando mi cuenta se elimina, entonces esas citas se conservan para los reportes y el nombre asociado se muestra como «USUARIO ELIMINADO».
- Al anonimizar las citas pasadas se elimina el motivo de cancelación, que puede contener datos personales; se conservan la fecha, el servicio y el estado.

## Plan

- Presentar una advertencia clara y pedir confirmación antes de eliminar la cuenta.
- Eliminar los datos personales y las citas futuras del cliente.
- Conservar las citas pasadas para reportes, reemplazando la identidad visible por «USUARIO ELIMINADO».
- Verificar que la cuenta eliminada ya no permita iniciar sesión en LITO.

## Fuera de alcance

- Eliminar o modificar la cuenta de Google del cliente.
- Borrar las citas pasadas de los reportes.
- Anonimizar los registros de auditoría de Supabase.
