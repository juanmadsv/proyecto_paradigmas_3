# CanchaYa — AE4 / Paradigmas III

CanchaYa permite explorar complejos deportivos, cotizar una cancha, registrar una cuenta y reservar un turno. La entrada de la versión AE4 es la SPA en `public/index.html`; las páginas HTML de la raíz se conservan como antecedentes de AE1 y AE2.

## Arquitectura actual

```text
public/
  index.html                 Vista única de la SPA
  assets/app.js              Navegación, fetch y renderizado seguro con nodos DOM
  assets/app.css             Estilos responsive y foco visible
api/                         Endpoints JSON que actúan como controladores
models/
  UsuarioModel.php           Consultas de usuarios mediante PDO
  ReservaModel.php           Consultas y persistencia de reservas mediante PDO
config/
  database.example.php       Ejemplo sin credenciales
database/
  schema.sql                 Esquema MySQL
data/                        Catálogo y turnos de demostración
tests/
  api_smoke.py               Verificación automatizada de la API
```

La SPA se comunica con la API mediante `fetch()` y JSON. Los endpoints de PHP delegan las consultas de usuarios y reservas en modelos. La conexión PDO se configura en `api/bootstrap.php`; las reglas de autenticación, validación y códigos HTTP permanecen en los endpoints.

## Instalar en XAMPP

1. Colocar el proyecto en `C:\\xampp\\htdocs\\canchaYaFrontend`.
2. Iniciar Apache y MySQL. Se requiere PHP 8.0 o posterior con `pdo_mysql` y sesiones.
3. En phpMyAdmin, importar `database/schema.sql`.
4. Para MySQL distinto de `root` sin contraseña, copiar `config/database.example.php` como `config/database.local.php` y completar los valores. Ese archivo local está ignorado por Git. También se admiten `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.
5. Abrir `http://localhost/canchaYaFrontend/public/`.
6. El endpoint privado de reservas puede consultarse en `http://localhost/canchaYaFrontend/api/mis_reservas.php`.

La importación del esquema es manual; actualizar el repositorio no modifica la base local. Para probar cambios de datos, usar una base de pruebas separada.

## Alcance implementado en esta versión

| Caso de uso AE1 | Estado en el código |
| --- | --- |
| CU-01 Registrarse e iniciar sesión | Registro y autenticación del jugador con BCRYPT y sesión |
| CU-02 Buscar y filtrar complejos | Catálogo con filtros por texto, zona y tipo |
| CU-03 Consultar disponibilidad y detalle | Fichas y turnos del día consultados desde la API |
| CU-04 Generar una reserva | Creación persistente de reserva con control de sesión y conflicto de turno |
| CU-05 Pagar una reserva | Parcial: se registra el medio declarado; no existe pasarela ni cobro real |
| CU-06 Consultar o cancelar una reserva | Consulta de reservas propias; la cancelación todavía no está implementada |
| CU-07 a CU-14 | No implementados en esta versión: administración de complejos, oferta, cobros, reclamos y estadísticas |

La disponibilidad usa turnos de demostración para el día actual. La seña del 20% respeta la regla principal documentada en AE1, pero es informativa: no confirma un pago. El sitio no almacena datos de tarjeta ni envía notificaciones a propietarios.

## API y códigos HTTP

| Endpoint | Método | Resultado principal |
| --- | --- | --- |
| `api/csrf.php` | GET | Token CSRF de la sesión |
| `api/registro.php` | POST JSON | 201 creado; 400 datos inválidos; 409 email repetido |
| `api/login.php` | POST JSON | 200 autenticado; 401 credenciales incorrectas |
| `api/logout.php` | POST JSON | 200 sesión cerrada |
| `api/turnos.php` | GET | 200 disponibilidad pública del día |
| `api/mis_reservas.php` | GET | 200 reservas propias; 401 sin sesión |
| `api/mis_reservas.php` | POST JSON | 201 reserva creada; 400 entrada inválida; 401 sin sesión; 409 turno ocupado |

Los POST usan `Content-Type: application/json` y `X-CSRF-Token`. El servidor responde 403 si falta o no coincide el token, 405 ante un método incorrecto, 415 ante un tipo de contenido incorrecto, 400 ante JSON o datos inválidos y 500 con un mensaje genérico ante fallas internas.

## Seguridad y accesibilidad implementadas

- Contraseñas con `password_hash(..., PASSWORD_BCRYPT)` y `password_verify()`; la columna usa `VARCHAR(255)`.
- Consultas PDO preparadas con parámetros nombrados y emulación desactivada.
- Sesión estricta, cookie `HttpOnly` y `SameSite=Lax`; el identificador de sesión se regenera al autenticar.
- Los endpoints privados identifican al usuario desde `$_SESSION`; no confían en un `usuario_id` enviado por el cliente.
- Las mutaciones requieren CSRF. Las respuestas JSON usan `no-store` y errores internos no exponen SQL ni credenciales.
- El JavaScript construye contenido con `createElement`, `textContent` y nodos de texto; evita asignaciones a `innerHTML`.
- La SPA incluye regiones `aria-live`, etiquetas asociadas a formularios, enlace para saltar al contenido, foco visible y estilos responsive.

## Verificación y límites de la evidencia

El script `tests/api_smoke.py` comprueba autenticación, CSRF, aislamiento de reservas y conflictos. Ejecutarlo únicamente contra una base de pruebas:

```bash
python tests/api_smoke.py http://localhost/canchaYaFrontend
```

Para la entrega AE4 todavía se debe guardar la matriz ISO/IEC 25010 con rutas y líneas concretas, ejecutar la auditoría Lighthouse hasta alcanzar 100/100 en accesibilidad, verificar el recorrido solo con teclado y capturar la pestaña Network. El resultado de Lighthouse y el comportamiento con XAMPP dependen de ejecutar esta rama en el entorno local.

La versión actual cubre el flujo principal del jugador; no debe presentarse como implementación de todos los casos de uso de AE1. Para desplegar fuera de localhost, se requieren HTTPS, credenciales MySQL con permisos mínimos y controles de abuso como limitación de intentos de autenticación.

## Recuperación de contraseña

La función de recuperación está documentada en [RECUPERACION.md](RECUPERACION.md). Requiere importar la migración indicada, instalar Composer y configurar el correo. La recuperación por correo no funciona hasta completar esa configuración.
