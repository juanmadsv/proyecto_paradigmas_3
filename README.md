# CanchaYa

Plataforma web para reservar canchas de fútbol (5, 7 y 11) en los complejos de Posadas, Misiones.
Sitio estático: buscador de complejos, reserva de turno con seña online, servicios extra
(parrilla, quincho, eventos, escuelita), medios de pago y preguntas frecuentes.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la página (una sola vista) |
| `home.css` | Estilos |
| `home.js` | Buscador/filtros y modal de reserva |
| `images/` | Logos de complejos, medios de pago, fondos |
| `images/_originales/` | Copias sin editar de los logos |

## Cómo verlo

No necesita servidor: abrí `index.html` en el navegador.
Recomendado para desarrollar: extensión **Live Server** de VS Code (recarga sola al guardar).

Necesita internet para las tipografías (Google Fonts: Chakra Petch e Inter).

## Trabajar en equipo

```bash
git clone <URL-del-repo>
cd canchaYa
# editar index.html / home.css / home.js
git add -A
git commit -m "descripción del cambio"
git push
```
