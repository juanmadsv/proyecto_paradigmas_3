# CanchaYa

Plataforma web para reservar canchas de fútbol (5, 7 y 11) en los complejos de Posadas, Misiones.
Sitio estático: buscador de complejos, reserva de turno con seña online, servicios extra
(parrilla, quincho, eventos, escuelita), medios de pago y preguntas frecuentes.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la página (una sola vista) |
| `home.css` | Estilos |
| `home.js` | Buscador/filtros y modal de reserva |
| `images/` | Logos de complejos, medios de pago, fondos |
| `images/_originales/` | Copias sin editar de los logos |

## Cómo verlo

No necesita servidor: abrí `index.html` en el navegador.
Para desarrollar: extensión **Live Server** de VS Code (recarga sola al guardar).
Necesita internet para las tipografías (Google Fonts: Chakra Petch e Inter).

Publicado con GitHub Pages en: https://angelinaalonso2006-collab.github.io/canchaya/

## Trabajar en equipo

```bash
git clone https://github.com/angelinaalonso2006-collab/canchaya.git
cd canchaya
git pull                       # traer lo ultimo antes de empezar
# editar index.html / home.css / home.js
git add -A
git commit -m "que cambie"
git push
```
