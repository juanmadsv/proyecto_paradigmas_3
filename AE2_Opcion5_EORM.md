# Fundamentación U1 — Estructura EORM de la Tarifa/Promoción

- **E — Estructura (atributos).** Cada tarifa (`tarifasPorHoras`) y cada
  promoción (`descuentosPorServicios`) es un objeto con sus propios datos:
  `minHoras`/`minServicios` (umbral que la activa), `descuento`
  (porcentaje) y `etiqueta` (texto para mostrar). El tipo de cancha y
  cada servicio también son objetos con `valor`, `nombre` y `precio`/`recargo`.
- **O — Objetos.** `tarifas.json` es una colección de instancias de esos
  atributos (un array de tipos de cancha, uno de servicios, uno de
  descuentos por hora y uno de descuentos por servicios); `app.js` las
  carga en la variable `TARIFAS` y trabaja sobre esos objetos, nunca con
  números sueltos escritos en el código.
- **R — Relaciones.** La tarifa de cancha se relaciona con el tipo de
  cancha elegido (recargo) y con la cantidad de horas (multiplica y
  puede activar un descuento); el presupuesto de servicios se relaciona
  con los checkboxes tildados y con la cantidad de servicios elegidos
  (activa el descuento por combo). El presupuesto final es la suma de
  ambas partes ya con sus descuentos aplicados.
- **M — Métodos (comportamiento).** `cargarTarifas()` trae y guarda la
  tabla; `mejorDescuento()` busca, dado un valor (horas o cantidad de
  servicios), la promoción más conveniente que corresponda; y
  `calcularPresupuesto()` usa esos datos para recalcular el total y
  escribirlo en el DOM cada vez que cambia el tipo de cancha, la
  cantidad de horas o un servicio.

