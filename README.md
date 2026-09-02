# CanchaYa

Plataforma web para reservar canchas de fútbol (5, 7 y 11) en los complejos de
Posadas, Misiones. Cada "producto" es un complejo. Sitio estático: HTML + CSS
(+ un poco de JS para el menú y el buscador de la portada).

## Páginas

| Archivo | Qué es |
|---|---|
| `index.html` | Portada principal (hero, buscador, complejos, cómo funciona, servicios, pagos, FAQ) |
| `listado_tabla.html` | Todos los complejos en una tabla |
| `listado_box.html` | Todos los complejos en tarjetas |
| `detalle.html` | Ficha de un complejo (La Terraza) |
| `comprar.html` | Formulario de reserva: complejo elegido + descripción + servicios para sumar + nombre, teléfono, Gmail, dirección y tipo de pago |
| `estilos.css` | Estilos de todas las páginas (clases compartidas: `.site-header`, `.btn`, `.complex-card`, `.tabla`, `.field`, `.site-footer`) |
| `main.js` | Menú hamburguesa, buscador de la portada y armado del formulario de reserva |
| `images/` | Logos de complejos, medios de pago, fondos |
| `images/_originales/` | Copias sin editar de los logos |

Las 5 páginas comparten el mismo `estilos.css`, el mismo header (menú de 3 rayitas)
y el mismo footer.

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
# editar los .html / estilos.css / main.js
git add -A
git commit -m "que cambie"
git push
```
