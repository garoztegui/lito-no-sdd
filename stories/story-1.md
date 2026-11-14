# Historia 1: Registro e inicio de sesión

## Historia

Como cliente, quiero registrarme e iniciar sesión, para acceder a mi cuenta.

## Criterios de aceptación

- [ ] Dado que soy un cliente nuevo, cuando elijo «CREAR UNA» en la pantalla de inicio de sesión, entonces se abre un modal para ingresar mi nombre completo, email, teléfono, sexo y contraseña.
- [ ] Dado que completo el registro, el nombre completo, el email, el teléfono y la contraseña se indican como obligatorios; si falta el email o la contraseña, no se envía el formulario y se solicita completar el campo.
- [ ] Dado que completo el registro y elijo «CREAR», entonces se crea mi cuenta sin confirmación por email y quedo con la sesión iniciada.
- [ ] Dado que abro el registro, cuando elijo «Cancelar», entonces se cierra el modal y vuelvo al inicio de sesión.
- [ ] Dado que tengo una cuenta, cuando ingreso con mi email y contraseña, entonces accedo a mi cuenta.
- [ ] Dado que intento registrarme o iniciar sesión, cuando los datos no son válidos, entonces recibo un mensaje que indica que no se pudo completar la operación.

## Plan

- Preparar el inicio de sesión y el modal de registro para que sean cómodos desde el celular.
- Permitir la creación de la cuenta con los datos acordados y el ingreso con email y contraseña.
- Proteger los datos de cada cliente para que solo pueda acceder a los propios.
- Verificar el registro, el inicio de sesión y el acceso a los datos con pruebas focalizadas, incluidas pruebas reales de permisos.

## Fuera de alcance

- Solicitar y consultar citas.
- Recuperar la contraseña y editar los datos de la cuenta.
- Administrar accesos de administradores.
