# Historia 14: Cerrar sesión

## Historia

Como cliente, quiero cerrar sesión, para salir de mi cuenta en el dispositivo que estoy usando.

## Criterios de aceptación

- [x] Dado que inicié sesión, cuando elijo cerrar sesión, entonces salgo de mi cuenta y vuelvo a ver el inicio de sesión y el enlace para crear una cuenta.
- [x] Dado que cerré sesión, cuando recargo la página, entonces mi cuenta y la opción de solicitar citas permanecen inaccesibles hasta que vuelva a ingresar.
- [x] Dado que intento cerrar sesión, cuando no se puede completar la operación, entonces recibo un mensaje que me informa del problema.

## Plan

- Mostrar la acción de cerrar sesión junto a los datos de la cuenta.
- Cerrar la sesión actual y actualizar la pantalla.
- Informar si ocurre un error y permitir volver a intentarlo.
- Verificar el cierre, la recarga y el acceso posterior con pruebas focalizadas.

## Fuera de alcance

- Cerrar sesiones en otros dispositivos.
- Recuperar o cambiar la contraseña.
- Eliminar la cuenta.
