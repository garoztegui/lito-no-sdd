# Guía de interfaz — LITO Masajes

## Objetivo

Diseñar una aplicación web moderna, clara y cercana, enfocada en masajes
deportivos, recuperación muscular y bienestar.

La experiencia debe estar pensada principalmente para celulares: tanto los
clientes como los administradores deben poder completar sus tareas de forma
cómoda desde una pantalla pequeña.

Usar las imágenes de referencia aprobadas como guía visual. Adaptarlas a
las funcionalidades reales del proyecto sin inventar reglas de negocio,
estados, servicios o datos.

## Identidad visual

- Usar fondos blancos o tonos claros, con azul intenso como color principal
  para botones, selecciones, enlaces y detalles.
- Usar azul oscuro o un tono similar para títulos y texto, manteniendo un
  contraste accesible.
- Transmitir una sensación deportiva, moderna, profesional y amigable.
- Usar tipografía clara, con títulos destacados y textos fáciles de leer.
- Utilizar bordes suaves, tarjetas simples y una separación visual cómoda.
- Mantener una identidad coherente entre las pantallas de clientes y
  administradores.
- Dejar espacio para proponer mejoras visuales: las imágenes son una
  referencia de estilo, no una plantilla que deba copiarse al píxel.

Definir y reutilizar colores, tipografías, espacios y estilos mediante los
mecanismos existentes del proyecto. Evitar valores visuales duplicados
innecesariamente.

## Imágenes e iconos

- Usar, cuando aporten a la experiencia, imágenes relacionadas con masajes,
  deporte, recuperación y bienestar.
- Las imágenes no deben mostrar personas ni partes del cuerpo. Preferir
  elementos como rodillos de masaje, pelotas, toallas o aceites.
- Priorizar imágenes discretas que no dificulten la lectura ni ocupen
  demasiado espacio en el celular.
- Usar iconos claros y consistentes para acompañar acciones o información.
  Los controles con iconos deben tener nombres accesibles.
- Usar recursos propios, generados para el proyecto o con licencia adecuada.
  Optimizar su tamaño para no perjudicar la velocidad de carga.

## Navegación y uso móvil

- Diseñar primero para celulares y adaptar la interfaz a pantallas más grandes.
- Evitar el desplazamiento horizontal en los flujos principales.
- Mantener las acciones frecuentes fáciles de encontrar y usar con el pulgar.
- Usar botones y controles con tamaño y separación cómodos para interacción
  táctil.
- Mantener la navegación simple y coherente. Se pueden utilizar menús
  desplegables o un menú compacto cuando ayuden a organizar las opciones.
- Identificar claramente dónde está el usuario y cómo volver o continuar.
- No depender del hover para mostrar información o completar acciones.
- Organizar la información en secciones breves y fáciles de recorrer.

## Reservas y agenda

- Presentar el servicio, la fecha y el horario de forma clara.
- Usar calendarios y selectores comprensibles en pantallas pequeñas.
- Diferenciar visualmente las opciones disponibles, seleccionadas y no
  disponibles, sin depender únicamente del color.
- Mostrar un resumen entendible antes de confirmar una solicitud cuando
  el flujo lo requiera.
- Comunicar el estado real de la cita con texto claro, por ejemplo
  «Pendiente» o «Confirmada», según los estados existentes.
- Mostrar mensajes útiles si no hay horarios, si uno deja de estar disponible
  o si ocurre un error.
- Conservar las reglas reales de duración, disponibilidad, permisos y estados.
  Las fechas y horarios de las imágenes de referencia son ilustrativos.

## Pantallas de administración

- Priorizar que Lito pueda consultar y gestionar la agenda rápidamente.
- Presentar usuarios, citas, servicios y disponibilidad de forma ordenada,
  con búsqueda o filtros cuando sean útiles para la tarea.
- Hacer evidentes las acciones principales y pedir confirmación cuando una
  acción tenga consecuencias importantes.
- Adaptar tablas o listas complejas para que se puedan usar en celular.
- Mostrar únicamente acciones y datos que correspondan al rol del usuario.

## Accesibilidad

- Mantener como mínimo contraste WCAG AA en textos y componentes relevantes:
  4,5:1 para texto normal y 3:1 para texto grande y para los indicadores
  visuales necesarios de controles y estados.
- Usar etiquetas claras en campos, botones y enlaces.
- Permitir la navegación mediante teclado y mantener el foco visible.
- No comunicar información únicamente mediante color, iconos o imágenes.
- Mostrar errores cerca del campo correspondiente y explicar cómo resolverlos.
- Mantener la interfaz utilizable al ampliar el texto y respetar la preferencia
  del usuario de reducir movimiento.
- Usar HTML semántico y las funciones de accesibilidad de los componentes
  existentes.

## Forma de trabajo

- Antes de modificar una pantalla, revisar la guía visual, las referencias
  disponibles y los componentes relacionados del proyecto.
- Reutilizar componentes y estilos cuando tenga sentido; proponer mejoras
  cuando los existentes no se adapten al diseño aprobado.
- Para rediseños grandes, trabajar por pantallas o flujos acotados para que
  el responsable del proyecto pueda revisar el resultado.
- Cuando se solicite un prototipo, usar datos ficticios y dejar claro qué
  acciones todavía no funcionan.
- No modificar reglas de negocio, permisos o base de datos por una decisión
  visual, salvo que el cambio haya sido solicitado.
- Verificar los cambios visuales según su alcance: vista móvil, contraste,
  foco y estados afectados. Ampliar las pruebas cuando el comportamiento
  modificado lo requiera.
- Al terminar, explicar brevemente qué cambió y qué se verificó.