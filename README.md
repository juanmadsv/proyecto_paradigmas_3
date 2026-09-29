# CanchaYa — Paradigmas III

Sitio estático para consultar complejos de Posadas y simular reservas.

## Ejecutar con XAMPP

Colocar el proyecto en `htdocs/canchaYaFrontend`, iniciar Apache y abrir
`http://localhost/canchaYaFrontend/`. Se necesita HTTP para las consultas `fetch()`.

## Funcionalidades integradas

| Opción | Funcionalidad | Archivos |
| --- | --- | --- |
| 3 | Catálogo JSON y búsqueda en vivo | `app.js`, `data/complejos.json` |
| 5 | Calculadora de presupuesto, descuentos por horas y servicios | `app.js`, `tarifas.json`, `comprar.html` |
| 10 | Horarios libres/ocupados y confirmación simulada | `app.js`, `data/turnos.json`, `data/reserva-respuesta.json` |
| Cupón | UCP10: 10 % sobre cancha y servicios de la reserva | `main.js`, `comprar.html` |

La calculadora es una estimación independiente. Sus tarifas y descuentos no
modifican la reserva. El cupón se aplica al formulario de reserva y su resumen.

La reserva es una demostración: ocupa el turno en memoria hasta recargar;
no guarda datos en un servidor y no envía correos. Los horarios corresponden
al complejo en conjunto, sin separación por tipo de cancha ni fecha.

`main.js` carga el catálogo y luego inicializa los horarios definidos en `app.js`.
Cada módulo registra sus eventos una sola vez con `addEventListener()`.
Los recursos CSS y JavaScript incluyen una versión en su URL para evitar
mezclar archivos almacenados en caché con la integración actual.

## Fundamentaciones

- `AE2_Opcion3_SOHDM.md`
- `AE2_Opcion5_EORM.md`
- `AE2_Opcion10_SOHDM.md`
