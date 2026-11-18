# Historia 21: Crear una cuenta e iniciar sesión con Google

## Historia

Como cliente, quiero crear una cuenta e iniciar sesión con Google, para acceder sin usar una contraseña de LITO.

## Criterios de aceptación

- [ ] Dado que no tengo una cuenta en LITO, cuando ingreso con Google, entonces se crea mi cuenta y se me solicita completar los datos obligatorios que falten.
- [ ] Dado que mi cuenta creada con Google tiene datos obligatorios pendientes, cuando ingreso desde cualquier dispositivo, entonces veo un modal para completarlos y no puedo continuar usando la aplicación hasta hacerlo.
- [ ] Dado que completé mis datos obligatorios, cuando vuelvo a ingresar con Google, entonces accedo a mi cuenta sin que se me vuelvan a pedir.

## Plan

- Configurar el ingreso con Google como alternativa al acceso actual.
- Solicitar nombre, teléfono y sexo cuando falten, conservando el email de Google.
- Guardar el estado del perfil y exigir que esté completo antes de permitir el uso de la aplicación.
- Verificar el registro y los ingresos posteriores, incluso desde otro dispositivo.
- Comprobar que el acceso actual con email y contraseña siga funcionando.

## Fuera de alcance

- Crear una contraseña para cuentas de Google: historia 22.
- Asociar o desasociar Google desde Configuración: historia 23.
