# Trazabilidad AE1–AE4 y autoevaluación ISO/IEC 25010

Este documento registra el estado del código en la rama `ae4-tifas-implementacion`. Describe evidencia visible en archivos y separa implementación de verificación. No acredita por sí solo un puntaje Lighthouse ni una prueba ejecutada.

## Trazabilidad de casos de uso de AE1

| Caso de uso | Evidencia actual | Estado y límite |
| --- | --- | --- |
| CU-01 Registrarse e iniciar sesión | `public/assets/app.js`; `api/registro.php`; `api/login.php`; `models/UsuarioModel.php`; `database/schema.sql` | Implementado para el rol jugador. No hay roles de propietario ni administrador. |
| CU-02 Buscar y filtrar complejos | `public/assets/app.js`; `data/complejos.json` | Parcial: búsqueda por texto, zona y tipo. No hay mapa, filtro de precio ni publicación aprobada/activa desde MySQL. |
| CU-03 Consultar disponibilidad y detalle | `public/assets/app.js`; `api/turnos.php`; `models/ReservaModel.php`; `data/turnos.json` | Parcial: se elige una fecha dentro de 90 días y se combinan turnos de demostración con reservas activas de MySQL. No hay cancha individual ni bloqueos del propietario. |
| CU-04 Generar una reserva | `public/assets/app.js`; `api/mis_reservas.php`; `models/ReservaModel.php`; `database/schema.sql` | Parcial: exige sesión, recalcula valores en servidor y evita duplicar complejo/fecha/horario. No queda pendiente de confirmación de una pasarela de pago. |
| CU-05 Pagar una reserva | `comprar.html`; `api/mis_reservas.php` | No hay pasarela ni transacción de pago. El medio elegido se almacena como declaración y la seña del 20% es informativa. |
| CU-06 Consultar o cancelar una reserva | `api/mis_reservas.php` GET/DELETE; `models/ReservaModel.php::cancelar`; `database/migrations/003_cancelacion_reservas.sql`; vista `#mis-reservas` | Consulta y cancelación implementadas con límite de 24 horas y autorización por propietario de la reserva. No hay reintegro porque no se procesa un pago real. La base existente requiere ejecutar la migración. |
| CU-07 a CU-14 | Panel de propietarios y administración, pagos manuales, reclamos y estadísticas | No implementados en esta rama. |

## Matriz de autoevaluación ISO/IEC 25010

| Característica | Evidencia en código | Estado |
| --- | --- | --- |
| Adecuación funcional | Flujo de cuenta, catálogo, disponibilidad diaria, creación y consulta de reservas: `public/assets/app.js`, `api/registro.php`, `api/login.php`, `api/turnos.php`, `api/mis_reservas.php` | Parcial: cubre el recorrido principal del jugador, pero no todo el catálogo de CU de AE1 ni un CRUD completo de reservas. |
| Eficiencia de desempeño | `fetch()` asíncrono en `public/assets/app.js`; actualizaciones con `replaceChildren()` sin recarga completa | Parcial: no se midieron tamaños de respuesta ni latencias; falta evidencia de ejecución. |
| Compatibilidad | Interfaz HTML/JS separada de endpoints PHP JSON | Parcial: la separación está en el diseño; falta probar navegadores y dispositivos concretos. |
| Fiabilidad | `api/bootstrap.php` centraliza respuestas HTTP y errores; `database/schema.sql` mantiene una clave única para turnos activos; `tests/api_smoke.py` | Parcial: el esquema evita reservas simultáneas del mismo turno y el script está disponible, pero su resultado debe registrarse contra una base de pruebas. La migración 003 adapta bases existentes. |
| Seguridad | `models/UsuarioModel.php`, `models/ReservaModel.php`, `api/registro.php`, `api/login.php`, `api/bootstrap.php`, `api/mis_reservas.php` | Implementada en el flujo cubierto: BCRYPT, PDO con parámetros, sesiones, regeneración de ID, CSRF, autorización por sesión y errores genéricos. Requiere verificación de ejecución. |
| Usabilidad y accesibilidad | `public/index.html`, `public/assets/app.js`, `public/assets/app.css` | Parcial: hay etiquetas asociadas, teclado nativo, foco visible y regiones `aria-live`; el recorrido completo por teclado y el 100/100 de Lighthouse aún deben comprobarse y capturarse. |
| Mantenibilidad | Endpoints bajo `api/`; persistencia de usuarios y reservas en `models/`; conexión central en `api/bootstrap.php`; `database/migrations/` | Parcial: existe separación inicial por capas; parte de las reglas de reserva siguen en el endpoint y los datos de catálogo/horarios son JSON estático. |

## Evidencias técnicas principales

- Respuesta JSON y códigos HTTP compartidos: `api/bootstrap.php`, funciones `responder()`, `metodo()`, `cuerpoJSON()`.
- Registro BCRYPT: `api/registro.php`, llamada `password_hash()`.
- Verificación y regeneración de sesión: `api/login.php`, llamadas `password_verify()` y `session_regenerate_id(true)`.
- Usuario autenticado: `api/bootstrap.php`, función `exigirUsuario()`.
- Consultas preparadas: métodos de `models/UsuarioModel.php` y `models/ReservaModel.php`.
- XSS: la SPA crea nodos DOM y asigna texto mediante `textContent`; el renderizado de las páginas legacy también fue migrado a nodos DOM en `main.js` y `app.js`.
- Política de seña: AE1 define 20%; `tarifas.json`, `main.js` y `api/mis_reservas.php` usan 20%. El cobro real no está integrado.
- Cancelación: `api/mis_reservas.php` valida sesión y CSRF; `models/ReservaModel.php` limita la cancelación a 24 horas y marca el turno para que deje de contarse como ocupado.
- Fecha: `api/turnos.php` acepta fechas de hoy hasta 90 días adelante y superpone las reservas activas a la plantilla de disponibilidad.

## Evidencias que deben agregarse al informe final

1. Captura de Lighthouse con el resultado de Accesibilidad de la versión final.
2. Registro de recorrido solo con teclado (Tab y Enter) y de cualquier ajuste hecho para completarlo.
3. Capturas de Network de registro, inicio de sesión, consulta de turnos, creación de reserva y respuesta 401 anónima.
4. Resultado de `tests/api_smoke.py` ejecutado con base de pruebas.
5. Diagrama final de arquitectura y listado de endpoints, métodos, entradas, respuestas y códigos.
6. ZIP de la misma versión entregada, incluyendo el código y `database/schema.sql`.
