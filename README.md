# CanchaYa — Paradigmas III

Catálogo de complejos y cotizador públicos, con registro/login en PHP y reservas
privadas persistidas en MySQL. La interacción de cuenta y reserva usa fetch y
actualiza el DOM sin recargar; las páginas HTML existentes se conservan.

## Instalar en XAMPP (Windows)

1. Actualizar esta rama dentro de `C:\xampp\htdocs\canchaYaFrontend`.
2. Iniciar **Apache** y **MySQL** desde XAMPP. Se necesita PHP 8.0 o superior con
   las extensiones `pdo_mysql` y `session` (incluidas en XAMPP habitual).
3. Abrir `http://localhost/phpmyadmin/`, entrar en **Importar**, seleccionar
   `database/schema.sql` del proyecto y ejecutar. Crea `canchaya`, `usuarios` y
   `reservas`; amplía `usuarios.password` a `VARCHAR(255)` si ya existía.
4. Para XAMPP con el usuario `root` sin contraseña, la configuración predeterminada
   funciona. Si tu MySQL tiene otra clave/puerto/usuario, copiar
   `config/database.example.php` como `config/database.local.php` y completarlo.
   El archivo local está ignorado por Git y la carpeta está protegida por Apache.
   También se aceptan `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
5. Abrir `http://localhost/canchaYaFrontend/`, entrar en **Mi cuenta**, registrarse
   e iniciar sesión. Después entrar en **Reservar** y elegir un turno disponible.
6. Volver a **Mi cuenta** para consultar las reservas propias y cerrar sesión.

La importación de SQL es un paso manual: un pull de Git no crea las tablas de
MySQL de tu PC. Para una base previa con otra estructura, revisar el esquema
antes de importarlo. No se ejecutan migraciones automáticamente al abrir la web.

## Cómo se cumple la consigna

| Requisito | Implementación |
| --- | --- |
| Tabla usuarios y hash completo | `database/schema.sql`: `password VARCHAR(255)` |
| Registro JSON y BCRYPT | `api/registro.php`: `password_hash($pass, PASSWORD_BCRYPT)` |
| Consultas preparadas | PDO con parámetros y emulación desactivada |
| Login seguro | `api/login.php`: `password_verify()` y `session_regenerate_id(true)` |
| Estado del servidor | `api/bootstrap.php`: `session_start()` y `$_SESSION['usuario_id']` |
| Endpoint privado | `api/mis_reservas.php`: `exigirUsuario()` responde 401 antes de consultar la BD si no hay sesión |
| Verificar sesión al cargar | `app.js`: fetch a `api/mis_reservas.php` en cada página |
| DOM según sesión | formularios/botones con `data-sesion`, ocultos inicialmente; fieldset deshabilitado sin sesión |
| Renderizado seguro | nombre, email, errores, confirmación y reservas con `textContent`/nodos de texto |

BCRYPT admite hasta 72 bytes: se valida una contraseña de 8 a 72 bytes y nunca se
recorta silenciosamente. No se devuelve el hash ni se guarda la contraseña en
cookies, localStorage o sessionStorage. Nombre y email salen de la cuenta; ya no
se solicitan otra vez al reservar. El único identificador de usuario válido es el
de la sesión, aunque el cliente envíe otro `usuario_id`.

## API y códigos HTTP

| Servicio | Método | Acceso / resultado |
| --- | --- | --- |
| `api/csrf.php` | GET | Token de la sesión anónima o autenticada |
| `api/registro.php` | POST JSON | 201 creado, 409 email repetido, 422 datos inválidos |
| `api/login.php` | POST JSON | 200 autenticado, 401 credenciales incorrectas |
| `api/logout.php` | POST JSON | Destruye sesión y elimina cookie |
| `api/mis_reservas.php` | GET | 200 usuario y sus reservas; 401 sin sesión |
| `api/mis_reservas.php` | POST JSON | 201 reserva guardada; 401 sin sesión; 409 turno ocupado |
| `api/turnos.php` | GET | Disponibilidad pública del día, sin datos personales |

Los POST necesitan `Content-Type: application/json` y `X-CSRF-Token`. El token
se recibe en `csrf.php` o en el login/endpoint privado. Falta de token: 403.
JSON roto: 400; tipo de contenido incorrecto: 415; método incorrecto: 405.
Un problema de configuración/BD devuelve 500 con mensaje genérico, sin SQL ni claves.

## Sesiones y seguridad

- Cookie `CANCHAYA_SESSID` con `HttpOnly`, `SameSite=Lax` y alcance del proyecto.
  En HTTPS también se activa `Secure`; HTTP queda habilitado para localhost.
- Modo estricto de sesión, cookies como único transporte y vencimiento tras
  30 minutos de inactividad. El ID se renueva al autenticar y el token CSRF rota.
- Las respuestas JSON no se almacenan en caché (`no-store`).
- Ocultar un formulario sólo ayuda a la interfaz: la autorización real se hace
  siempre en PHP. Cambiar el DOM o enviar un `usuario_id` falso no la evita.
- Los nombres se conservan como datos y se muestran con `textContent`. Se puede
  probar un nombre como `<img src=x onerror="alert(1)">`: debe aparecer como
  texto, sin imagen ni ejecución de JavaScript.
- El total y la seña se recalculan en PHP con el catálogo y los servicios admitidos.
  El cupón UCP10 conserva el 10 %. Un precio enviado por el navegador se ignora.
- La clave única de turno evita dos reservas del mismo complejo/fecha/horario.
  Todas las consultas de reservas filtran por el usuario autenticado.

## Pruebas

Con una **base de pruebas** creada mediante el mismo SQL y el servidor ejecutándose:

```bash
python tests/api_smoke.py http://localhost/canchaYaFrontend
```

El script crea dos cuentas nuevas y una reserva, sin borrar datos. Necesita al
menos un horario libre en los datos de demostración. Comprueba 401, CSRF,
credenciales, rotación del ID, usuarios separados, conflicto de turno, importe
calculado por PHP y logout. Usa sólo la biblioteca estándar de Python.

Prueba manual de 401: cerrar sesión, abrir en el navegador
`http://localhost/canchaYaFrontend/api/mis_reservas.php` y comprobar en **Red**
que el estado sea **401 Unauthorized**. Tras el login, repetir y comprobar 200.
En phpMyAdmin el campo password debe contener un hash con prefijo `$2y$`.

## Funciones previas y alcance

El buscador (opción 3), los listados, las fichas y **Cotizar** (opción 5) siguen
siendo públicos. El presupuesto de Cotizar es una estimación independiente y no
se transfiere automáticamente a una reserva. Las reservas usan una hora para el
día actual, y la disponibilidad se comparte por complejo, sin separarla por tipo
de cancha. Los JSON siguen definiendo el catálogo y los horarios base; MySQL
agrega las reservas ocupadas. Las reservas ahora sobreviven a recargas/logout.
La seña es informativa: no hay pasarela de pagos ni envío de correos.

Este trabajo corresponde al entorno académico/local. Para exponerlo en Internet
se necesita además HTTPS, credenciales MySQL con permisos mínimos y controles
de abuso (por ejemplo, limitación de intentos de autenticación).

Las fundamentaciones `AE2_Opcion3_SOHDM.md`, `AE2_Opcion5_EORM.md` y
`AE2_Opcion10_SOHDM.md` describen las etapas anteriores. La opción 10 evolucionó:
la confirmación simulada fue reemplazada por los servicios PHP aquí documentados.

Referencias: [password_hash](https://www.php.net/manual/es/function.password-hash.php),
[password_verify](https://www.php.net/manual/es/function.password-verify.php),
[sesiones](https://www.php.net/manual/es/book.session.php),
[PDO prepare](https://www.php.net/manual/es/pdo.prepare.php).
