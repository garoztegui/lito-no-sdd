# LITO masajes & fisioterapia

Aplicación web para gestionar solicitudes y citas de masajes y fisioterapia. Los clientes pueden registrarse, ingresar y gestionar sus citas; el administrador gestiona la agenda, la disponibilidad, los servicios y los clientes. La interfaz está pensada para celulares y usa la zona horaria `America/Montevideo`.

## Tecnologías y requisitos

- Git, Node.js **20.9 o superior** y npm. El repositorio fija las versiones de las dependencias en `package-lock.json`.
- Next.js 16, React 19 y TypeScript.
- Supabase: PostgreSQL 17, Auth, políticas de acceso y funciones SQL. La CLI de Supabase es una dependencia del proyecto.
- Docker Desktop, con el motor iniciado, para Supabase local y las pruebas de integración.
- Playwright y Chromium para las pruebas de navegador.
- Para servicios externos: cuentas con acceso a Supabase, Vercel y Google Cloud, y una cuenta Gmail para enviar correos.

## Inicio rápido: desarrollo desde cero

Estos pasos usan una base **local**, separada de producción. Los comandos se ejecutan desde la raíz del repositorio.

1. Cloná el repositorio y entrá a su directorio.
2. Instalá las dependencias y el navegador de pruebas:

   ```bash
   npm ci
   npx playwright install chromium
   ```

3. Iniciá Docker Desktop y, cuando su motor esté listo, levantá Supabase:

   ```bash
   npm run db:start
   npm run db:status
   ```

   El arranque aplica las migraciones locales. La API usa `http://127.0.0.1:57521`, PostgreSQL el puerto `57522`, Studio `http://127.0.0.1:57523` y Mailpit `http://127.0.0.1:57524`. Estos puertos están en [`supabase/config.toml`](supabase/config.toml).

   **Semilla:** la configuración referencia `supabase/seed.sql`, pero ese archivo no existe actualmente. Si la CLI informa que falta, revisá esa referencia antes de continuar; no presupongas que existen datos de ejemplo. Los servicios y la disponibilidad inicial se definen en migraciones.

4. Creá `.env.local` a partir de `.env.example` y completá, como mínimo, la URL y la clave publicable **del Supabase local** que muestra `npm run db:status`. Para no enviar correos reales durante el desarrollo, dejá sin configurar las variables de Gmail hasta necesitarlas.
5. Iniciá la aplicación:

   ```bash
   npm run dev
   ```

   Abrí [http://localhost:3000](http://localhost:3000). Registrá una cuenta de prueba con datos ficticios. El ingreso con Google local requiere la configuración adicional explicada más abajo.

No uses credenciales ni datos reales de clientes para pruebas. `.env.local` está excluido de Git. No ejecutes `supabase db reset` sobre una base que quieras conservar: elimina y recrea sus datos locales.

## Variables de entorno

| Variable | Uso | Dónde obtenerla |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de la API de Supabase para cliente y servidor. | Estado local de Supabase o panel del proyecto correspondiente. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable para acceder con las políticas del usuario. | Estado local o sección de claves API del proyecto. |
| `SUPABASE_SECRET_KEY` | Clave de servidor para obtener datos necesarios para los emails de citas. | Claves API del proyecto Supabase correspondiente. |
| `GMAIL_USER` | Dirección Gmail remitente de los correos de la aplicación. | Cuenta Gmail configurada para LITO. |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de Gmail utilizada por Nodemailer. | Cuenta de Google del remitente. |
| `CRON_SECRET` | Secreto de servidor que protege el envío programado de la agenda diaria. | Generar un valor aleatorio y configurarlo en Vercel. |

Las dos variables `NEXT_PUBLIC_` se envían al navegador; las otras son **solo de servidor**. Nunca pongas la clave secreta de Supabase ni contraseñas en variables públicas, código o commits. `.env.example` es una plantilla: reemplazá sus valores de ejemplo por los de tu entorno. Podés desarrollar sin configurar Gmail, pero los correos de la aplicación no se enviarán.

## Supabase y base de datos

### Entorno local

Las migraciones versionadas están en [`supabase/migrations`](supabase/migrations). Definen tablas, políticas RLS, funciones, disponibilidad, servicios y restricciones. La configuración local de Auth permite el registro por email y tiene desactivada la confirmación de correo; esto **no demuestra** que producción tenga la misma configuración.

El administrador se identifica mediante `perfiles.es_administrador`, configurado manualmente en la base. Para un entorno nuevo, registrá primero la cuenta correspondiente y actualizá esa bandera mediante un acceso administrativo autorizado a **esa base**, comprobando el usuario y el entorno antes de hacerlo. No uses una clave privilegiada desde el navegador.

La migración `20261109221308_gestionar_solicitudes_y_vencimiento.sql` configura con `pg_cron` la tarea `cancelar-solicitudes-pendientes-vencidas`, que se ejecuta cada minuto. Al reconstruir un proyecto, verificá que la extensión y la tarea existan: no se trata de un cron de Vercel.

La agenda diaria utiliza Supabase Cron para llamar al endpoint cada minuto; cada administrador recibe el correo a partir de su hora configurada en Montevideo, por defecto las 06:00, con reintentos si falla. Antes de activarlo, aplicar las migraciones y configurar `CRON_SECRET`, `SUPABASE_SECRET_KEY`, `GMAIL_USER` y `GMAIL_APP_PASSWORD` como variables de servidor. En Supabase Vault, crear `agenda_diaria_url` con la URL completa del endpoint `/api/agenda-diaria` y `agenda_diaria_cron_secret` con el mismo valor de `CRON_SECRET`. Sin ambos secretos no se realiza la llamada. Se registra el resultado por administrador y día; si se interrumpe el proceso después de que Gmail acepte el correo pero antes de registrar el éxito, un reintento podría duplicarlo.

El recordatorio de citas utiliza los mismos secretos de Vault y Vercel: Supabase Cron consulta cada minuto y llama al endpoint `/api/recordatorios`, derivado de `agenda_diaria_url`. Se envía a partir de tres horas antes de cada cita confirmada; si la tarea o el correo fallan, se reintenta mientras la cita siga confirmada y no haya comenzado. La ejecución puede retrasarse por la programación o por fallos del servicio. Como ocurre con otros envíos SMTP, una interrupción después de que Gmail acepte el mensaje y antes de registrar el resultado puede producir un duplicado.

### Proyecto alojado

El proyecto de producción existente se llama `lito-reservas-v2`. Si se crea uno nuevo, obtené su URL y claves, aplicá las migraciones en orden con la CLI o el mecanismo de migraciones de Supabase y verificá sus políticas, funciones y tarea programada. Las migraciones no incluyen las credenciales de Gmail, las de Google OAuth ni las variables de Vercel: se configuran aparte.

Para trabajar con un proyecto alojado, consultá `npx supabase --help` y la [guía de migraciones de Supabase](https://supabase.com/docs/guides/deployment/database-migrations). La CLI incluida es v3 y distingue explícitamente operaciones locales y alojadas. Antes de aplicar cambios a producción, comprobá proyecto, migraciones pendientes y respaldo; no uses una base de producción para pruebas.

## Correos de la aplicación

Los correos de bienvenida y de eventos de citas los envía la aplicación con **Nodemailer y Gmail**. Esta configuración es independiente de Google OAuth y del SMTP de Supabase Auth.

1. Elegí la cuenta Gmail remitente y activá la verificación en dos pasos si es necesario.
2. Creá una [contraseña de aplicación de Google](https://support.google.com/accounts/answer/185833) para el envío. Google puede no ofrecer esta opción para algunas cuentas.
3. Configurá `GMAIL_USER` con la dirección remitente y `GMAIL_APP_PASSWORD` con esa contraseña en el entorno que enviará correos. Para notificaciones de citas también necesitás `SUPABASE_SECRET_KEY` del mismo proyecto Supabase.
4. En Vercel configurá las variables como variables de entorno de servidor. Probá el envío con cuentas y datos de prueba, y revisá los logs del servidor si falla. El remitente se presenta como `LITO masajes & fisioterapia`.

El correo de bienvenida y las notificaciones de citas registran sus intentos: **no hay reintento automático** después de un fallo. No pruebes repetidamente con datos reales. Mailpit captura correos de Auth del Supabase local; no intercepta los mensajes enviados directamente por Nodemailer a Gmail. Si se habilitan confirmaciones o recuperación de contraseña de Supabase Auth en otro entorno, su envío SMTP se configura por separado en Auth.

## Ingreso con Google

El acceso con Google usa OAuth a través de Supabase. En el primer ingreso LITO toma el email y, si Google lo proporciona, el nombre; solicita en un modal los campos obligatorios faltantes. Las credenciales OAuth **no son** la contraseña de aplicación de Gmail.

### Google Cloud

1. En [Google Auth Platform](https://console.cloud.google.com/auth/clients), elegí o creá un proyecto y configurá la información y la audiencia de la aplicación. Para clientes con cuentas personales, usá audiencia externa y revisá el estado de publicación y los usuarios de prueba que exija Google.
2. Configurá los permisos de identidad necesarios (`openid`, email y perfil), según la [guía de Supabase para Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google). No se necesitan permisos de Gmail para iniciar sesión.
3. Creá un cliente OAuth de tipo **aplicación web**. Para el proyecto actual, configurá:
   - Origen de JavaScript autorizado: `https://lito-reservas.vercel.app`.
   - URI de redirección autorizada: `https://xywibioktysudyxohbdu.supabase.co/auth/v1/callback`.
4. Guardá el Client ID y el Client Secret de forma segura. Si creás otro proyecto Supabase, usá **su** Callback URL; la URL anterior corresponde solamente al proyecto actual.

### Supabase Auth

1. En Authentication → Sign In / Providers → Google, habilitá el proveedor y cargá el Client ID y el Client Secret del cliente web. Conservá desactivadas las opciones para omitir la comprobación de nonce y para permitir usuarios sin email.
2. En Authentication → URL Configuration, configurá para la instalación actual:
   - **Site URL:** `https://lito-reservas.vercel.app`.
   - **Redirect URL permitida:** `https://lito-reservas.vercel.app/auth/callback`.
3. Guardá y probá un ingreso nuevo y uno posterior. Si el email de Google coincide con el de una cuenta existente, Supabase puede vincular automáticamente ambas identidades; consultá su [documentación sobre vinculación](https://supabase.com/docs/guides/auth/auth-identity-linking).

Son dos retornos diferentes: Google vuelve al callback de **Supabase**; después Supabase vuelve al `/auth/callback` de **LITO**, que intercambia el código y redirige al inicio. Si aparece `localhost` después de ingresar, revisá la Site URL y la lista de Redirect URLs de Supabase.

Para probar OAuth localmente se necesita configurar también un cliente y proveedor para el entorno local, su callback de Supabase local y la URL de retorno local. La configuración incluida no habilita Google localmente por defecto. Usá credenciales y URLs apropiadas para ese entorno; no reemplaces las de producción por las locales.

## Vercel y producción

El proyecto actual de Vercel se llama `lito-reservas` y su dominio es [lito-reservas.vercel.app](https://lito-reservas.vercel.app). Para reconstruirlo:

1. Creá o vinculá un proyecto Vercel al repositorio y seleccioná Next.js como framework.
2. En **Settings → Environment Variables**, configurá las cinco variables de la tabla para el entorno correspondiente. Usá la URL y las claves del Supabase de ese entorno y mantené las credenciales de servidor privadas. Los cambios de variables requieren un nuevo despliegue para aplicarse.
3. Configurá el dominio y comprobá que coincida con los orígenes de Google y las URL permitidas de Supabase.
4. Desplegá el código autorizado. Cuando haya migraciones, prepará la versión, aplicá y verificá las migraciones correspondientes, y publicá la versión; comprobá el sitio y los flujos después. No ejecutes migraciones ni publiques en producción sin autorización.

Las credenciales y la configuración efectiva de los paneles no se versionan aquí. Comprobá los valores en los servicios al reconstruir el entorno y mantené separados desarrollo y producción. Consultá la [documentación de variables de Vercel](https://vercel.com/docs/environment-variables) y la [guía de despliegues](https://vercel.com/docs/deployments).

## Pruebas

```bash
npm run test:integration
npm run test:e2e
```

Las pruebas de integración requieren Docker y el Supabase local iniciado; varias usan `.env.local` y el contenedor `supabase_db_litov2`. Playwright usa Chromium y puede iniciar el servidor de desarrollo automáticamente. Para una prueba concreta:

```bash
npx playwright test tests/e2e/google-acceso.spec.ts
node --test tests/integration/perfil-google.test.mjs
```

Las pruebas simuladas de Google no sustituyen un ingreso real con el proveedor configurado. Para verificar la historia completa, probá una cuenta de Google nueva, el modal de perfil incompleto y un ingreso posterior, además del acceso existente con email y contraseña, en un entorno apropiado.

## Estructura y documentación

- `app/`: pantallas, acciones de servidor y envío de correo.
- `supabase/`: configuración local y migraciones SQL.
- `tests/integration/` y `tests/e2e/`: pruebas de base de datos y navegador.
- [`docs/vision.md`](docs/vision.md): reglas de negocio y decisiones.
- [`docs/ui.md`](docs/ui.md): criterios de interfaz.
- [`docs/backlog.md`](docs/backlog.md): historias pendientes.
