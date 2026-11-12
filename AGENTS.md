# Instrucciones del proyecto

## Contexto y decisiones

LITO Reservas es una aplicación web para gestionar las citas de un masajista,
con una agenda compartida para clientes y un único administrador. Debe ser
cómoda de usar desde el celular. El stack acordado es Next.js, TypeScript,
Supabase y Vercel. La aplicación requiere conexión, usa español y no maneja
monedas.

Los proyectos de producción son `lito-reservas` en Vercel y
`lito-reservas-v2` en Supabase.

El administrador se configura manualmente mediante su bandera en la base de
datos; por ahora no hay gestión de accesos administrativos. Para registrarse se
solicitan nombre completo, email, teléfono, sexo y contraseña. Un servicio no
puede retirarse si tiene reservas futuras. Una cita no puede cancelarse dentro
de las 24 horas anteriores, salvo que el cliente rechace una propuesta de
horario, lo que cancela la cita incluso dentro de ese plazo. Consultar
`docs/vision.md` para el detalle de las reglas y las decisiones pendientes.

## Backlog inicial

1. Como cliente, quiero registrarme e iniciar sesión, para acceder a mi cuenta.
2. Como cliente, quiero solicitar una cita en un horario disponible, para reservar una sesión. Requiere: #1.
3. Como cliente, quiero consultar mis solicitudes y citas, para conocer su estado. Requiere: #2.
4. Como administrador, quiero consultar la agenda futura, para conocer las citas solicitadas y confirmadas. Requiere: #2.
5. Como administrador, quiero aceptar o rechazar solicitudes, para gestionar las citas pendientes. Requiere: #2.
6. Como administrador, quiero proponer otro horario, para ofrecer una alternativa al cliente. Requiere: #2.
7. Como cliente, quiero recibir por email una propuesta de horario y aceptarla o rechazarla, para resolver mi solicitud. Requiere: #6.
8. Como cliente, quiero cancelar una cita respetando el límite de 24 horas, para liberar un horario que no voy a utilizar. Requiere: #2.
9. Como administrador, quiero configurar la disponibilidad semanal habitual, para definir cuándo se pueden solicitar citas.
10. Como administrador, quiero bloquear horarios o días específicos, para impedir nuevas solicitudes en esos períodos.
11. Como administrador, quiero administrar el catálogo de servicios, para mantener actualizadas las opciones disponibles.
12. Como administrador, quiero retirar un servicio cuando no tenga reservas futuras, para mantener actualizado el catálogo.
13. Como administrador, quiero consultar los datos de los clientes y su historial de citas, para gestionar sus reservas.

## Alcance y colaboración

- Trabajar sobre una funcionalidad o cambio acotado por vez.
- Respetar el alcance pedido: explicar o planificar no autoriza implementar;
  completar un paso autorizado no autoriza avanzar a funcionalidades posteriores.
- Resolver decisiones rutinarias dentro del alcance. Preguntar si una ambigüedad
  afecta reglas de negocio, seguridad, datos o alcance.
- Consultar las secciones pertinentes de `docs/vision.md` cuando el cambio afecte
  al negocio y de `docs/ui.md` cuando afecte a la interfaz.
- Buscar y leer solo el código relacionado; evitar cargar todo el repositorio o
  repetir documentos y explicaciones sin necesidad.
- Reutilizar patrones y componentes existentes. Evitar dependencias, abstracciones
  y documentos innecesarios.
- No usar flujos SDD ni Spec Kit salvo pedido explícito del usuario.

## Implementación y verificación

- Elegir verificaciones según el cambio: revisión dirigida para texto o estilos;
  pruebas focalizadas para lógica y flujos; pruebas de integración reales para
  permisos, restricciones y concurrencia cuando estén afectados.
- Respetar los controles obligatorios existentes y señalar contradicciones antes
  de omitirlos. No ejecutar por defecto toda la matriz de Playwright, levantar
  Supabase ni hacer builds completos en cada modificación.
- Reutilizar entornos adecuados. Investigar fallos antes de repetir comandos y no
  repetir pruebas exitosas sin un cambio que invalide su resultado.
- Registrar comandos reales de desarrollo y pruebas cuando existan; no inventarlos.
- Versionar migraciones y configuración no secreta. No guardar credenciales ni
  usar datos reales de clientes en pruebas.
- No modificar producción, publicar ni realizar operaciones destructivas sin
  autorización.
- Cerrar cada tarea con una explicación breve de qué cambió, cómo se verificó y
  qué quedó pendiente.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
