# Recuperación de contraseña con Gmail

El enlace **Olvidé mi contraseña** está en Mi cuenta. La página recuperar.html permite
pedir el correo o elegir una contraseña nueva cuando se abre el enlace recibido.

## Instalación sobre la base que ya existe

1. Actualizar la rama autenticacion-php-sesiones en la carpeta de XAMPP.
2. En phpMyAdmin, importar **database/002_recuperacion.sql**. No borrar usuarios
   ni reservas. La migración crea dos tablas y agrega usuarios.version_sesion.
   Se puede volver a importar sin borrar datos. Las sesiones abiertas antes de
   esta migración deben iniciar sesión otra vez.
3. Instalar Composer desde https://getcomposer.org/download/ si no está instalado.
   En Windows, seleccionar C:\xampp\php\php.exe durante la instalación.
4. Abrir Git Bash dentro del proyecto y ejecutar:

```bash
composer install --no-dev
```

Esto descarga PHPMailer 7.1.1 en vendor, que no se sube a GitHub. Se necesita
PHP >= 8.0, pdo_mysql y OpenSSL. No desactivar la verificación de certificados
TLS si aparece un error: revisar la configuración de certificados de PHP.

## Gmail: configuración que sólo queda en tu PC

1. Activar la verificación en dos pasos de la cuenta de Google emisora.
2. Crear una contraseña de aplicación en https://myaccount.google.com/apppasswords .
   Algunas cuentas administradas o con Protección Avanzada no ofrecen esta opción.
3. Copiar config/mail.example.php como **config/mail.local.php**.
4. Completar username y from_email con la cuenta emisora; password con la
   contraseña de aplicación, sin espacios. No usar la clave normal de Gmail.
5. Mantener host smtp.gmail.com y puerto 587 (STARTTLS).
6. base_url debe coincidir con el proyecto de tu PC, por ejemplo:
   http://localhost/canchaYaFrontend .

No subir mail.local.php al repositorio ni compartir la contraseña de aplicación.
El archivo está ignorado por Git y config está protegido por Apache. El remitente
puede ser una cuenta del proyecto; no necesita coincidir con el email del usuario
que recupera el acceso. El destinatario sí debe ser un correo real que reciba mensajes.

## Iniciar el proceso que envía los correos

Con Apache y MySQL encendidos, abrir una segunda terminal dentro del proyecto:

```bash
/c/xampp/php/php.exe tools/enviar_recuperaciones.php --watch
```

Si PHP ya está en PATH, también sirve php tools/enviar_recuperaciones.php --watch .
Mantener esa terminal abierta. Ctrl+C detiene el envío. Sin --watch procesa la
cola una sola vez y termina. El proceso es sólo CLI; no se puede ejecutar por HTTP.

La solicitud web se encola para que la velocidad de Gmail no revele si un email
está registrado. Si el proceso no está abierto, las solicitudes quedan pendientes
y no llega ningún correo. Si muestra envío fallido, revisar Gmail/configuración y
pedir otro enlace tras un minuto. No se imprimen tokens ni claves en la terminal.
Un proceso interrumpido durante SMTP puede dejar una fila enviando; no se reintenta
a ciegas: solicitar otro enlace. Sólo hay un proceso de envío recomendado para XAMPP.

## Flujo y protecciones

- La solicitud devuelve 202 y el mismo mensaje para email registrado, inexistente
  o límite alcanzado. No devuelve enlaces ni tokens en la respuesta.
- Máximo 3 solicitudes por email y 10 por IP en una ventana de 15 minutos.
  Se encola como máximo una solicitud por minuto por cuenta.
- El proceso genera 32 bytes aleatorios. En MySQL se guarda sólo SHA-256 del token.
  El token original sólo está en memoria y en el correo.
- El enlace vence a los 15 minutos desde su preparación para envío, es de un solo
  uso y no se construye con el encabezado Host del visitante.
- El token se lleva en un fragmento #token=...: no se envía como parte de una URL
  HTTP al servidor. app.js lo retira de la barra y lo mantiene en memoria.
  Si se recarga la página antes de guardar, volver a abrir el enlace del correo.
- La contraseña nueva debe repetirse, se valida en PHP y se guarda con BCRYPT.
- Cambiar la clave consume todos los enlaces de esa cuenta e incrementa
  version_sesion, invalidando las sesiones anteriores en la próxima petición.
  No se inicia sesión automáticamente.
- Los POST requieren CSRF. El usuario de un enlace se obtiene del token,
  nunca de un usuario_id enviado por el navegador.
- Los mensajes del frontend usan textContent.

Las solicitudes pendientes no modifican la contraseña ni cierran sesiones.
Los enlaces anteriores vigentes siguen sirviendo hasta usarse, vencer o cambiar
la contraseña. La cola usa UTC en MySQL; la disponibilidad de canchas sigue usando
el horario de Argentina.

## Prueba manual, en orden

1. Crear una cuenta con un email real al que tengas acceso.
2. Cerrar sesión, entrar en Mi cuenta y presionar Olvidé mi contraseña.
3. Solicitar el enlace. Comprobar respuesta 202 y llegada del correo (también spam).
4. Abrirlo, escribir dos contraseñas distintas: debe rechazarlo.
5. Escribir la misma contraseña válida dos veces: debe confirmar el cambio.
6. Intentar login con la clave anterior: 401. Con la nueva: 200.
7. Abrir otra vez el mismo enlace y enviar el cambio: debe rechazarlo.
8. Pedir otro enlace y probar después de 15 minutos: debe rechazarlo.
9. Mantener una sesión en otro navegador antes de cambiar la clave. Después,
   consultar api/mis_reservas.php desde ese navegador: 401.
10. En MySQL, comprobar password con prefijo $2y$ y token_hash vacío tras usarse.

La respuesta genérica no garantiza entrega: comprobar la terminal del proceso.
No usar cuentas de prueba @example.com para verificar correos reales.

## Prueba automatizada de la API (sin enviar correos)

Con una **base de pruebas**, Apache/MySQL y el proceso de correo detenido:

```bash
/c/xampp/php/php.exe tests/recuperacion_smoke.php http://localhost/canchaYaFrontend
```

Crea una cuenta @example.invalid y una solicitud; simula el hash/token enviado
directamente en esa base. Comprueba respuesta genérica, expiración, confirmación,
uso único, claves vieja/nueva y sesiones anteriores. No prueba SMTP/Gmail.
No elimina datos existentes. Los límites de solicitudes siguen aplicándose.

## Referencias

- OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Google: https://support.google.com/accounts/answer/185833?hl=es
- PHPMailer: https://github.com/PHPMailer/PHPMailer
