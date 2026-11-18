# Historia 23: Asociar o desasociar Google

## Historia

Como cliente, quiero asociar o desasociar mi cuenta de Google desde la configuración, para gestionar cómo ingreso a mi cuenta.

## Criterios de aceptación

- [ ] Dado que tengo una cuenta en LITO sin Google asociado, cuando asocio mi cuenta de Google desde Configuración, entonces puedo ingresar a la misma cuenta usando Google.
- [ ] Dado que tengo Google asociado y una contraseña creada, cuando desasocio Google desde Configuración, entonces puedo seguir ingresando con mi email y contraseña.
- [ ] Dado que Google es mi único medio de acceso, cuando intento desasociarlo, entonces veo un modal que me indica que primero debo crear una contraseña y Google permanece asociado.

## Plan

- Mostrar en Configuración si Google está asociado y la acción disponible.
- Permitir asociar o desasociar Google desde la cuenta del cliente.
- Impedir la desasociación cuando no exista una contraseña y explicar el motivo en un modal.
- Verificar que la cuenta y sus citas se conserven, y que los medios de acceso funcionen según corresponda.

## Fuera de alcance

- Crear una contraseña: historia 22.
- Asociar otros proveedores de acceso.
