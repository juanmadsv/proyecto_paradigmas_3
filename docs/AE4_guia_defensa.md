# Guía para la defensa oral — AE4 CanchaYa

Esta guía refleja el estado de la rama `ae4-tifas-implementacion`. Las líneas citadas corresponden a la versión actual de esa rama y pueden cambiar si se editan los archivos. La matriz de trazabilidad y calidad está en `docs/AE4_trazabilidad_y_matriz_ISO.md`.

## Recorrido de demostración

1. Abrir la aplicación desde XAMPP, en `http://localhost/canchaYaFrontend/`.
2. Sin iniciar sesión, recorrer el catálogo y aplicar filtros por texto, zona y tipo. Explicar que los resultados se construyen como nodos DOM, con texto asignado mediante `textContent`.
3. Navegar por teclado: usar Tab para recorrer controles y enlaces; verificar el foco visible y probar el enlace “Saltar al contenido”.
4. Crear una cuenta de prueba e iniciar sesión. No usar datos reales ni contraseñas personales.
5. Elegir una fecha, un complejo y un turno; explicar que la interfaz consulta la disponibilidad mediante `fetch()` y que el servidor vuelve a validar los datos.
6. Confirmar una reserva. En Network, mostrar el POST JSON a `api/mis_reservas.php`, el código 201 y la respuesta JSON. Mostrar que se calcula una seña del 20%, sin afirmar que hubo un cobro.
7. Abrir “Mis reservas”, cancelar una reserva de prueba que tenga más de 24 horas de anticipación y mostrar el DELETE JSON. Explicar que no se tramita un reintegro.
8. En una ventana privada o sesión cerrada, solicitar `api/mis_reservas.php` y comprobar la respuesta 401.
9. Lighthouse ya fue ejecutado por el equipo: se reporta 100/100 en Accesibilidad para `#inicio`, `#reservar`, `#cuenta`, `#mis-reservas` y `#cotizar`. Las cinco capturas con URL y puntuación están incorporadas al informe técnico; proyectar una o más durante la defensa.

## Mapa del código para explicar

| Tema | Archivo y referencia | Qué explicar |
| --- | --- | --- |
| Navegación SPA y petición JSON | `public/assets/app.js:101`, `public/assets/app.js:481` | `request()` usa Fetch, credenciales de sesión, JSON, token CSRF y comprueba `response.ok`; el enrutador cambia vistas sin recargar toda la página. |
| Catálogo y filtros | `public/assets/app.js:136` | Los filtros se aplican sobre el catálogo y el contenido dinámico se representa con elementos DOM. |
| Reserva y disponibilidad | `public/assets/app.js:228`, `public/assets/app.js:315` | La pantalla permite fecha, cancha/servicios y horario; la disponibilidad se vuelve a pedir cuando cambia la fecha o el complejo. |
| Consulta y cancelación | `public/assets/app.js:407`; `api/mis_reservas.php:5-21` | Solo se listan reservas del usuario autenticado; la cancelación es una mutación DELETE protegida contra CSRF. |
| API y errores HTTP | `api/bootstrap.php:7-20`, `api/bootstrap.php:87-121` | Se centralizan el encabezado JSON, la respuesta con código HTTP, la validación CSRF y la identificación del usuario desde la sesión. |
| Registro seguro | `api/registro.php:13-15`; `models/UsuarioModel.php:11-29` | La contraseña se transforma con BCRYPT antes de persistir; el modelo usa consultas preparadas. |
| Inicio de sesión | `api/login.php:14-17` | Se compara el hash con `password_verify()` y se regenera el ID de sesión después de autenticar. |
| Reglas de reserva | `api/mis_reservas.php:24-85` | El servidor valida campos, fecha, servicios, cupón, turno y calcula el total y la seña; no confía en precios enviados por el navegador. |
| Persistencia y concurrencia | `models/ReservaModel.php:32-57`; `database/schema.sql:15-34` | PDO parametriza las operaciones y la clave única de turno impide dos reservas activas iguales aunque dos solicitudes lleguen casi al mismo tiempo. |
| Accesibilidad | `public/index.html:12-28`; `public/assets/app.css:26`; `public/assets/app.js:193-215` | Enlace para saltar al contenido, foco visible, etiquetas asociadas y anuncios accesibles de cambios en resultados. |

## Preguntas que conviene poder responder

**¿Qué aporta separar la SPA de la API?**  
La interfaz presenta y actualiza las vistas; PHP valida reglas de negocio, sesión y persistencia. La comunicación usa JSON y códigos HTTP. Esto separa responsabilidades, aunque algunas reglas todavía están en los controladores y el catálogo es estático.

**¿Por qué una validación JavaScript no alcanza?**  
El navegador puede modificarse o evitarse. Por eso PHP valida de nuevo los datos y calcula el importe. Las restricciones del formulario mejoran la experiencia, pero la API es la autoridad.

**¿Cómo se evitan SQL injection y XSS?**  
PDO usa consultas preparadas con parámetros; el renderizado dinámico usa nodos DOM y `textContent`, sin insertar los valores del catálogo como HTML. La defensa debe poder señalar las consultas concretas del modelo y las funciones de renderizado.

**¿Qué significa el 401 en reservas?**  
Que la solicitud no tiene una sesión autenticada. El endpoint obtiene el usuario desde la sesión; no confía en un ID que mande el cliente. El 403 se usa para un token CSRF inválido o ausente.

**¿Qué significa que la seña sea del 20%?**  
Es la regla económica implementada para calcular el monto sugerido. No hay integración de pagos: elegir un medio no procesa una tarjeta ni confirma una transferencia.

**¿Qué quedó pendiente del alcance AE1?**  
Los roles y paneles de propietarios/administración, aprobación de complejos, gestión completa de horarios y pagos, reclamos y estadísticas (CU-07 a CU-14), además de una pasarela real. El estado exacto está documentado en la matriz; presentarlo con claridad evita afirmar funciones que la aplicación no tiene.

**¿Qué evidencia falta para afirmar calidad medida?**  
El equipo recorrió XAMPP y teclado y ejecutó Lighthouse. Las capturas Lighthouse y del 401 anónimo están en el informe; faltan Network de los flujos autenticados y resultados automatizados contra una base de pruebas. El código muestra controles implementados, pero no reemplaza los resultados observados.

## Pendientes locales previos a la defensa

- Descargar o actualizar esta rama y colocarla en XAMPP.
- Si se reutiliza una base existente, importar `database/migrations/003_cancelacion_reservas.sql` en la base `canchaya`; para una base nueva, importar `database/schema.sql`.
- Ejecutar el recorrido con una cuenta y datos de prueba.
- Ejecutar las comprobaciones automatizadas existentes solo contra una base de prueba.
- Conservar el informe PDF con las capturas Lighthouse y 401; completar Network de los flujos autenticados y, si se solicita como evidencia, navegación por teclado.
