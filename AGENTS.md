# Instrucciones del proyecto

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
