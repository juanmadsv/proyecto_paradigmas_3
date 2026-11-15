# Contrato de la API JSON

Base local: `http://localhost/canchaYaFrontend/api/`. Todas las respuestas usan `Content-Type: application/json; charset=utf-8`, no se guardan en caché y devuelven errores JSON. Las operaciones de escritura requieren `Content-Type: application/json` y `X-CSRF-Token`, obtenido desde `GET csrf.php`.

## Endpoints

| Ruta y método | Entrada | Respuesta correcta | Errores principales |
| --- | --- | --- | --- |
| `GET csrf.php` | Ninguna | 200: `{ "csrf_token": "..." }` | 405 método no permitido; 500 error del servidor |
| `POST registro.php` | `nombre`, `email`, `password` | 201: cuenta creada | 400 datos inválidos/JSON inválido; 403 CSRF; 409 email existente; 413 cuerpo mayor a 16 KB; 415 tipo de contenido; 500 error genérico |
| `POST login.php` | `email`, `password` | 200: `usuario` y nuevo `csrf_token` | 401 credenciales inválidas; 403 CSRF; 400 JSON inválido; 413 cuerpo demasiado grande; 415 tipo de contenido; 500 error genérico |
| `POST logout.php` | Objeto JSON vacío | 200: sesión cerrada | 403 CSRF; 405 método; 415 contenido; 500 error genérico |
| `GET turnos.php?fecha=YYYY-MM-DD` | Fecha opcional; predeterminada hoy | 200: fecha y lista de turnos por complejo, con marca `libre`; excluye reservas tomadas y horarios pasados | 400 fecha inválida o fuera de hoy–90 días; 405 método; 500 error genérico |
| `GET mis_reservas.php` | Cookie de sesión | 200: usuario autenticado, reservas propias y token CSRF | 401 sin sesión o sesión vencida; 405 método; 500 error genérico |
| `POST mis_reservas.php` | `complejo`, `tipo`, `fecha`, `horario`, `telefono`, `pago`, `servicios[]`, `cupon` opcional | 201: reserva creada, total y seña | 400 datos inválidos; 401 sin sesión; 403 CSRF; 409 turno ocupado o pasado; 413 cuerpo demasiado grande; 415 tipo de contenido; 500 error genérico |
| `DELETE mis_reservas.php` | `reserva_id` | 200: reserva cancelada | 400 ID inválido; 401 sin sesión; 403 CSRF; 409 no existe/no pertenece/faltan menos de 24 horas; 413 cuerpo demasiado grande; 415 tipo de contenido; 500 error genérico |

## Ejemplo: creación de reserva

```http
POST /canchaYaFrontend/api/mis_reservas.php
Content-Type: application/json
X-CSRF-Token: <token-de-la-sesion>
```

```json
{
  "complejo": "terraza",
  "tipo": "5",
  "fecha": "AAAA-MM-DD",
  "horario": "20:00",
  "telefono": "3764000000",
  "pago": "mercadopago",
  "servicios": ["quincho"],
  "cupon": ""
}
```

El nombre del complejo y los turnos deben copiarse de los valores disponibles en `data/complejos.json` y `data/turnos.json`. Este ejemplo es ilustrativo: usar una fecha válida y un turno que la API informe libre.

## Reglas de contrato y seguridad

- La sesión identifica al usuario. El cliente no envía un `usuario_id` confiable.
- El servidor valida el catálogo, fecha, tipo, teléfono, servicios, cupón y disponibilidad; calcula total y seña sin aceptar precios calculados por el navegador.
- La seña se calcula al 20% del total. No representa una transacción ni prueba de pago.
- Cancelar requiere pertenencia de la reserva y un mínimo de 24 horas antes del turno. La cancelación no genera reintegro.
- Un conflicto de turno devuelve 409; una entrada inválida devuelve 400; una falta de sesión devuelve 401 y un token CSRF inválido 403.
- Los errores internos se registran en el servidor y el JSON devuelve un mensaje genérico, sin exponer SQL o credenciales.
- Para reproducir cambios sobre una base existente, aplicar las migraciones documentadas antes de probar la API.

La implementación fuente está en `api/`; el contrato debe mantenerse sincronizado con sus validaciones. La respuesta observada en el servidor y Network prevalece si el código cambia.
