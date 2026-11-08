# aqui se describen las decisiones de UI
---
name: ui
description: Guía de diseño y accesibilidad para LITO Reservas. Usar al crear o modificar pantallas, componentes, formularios, estilos o flujos visuales de la aplicación.
---

# Diseño de interfaz de LITO Reservas

Aplicar estas pautas al diseñar, implementar o modificar la interfaz. Revisar
primero los componentes y estilos existentes para mantener la coherencia.

## Identidad visual

- Crear una interfaz moderna, clara y profesional, apropiada para un servicio
  de masajes y bienestar.
- Usar negro y tonos oscuros como base de los fondos.
- Usar amarillo como color principal para acciones, elementos destacados y
  detalles visuales.
- Usar blanco y tonos claros para textos y otros elementos que necesiten
  buena legibilidad sobre fondos oscuros.
- Mantener una paleta limitada y coherente. Evitar usar amarillo en todos
  los elementos: reservarlo para dar énfasis y orientar al usuario.
- Definir colores y estilos reutilizables mediante las herramientas que
  ofrezca el proyecto. Evitar repetir valores aislados en cada componente.
- Evitar introducir una biblioteca de componentes solo por preferencia:
  justificarla según las necesidades del proyecto.

## Accesibilidad

- Mantener un contraste suficiente entre texto, controles y sus fondos,
  siguiendo como mínimo WCAG AA: 4,5:1 para texto normal y 3:1 para texto
  grande y para límites o indicadores visuales necesarios de controles.
- Prestar especial atención al texto amarillo sobre blanco y al texto blanco
  sobre amarillo. Usar combinaciones comprobadas, como texto oscuro sobre
  botones amarillos cuando proporcionen contraste suficiente.
- No comunicar estados, errores o disponibilidad únicamente mediante color.
  Acompañarlos con texto, iconos u otras señales comprensibles.
- Usar elementos semánticos y etiquetas claras en formularios y controles.
- Permitir navegar y completar los flujos con teclado. Mantener el foco
  visible y en un orden lógico.
- Dar a los botones y enlaces nombres que indiquen su acción. Asegurar que
  los iconos interactivos tengan una etiqueta accesible.
- Mostrar errores cerca del campo correspondiente, explicar cómo corregirlos
  y conservar los datos ingresados cuando sea posible.
- Respetar la preferencia del sistema de reducir movimiento.

## Diseño adaptable

- Diseñar primero para celulares y adaptar la interfaz a tabletas y pantallas
  de escritorio.
- Evitar el desplazamiento horizontal en los flujos principales.
- Usar controles cómodos para interacción táctil, con suficiente tamaño y
  separación.
- Mantener textos legibles y contenido organizado en pantallas pequeñas,
  incluso cuando el usuario amplía el texto.
- No depender del hover para acceder a información o ejecutar acciones.

## Experiencia de uso

- Priorizar tareas claras y pocos pasos para reservar y administrar citas.
- Mantener navegación, botones, formularios y mensajes consistentes.
- Mostrar estados de carga, confirmaciones, listas vacías y errores cuando
  correspondan.
- Evitar animaciones, adornos y efectos que dificulten la lectura o ralenticen
  la tarea.
- Presentar fechas y horarios de forma clara y coherente con la zona horaria
  definida para la aplicación.

## Verificación

Para cada cambio visual:

1. Revisar la pantalla afectada en una vista móvil y, cuando corresponda,
   en escritorio.
2. Comprobar contraste de las combinaciones nuevas o modificadas.
3. Revisar etiquetas, foco visible y navegación por teclado en los controles
   afectados.
4. Comprobar los estados de carga, error y confirmación que cambien.
5. Ejecutar únicamente las verificaciones automáticas pertinentes al cambio
   y respetar los controles obligatorios del proyecto.

Informar qué se comprobó y cualquier problema de accesibilidad pendiente.
No afirmar que toda la aplicación cumple WCAG por haber revisado una pantalla.