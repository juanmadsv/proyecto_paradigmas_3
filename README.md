# CanchaYa | Plataforma de reservas deportivas

CanchaYa permite explorar complejos deportivos, cotizar una cancha, registrar una cuenta y reservar un turno. La entrada de la versión AE4 es `index.html`, que carga la SPA ubicada en `public/assets/`; `public/index.html` sirve como entrada equivalente. Las páginas HTML legacy se conservan como antecedentes de AE1 y AE2.

## Arquitectura actual

```text
public/
  index.html                 Vista única de la SPA
  assets/app.js              Navegación, fetch y renderizado seguro con nodos DOM
  assets/app.css             Estilos responsive y foco visible
api/                         Controladores HTTP JSON, sesiones y CSRF
models/
  DomainError.php            Errores de reglas del dominio
  CatalogoModel.php          Lectura del catálogo y turnos JSON de demostración
  UsuarioModel.php           Registro, autenticación y persistencia PDO
  ReservaModel.php           Reglas de disponibilidad, reservas y cancelación
  AdminModel.php             Permisos por complejo, configuración y consulta de reservas
  RecuperacionModel.php      Solicitud, límites y restablecimiento de contraseña
config/
  database.example.php       Ejemplo sin credenciales
database/
  schema.sql                 Esquema MySQL
  migrations/004_panel_administracion.sql  Permisos y configuración del panel
  migrations/005_ofertas_por_tipo.sql  Horarios y precios por tipo y concurrencia
data/                        Catálogo y turnos de demostración
tests/
  api_smoke.py               Verificación automatizada de la API
```

La SPA se comunica con la API mediante `fetch()` y JSON. Los controladores de `api/` gestionan métodos HTTP, sesión, CSRF y serialización de respuestas; delegan autenticación, validaciones de dominio, disponibilidad, precios, administración y recuperación en los modelos. `AdminModel` limita cada operación a los complejos asignados a la cuenta. La organización aplica MVC desacoplado en los flujos implementados.

## Instalar en XAMPP

1. Colocar el proyecto en `C:\\xampp\\htdocs\\canchaYaFrontend`.
2. Iniciar Apache y MySQL. Se requiere PHP 8.0 o posterior con `pdo_mysql` y sesiones.
3. Para una instalación nueva, en phpMyAdmin importar `database/schema.sql`. Si ya existe la base de AE1/AE2, importar en orden `database/migrations/003_cancelacion_reservas.sql`, `database/migrations/004_panel_administracion.sql` y `database/migrations/005_ofertas_por_tipo.sql` sobre `canchaya`.
4. Para MySQL distinto de `root` sin contraseña, copiar `config/database.example.php` como `config/database.local.php` y completar los valores. Ese archivo local está ignorado por Git. También se admiten `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.
5. Abrir `http://localhost/canchaYaFrontend/`.
6. El endpoint privado de reservas puede consultarse en `http://localhost/canchaYaFrontend/api/mis_reservas.php`.

La importación del esquema es manual; actualizar el repositorio no modifica la base local. Para probar cambios de datos, usar una base de pruebas separada.

## Alcance implementado en esta versión

| Caso de uso AE1 | Estado en el código |
| --- | --- |
| CU-01 Registrarse e iniciar sesión | Registro y autenticación del jugador con BCRYPT y sesión |
| CU-02 Buscar y filtrar complejos | Catálogo con filtros por texto, zona y tipo |
| CU-03 Consultar disponibilidad y detalle | Fichas y turnos de una fecha elegida consultados desde la API |
| CU-04 Generar una reserva | Creación persistente con fecha, sesión, recálculo de importes y control de turno duplicado |
| CU-05 Pagar una reserva | Simulado: se registra el medio declarado y se muestran total/seña informativos; no hay pasarela, cobro ni reintegro |
| CU-06 Consultar o cancelar una reserva | Consulta de reservas propias y cancelación con 24 horas de anticipación; no realiza reintegros |
| Administración del DFD | Panel para que las cuentas asignadas gestionen tipos de cancha, precio por hora y horarios habituales, y consulten reservas de sus complejos |
| Otros CU-07 a CU-14 | Fuera del alcance acordado de esta entrega AE4; quedan como evolución posterior |

La disponibilidad combina los horarios habituales configurados en MySQL con las reservas activas y permite elegir una fecha dentro de los próximos 90 días. El administrador configura de manera independiente el precio y los horarios de cada tipo de cancha que ofrece. La disponibilidad, el precio estimado y el cálculo del servidor usan el tipo seleccionado. Las reservas de dos tipos distintos pueden ocupar la misma hora; un segundo turno del mismo tipo, complejo, fecha y hora se rechaza. La cancelación libera esa combinación para reservarla de nuevo. La seña del 20% y el medio declarado son parte de una simulación: no se procesa un cobro ni un reintegro, y el sitio no almacena datos de tarjeta ni envía notificaciones a propietarios. Los demás casos CU-07 a CU-14 no integran el alcance acordado del AE4.

### Habilitar una cuenta administradora

1. En una base que ya tenía el panel, importar `database/migrations/005_ofertas_por_tipo.sql`. En una base anterior, aplicar antes las migraciones 003 y 004 en orden.
2. Crear una cuenta desde la pantalla Mi cuenta y cerrar la sesión.
3. En PowerShell, asignar esa cuenta a un complejo desde la carpeta del proyecto: `C:\xampp\php\php.exe tools\asignar_administrador.php correo@ejemplo.com terraza`. Los códigos disponibles son `terraza`, `rampla`, `napoles`, `establo`, `potrero` y `olimpo`. Repetir el comando por cada complejo que deba administrar.
4. Volver a iniciar sesión. El acceso Administración aparece para esa cuenta; la API verifica la asignación en cada solicitud.

## API y códigos HTTP

| Endpoint | Método | Resultado principal |
| --- | --- | --- |
| `api/csrf.php` | GET | Token CSRF de la sesión |
| `api/registro.php` | POST JSON | 201 creado; 400 JSON inválido; 409 email repetido; 422 campos inválidos |
| `api/login.php` | POST JSON | 200 autenticado; 401 credenciales incorrectas. La interfaz muestra un aviso breve y accesible ante 401 |
| `api/logout.php` | POST JSON | 200 sesión cerrada |
| `api/turnos.php` | GET `?fecha=YYYY-MM-DD` | 200 disponibilidad por complejo y tipo de cancha para la fecha; 400 fecha fuera del rango |
| `api/catalogo.php` | GET | 200 catálogo descriptivo combinado con la configuración guardada |
| `api/mis_reservas.php` | GET | 200 reservas propias; 401 sin sesión |
| `api/mis_reservas.php` | POST JSON | 201 reserva creada; 400 JSON inválido/fecha fuera de rango; 401 sin sesión; 409 turno ocupado; 422 campos inválidos |
| `api/mis_reservas.php` | DELETE JSON `{reserva_id}` | 200 cancelada; 400 ID inválido; 401 sin sesión; 403 CSRF; 409 no existe, no pertenece o faltan menos de 24 horas |
| `api/admin.php` | GET | 200 precios y horarios independientes por tipo, y reservas de complejos asignados; 401 sin sesión; 403 sin asignación |
| `api/admin.php` | PUT JSON | 200 ofertas por tipo guardadas; 400 datos inválidos; 401 sin sesión; 403 rol/asignación o CSRF |

Los POST usan `Content-Type: application/json` y `X-CSRF-Token`. El servidor responde 403 si falta o no coincide el token, 405 ante un método incorrecto, 415 ante un tipo de contenido incorrecto, 400 ante JSON o datos inválidos y 500 con un mensaje genérico ante fallas internas.

## Seguridad y accesibilidad implementadas

- Contraseñas con `password_hash(..., PASSWORD_BCRYPT)` y `password_verify()`; la columna usa `VARCHAR(255)`.
- Consultas PDO preparadas con parámetros nombrados y emulación desactivada.
- Sesión estricta, cookie `HttpOnly` y `SameSite=Lax`; el identificador de sesión se regenera al autenticar.
- Los endpoints privados identifican al usuario desde `$_SESSION`; no confían en un `usuario_id` enviado por el cliente.
- El panel exige una asignación persistida en `administradores_complejo`; ocultar el enlace en la interfaz no reemplaza la autorización de la API.
- Las mutaciones requieren CSRF. Las respuestas JSON usan `no-store` y errores internos no exponen SQL ni credenciales.
- El JavaScript construye contenido con `createElement`, `textContent` y nodos de texto; evita asignaciones a `innerHTML`.
- Los errores de autenticación se muestran en el formulario y mediante un aviso breve; el mensaje accesible no revela si falló el email o la contraseña.
- La SPA incluye regiones `aria-live`, etiquetas asociadas a formularios, enlace para saltar al contenido, foco visible y estilos responsive.

## Verificación y límites de la evidencia

El script `tests/api_smoke.py` comprueba autenticación, CSRF, aislamiento de reservas y conflictos. Ejecutarlo únicamente contra una base de pruebas:

```bash
python tests/api_smoke.py http://localhost/canchaYaFrontend
```

El contrato de la API está en `docs/API.md` y las instrucciones de recuperación de cuenta en `docs/RECUPERACION.md`. Los informes académicos y evidencias se organizan en formato PDF dentro de `docs/`: AE1, las tres opciones documentadas de AE2 y el informe técnico AE4.

El usuario informa 100/100 en Accesibilidad para las cinco vistas del recorrido previo y para el panel de administración tras completar su recorrido. También confirmó que una cuenta sin asignación no puede acceder al panel y que las ofertas configuradas persisten y se reflejan en el sistema. Se conservan las capturas existentes; no se incorporaron capturas nuevas. `tests/api_smoke.py` se ejecutó contra la base aislada `canchaya_qa` y reportó `PASS` para autenticación, CSRF, sesión, conflictos, aislamiento, cálculo del servidor y cierre de sesión. La ejecución creó dos cuentas y una reserva persistente únicamente en esa base de pruebas. Las mediciones de rendimiento y la compatibilidad entre navegadores deben registrarse por separado.

La versión cubre el flujo principal del jugador y el panel administrativo definido para el DFD del AE4; no implementa todos los casos de uso de AE1. La recuperación por correo no forma parte del alcance validado de esta entrega. Para desplegar fuera de localhost, se requieren HTTPS, credenciales MySQL con permisos mínimos y controles de abuso como limitación de intentos de autenticación.

## Recuperación de contraseña

La recuperación por correo queda fuera del alcance de esta entrega y no está habilitada ni validada para usuarios. El documento [docs/RECUPERACION.md](docs/RECUPERACION.md) conserva las notas técnicas para una posible configuración posterior.
