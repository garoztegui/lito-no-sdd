# Configuración de administración: historias 31–34
Branch: feat/configuracion-historias-31-34 · Delivery: single-pr · Tests: node --test / Playwright

## Specs

- S1: «Como administrador, quiero activar o desactivar desde Configuración los emails de nuevas solicitudes, para decidir si recibo un aviso cada vez que alguien reserva.» Ver stories/story-31.md.
- S2: «Como administrador, quiero cambiar desde Configuración la hora del email de agenda diaria, para recibirlo en el horario que prefiera.» Ver stories/story-32.md.
- S3: «Como administrador, quiero editar desde Configuración los datos de contacto y pago de LITO, como el teléfono, la dirección y la cuenta bancaria, para mantener actualizada la información que consultan los clientes.» Ver stories/story-33.md.
- S4: «Como administrador, quiero configurar desde Configuración los plazos de reserva y cancelación, para adaptar esas reglas a las necesidades de LITO y mantener informados a los usuarios.» Ver stories/story-34.md.

## Tasks

- [x] T1 — S1–S2: preferencias individuales y programación; ruta delegada, unidad independiente; pruebas SQL y navegador aprobadas; commit pendiente.
- [x] T2 — S3: datos de contacto y pago; ruta delegada, superficies independientes; pruebas SQL y navegador aprobadas; commit pendiente.
- [x] T3 — S4: plazos, vencimiento y mensajes; ruta delegada, superficies independientes; pruebas SQL y concurrencia aprobadas; commit pendiente.
- [x] T4 — S1–S4: integración y verificaciones; ruta inline; migraciones conjuntas, TypeScript y navegador aprobados; commit pendiente.

## Log

- L1: «implementa las 4 historias de punt a punta, de la 31 a la 34. y avisme cualquier cosa.»
- Las cuatro historias están refinadas en stories; preservar cambios previos sin publicar de historia 28.
- La verificación independiente encontró una carrera entre reserva y cambio de plazo; los helpers usan VOLATILE y una prueba con dos conexiones confirmó que se aplica el nuevo plazo tras esperar el bloqueo.
- Se comprobó el contacto real con cuentas ficticias y correo simulado. Las pruebas con DDL compartido deben ejecutarse secuencialmente.
- Verificación final: 12 pruebas de integración aprobadas, dos pruebas de configuración en navegador aprobadas, contacto real en navegador aprobado, recordatorio con SMTP simulado aprobado y TypeScript aprobado. Producción no fue modificada.
- La validación del teléfono conserva el enlace de WhatsApp; el acceso directo a datos de contacto exige administrador o perfil completo.
