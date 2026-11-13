# Historia 20: Menú y configuración del cliente

## Historia

Como cliente, quiero navegar entre mis citas, las reservas y la configuración de mi cuenta, para gestionar mis datos y encontrar mis citas.

## Criterios de aceptación

- [x] Dado que ingresé como cliente, cuando consulto el menú, entonces puedo acceder a Mis citas, Reservar cita y Configuración.
- [x] Dado que consulto mis citas, cuando elijo un estado, entonces veo únicamente las citas con ese estado; también puedo volver a ver todas.
- [x] Dado que abro Configuración, cuando modifico mi nombre, teléfono, sexo o contraseña, entonces puedo guardar los cambios; el email se muestra sin opción de edición en la interfaz.

## Plan

- Separar las opciones del cliente en un menú y conservar la acción de cerrar sesión.
- Filtrar las citas según el estado mostrado.
- Permitir la edición del perfil propio y el cambio de contraseña, manteniendo el email fijo en la interfaz.
- Verificar el menú, los filtros, el cambio de contraseña y los permisos de edición del perfil.

## Verificación

- La prueba de interfaz verificó navegación, filtro, edición y acceso con la contraseña nueva; la prueba de integración comprobó que no se pueda modificar otro perfil ni la bandera de administrador.
- La restricción de cambio de email a nivel de Supabase Auth no se verificó; el campo no es editable en la aplicación.
