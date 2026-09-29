/* CanchaYa AE2 — Opción 3: catálogo asincrónico y filtro en vivo. */
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-buscar");
  if (!form) return;
  const texto = document.getElementById("buscar-texto");
  const zona = document.getElementById("zona");
  const tipos = document.querySelector(".toggle-group");
  const chips = document.querySelector(".filter-chips");
  const lista = document.getElementById("complejos-lista");
  const estado = document.querySelector(".search-status");
  const vacio = document.getElementById("no-results");
  const total = document.getElementById("results-count");
  let catalogo;
  try {
    const respuesta = await fetch("data/complejos.json");
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const datos = await respuesta.json();
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) throw new Error("JSON inválido");
    catalogo = Object.entries(datos);
  } catch (error) {
    estado.textContent = "No se pudo cargar el catálogo. Abrí el sitio con Apache de XAMPP y volvé a intentar.";
    estado.setAttribute("role", "alert");
    total.textContent = "Error de carga";
    console.error("Error al cargar el catálogo:", error);
    return;
  }
  const normalizar = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const servicio = { parrilla: "Parrilla", quincho: "Quincho", vestuarios: "Vestuarios", estacionamiento: "Estacionamiento" };
  const pesos = (n) => "$" + n.toLocaleString("es-AR");
  function actualizar() {
    const termino = normalizar(texto.value);
    const tipo = tipos.querySelector(".toggle-option.is-active")?.dataset.value || "5";
    const seleccion = [...chips.querySelectorAll(".filter-chip.is-active")];
    const servicios = seleccion.filter((b) => b.dataset.serv).map((b) => b.dataset.serv);
    const usos = seleccion.filter((b) => b.dataset.uso).map((b) => b.dataset.uso);
    const resultados = catalogo.filter(([, c]) =>
      (!termino || normalizar(`${c.nombre} ${c.zona} ${c.dir}`).includes(termino)) &&
      (!zona.value || c.zonaSlug === zona.value) &&
      c.tipos.split(" ").includes(tipo) &&
      servicios.every((s) => c.servicios.includes(s)) &&
      usos.every((u) => c.usos.split(" ").includes(u))
    );
    lista.innerHTML = resultados.map(([id, c]) => `
      <li class="complex-card">
        <img class="complex-photo" src="images/${id}.jpg" alt="Logo de ${c.nombre}">
        <div class="complex-body">
          <h3 class="complex-name">${c.nombre}</h3>
          <p class="complex-meta">${c.tipo}</p>
          <p class="complex-address">${c.dir}</p>
          <div class="complex-services">${c.servicios.map((s) => `<span class="service-chip">${servicio[s]}</span>`).join("")}</div>
          <p class="complex-price">Desde ${pesos(c.precio)} <span>la hora</span></p>
        </div>
        <div class="complex-actions">
          <a href="detalle.html?c=${encodeURIComponent(id)}" class="btn btn-secondary btn-sm">Ver ficha</a>
          <a href="comprar.html?c=${encodeURIComponent(id)}" class="btn btn-primary btn-sm">Reservar cancha</a>
        </div>
      </li>`).join("");
    lista.querySelectorAll(".complex-photo").forEach((img) => {
      img.addEventListener("error", () => {
        const nombre = img.closest(".complex-card").querySelector(".complex-name").textContent;
        const letras = nombre.replace(/^(el|la)\s+/i, "").slice(0, 2).toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="100%" height="100%" fill="#12a150"/><text x="120" y="140" text-anchor="middle" font-family="Arial" font-size="90" fill="white">${letras}</text></svg>`;
        img.src = "data:image/svg+xml," + encodeURIComponent(svg);
      }, { once: true });
      if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event("error"));
    });
    vacio.hidden = resultados.length !== 0;
    total.textContent = `${resultados.length} ${resultados.length === 1 ? "complejo" : "complejos"}`;
    estado.textContent = `Mostrando ${resultados.length} de ${catalogo.length} complejos. Los resultados cambian al escribir o elegir filtros.`;
  }
  texto.addEventListener("input", actualizar);
  zona.addEventListener("change", actualizar);
  tipos.addEventListener("click", (e) => {
    const boton = e.target.closest(".toggle-option");
    if (!boton) return;
    tipos.querySelectorAll(".toggle-option").forEach((b) => {
      b.classList.toggle("is-active", b === boton);
      b.setAttribute("aria-pressed", String(b === boton));
    });
    actualizar();
  });
  chips.addEventListener("click", (e) => {
    const boton = e.target.closest(".filter-chip");
    if (!boton) return;
    boton.setAttribute("aria-pressed", String(boton.classList.toggle("is-active")));
    actualizar();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    actualizar();
    document.getElementById("complejos").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actualizar();
});

/* Opción 5: calculadora independiente de presupuestos. */
/* =========================================================
   CanchaYa · app.js
   Calculadora de tarifas, presupuestos y descuentos (comprar.html).
   Reto: fetch() + async/await para traer la tabla de precios/descuentos
   desde tarifas.json, y addEventListener('change', ...) para recalcular
   el presupuesto sin usar atributos onclick/onsubmit en el HTML.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const form     = document.getElementById("form-calculadora");
  if (!form) return; // esta página no tiene la calculadora

  const tipoSel  = document.getElementById("calc-tipo");
  const horasSel = document.getElementById("calc-horas");
  const servList = document.getElementById("calc-servicios");
  const totalEl  = document.getElementById("calc-total");

  const pesos = (n) => "$" + Math.round(n).toLocaleString("es-AR");

  let TARIFAS = null; // tabla de precios/descuentos traída de tarifas.json

  // Reglas ordenadas de mayor a menor umbral en el JSON: la primera que
  // cumple el valor actual es el mejor descuento disponible.
  const mejorDescuento = (reglas, valor, campo) =>
    reglas.find((regla) => valor >= regla[campo]) || null;

  const calcularPresupuesto = () => {
    if (!TARIFAS) return;

    const tipo  = TARIFAS.tiposCancha.find((t) => t.valor === tipoSel.value) || TARIFAS.tiposCancha[0];
    const horas = Number(horasSel.value);

    const precioHora     = TARIFAS.precioBaseHora + tipo.recargo;
    const subtotalCancha = precioHora * horas;
    const descHoras       = mejorDescuento(TARIFAS.descuentosPorHoras, horas, "minHoras");
    const rebajaHoras      = descHoras ? subtotalCancha * descHoras.descuento : 0;

    const marcados          = Array.from(servList.querySelectorAll("input:checked"));
    const subtotalServicios = marcados.reduce((acc, chk) => acc + Number(chk.dataset.precio), 0);
    const descServicios      = mejorDescuento(TARIFAS.descuentosPorServicios, marcados.length, "minServicios");
    const rebajaServicios     = descServicios ? subtotalServicios * descServicios.descuento : 0;

    const total = (subtotalCancha - rebajaHoras) + (subtotalServicios - rebajaServicios);
    const sena  = total * TARIFAS.senaPorc;

    const descuentos = [descHoras?.etiqueta, descServicios?.etiqueta].filter(Boolean);

    totalEl.innerHTML =
      `Presupuesto: ${pesos(total)}` +
      `<small>${pesos(precioHora)} x ${horas} h de cancha${subtotalServicios ? ` + ${pesos(subtotalServicios)} de servicios` : ""}</small>` +
      (descuentos.length ? `<small class="calc-desc">Descuentos aplicados: ${descuentos.join(" · ")}</small>` : "") +
      `<span class="rv-sena">Seña sugerida (${Math.round(TARIFAS.senaPorc * 100)}%): ${pesos(sena)}` +
      `<small>El resto (${pesos(total - sena)}) se paga en el complejo.</small></span>`;
  };

  const renderOpciones = () => {
    tipoSel.innerHTML = TARIFAS.tiposCancha
      .map((t) => `<option value="${t.valor}">${t.nombre}${t.recargo ? ` (+${pesos(t.recargo)} la hora)` : ""}</option>`)
      .join("");

    servList.innerHTML = TARIFAS.servicios
      .map((s) => `
        <li><label>
          <input type="checkbox" name="calc-servicio" value="${s.valor}" data-precio="${s.precio}">
          ${s.nombre} — ${pesos(s.precio)}
        </label></li>`)
      .join("");
  };

  const cargarTarifas = async () => {
    try {
      const resp = await fetch("tarifas.json");
      if (!resp.ok) throw new Error(`No se pudo leer tarifas.json (${resp.status})`);
      TARIFAS = await resp.json();
      renderOpciones();
      calcularPresupuesto();
    } catch (err) {
      totalEl.textContent = "No se pudieron cargar las tarifas. Probá abrir el sitio con Apache de XAMPP.";
      console.error(err);
    }
  };

  // Desacoplado: un único listener de 'change' delegado en el form,
  // sin onclick/onsubmit en el HTML. Cubre tipo de cancha, cantidad
  // de horas y cada checkbox de servicio.
  form.addEventListener("change", (e) => {
    if (e.target.closest("#calc-tipo, #calc-horas, #calc-servicios")) {
      calcularPresupuesto();
    }
  });

  form.addEventListener("submit", (e) => e.preventDefault());
  cargarTarifas();

});

/* Opción 10: servicios con herencia y reserva simulada. */
class ServicioJSON {
  constructor(url) {
    this.url = url;
  }

  // Pide el archivo al servidor y devuelve los datos ya convertidos
  async pedir() {
    const respuesta = await fetch(this.url);
    if (!respuesta.ok) {
      throw new Error("Error HTTP " + respuesta.status);
    }
    return await respuesta.json();
  }
}

// Horarios de cada complejo (hereda "pedir" de ServicioJSON)
class ServicioTurnos extends ServicioJSON {
  constructor() {
    super("data/turnos.json");   // le pasa la url a la clase madre
    this.turnos = null;          // acá se guardan después del primer pedido
  }

  // Devuelve los horarios de un complejo. El archivo se pide una sola vez.
  async horariosDe(complejo) {
    if (this.turnos === null) {
      this.carga ||= this.pedir();
      const datos = await this.carga;
      this.turnos = datos.turnos;
    }
    return this.turnos[complejo] || [];
  }

  // Cuando alguien reserva, ese horario deja de estar libre
  marcarOcupado(complejo, hora) {
    const turno = this.turnos[complejo].find((t) => t.hora === hora);
    turno.libre = false;
  }
}

// Confirmación de reservas (también hereda "pedir" de ServicioJSON)
class ServicioReservas extends ServicioJSON {
  constructor() {
    super("data/reserva-respuesta.json");
  }

  // Con un servidor real acá se enviarían los datos (POST).
  // Como es un sitio estático, el .json hace de respuesta del servidor.
  async confirmar() {
    const respuesta = await this.pedir();
    if (!respuesta.ok) {
      throw new Error(respuesta.mensaje);
    }
    return respuesta.mensaje;
  }
}


function iniciarReservaHorarios({selComplejo, DATOS, tituloEl, tipoSel, calcularTotal, nombreTipo, pesos}) {
    let pendiente = false;
    const horaSel   = document.getElementById("rv-horario");
    const estadoEl  = document.getElementById("rv-estado");
    const confirmEl = document.getElementById("rv-confirm");
    const formRes   = document.getElementById("form-reserva");

    // "Reservar La Terraza · Fútbol 7 · 20:00 h" segun complejo + tipo + horario
    const refrescarTitulo = () => {
      const c = DATOS[selComplejo.value];
      const hora = horaSel.value ? ` · ${horaSel.value} h` : "";
      tituloEl.textContent = `Reservar ${c.nombre} · ${nombreTipo(tipoSel.value)}${hora}`;
    };
    tipoSel.addEventListener("change", refrescarTitulo);
    horaSel.addEventListener("change", refrescarTitulo);

    /* ---------- Horarios disponibles ---------- */
    const servicioTurnos   = new ServicioTurnos();
    const servicioReservas = new ServicioReservas();

    // Texto chico debajo del select: "2 de 6 horarios libres hoy"
    const mostrarEstado = (texto, tipo) => {
      estadoEl.textContent = texto;
      estadoEl.className = "rv-estado is-" + tipo;
    };

    // Arma el <select> de horarios: los ocupados quedan deshabilitados
    const llenarSelectHorarios = (horarios) => {
      let opciones = `<option value="">Elegí un horario</option>`;
      horarios.forEach((turno) => {
        if (turno.libre) {
          opciones += `<option value="${turno.hora}">${turno.hora} h — libre</option>`;
        } else {
          opciones += `<option value="${turno.hora}" disabled>${turno.hora} h — ocupado</option>`;
        }
      });
      horaSel.innerHTML = opciones;
    };

    const mostrarHorarios = async (complejo) => {
      horaSel.innerHTML = `<option value="">Cargando horarios...</option>`;
      horaSel.disabled = true;

      let horarios;
      try {
        horarios = await servicioTurnos.horariosDe(complejo);
      } catch (error) {
        if (selComplejo.value !== complejo) return;
        horaSel.innerHTML = `<option value="">No disponible</option>`;
        mostrarEstado("No se pudieron cargar los horarios. Abrí el sitio con Apache de XAMPP.", "error");
        return;
      }

      // Si mientras esperábamos el usuario cambió de complejo, no mostramos esto
      if (selComplejo.value !== complejo) return;

      const libres = horarios.filter((turno) => turno.libre);

      if (libres.length === 0) {
        horaSel.innerHTML = `<option value="">Sin horarios libres hoy</option>`;
        mostrarEstado("Sin horarios libres hoy. Probá con otro complejo.", "full");
      } else {
        llenarSelectHorarios(horarios);
        horaSel.disabled = false;
        mostrarEstado(`${libres.length} de ${horarios.length} horarios libres hoy`, "ok");
      }
      refrescarTitulo();
    };

    /* ---------- Confirmar reserva ---------- */

    // Evita que un nombre con "<" o ">" se interprete como HTML
    const sinHtml = (texto) => texto.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    // "luis sanches" -> "Luis Sanches"
    const conMayusculas = (texto) => texto
      .split(" ")
      .filter((palabra) => palabra !== "")
      .map((palabra) => palabra[0].toUpperCase() + palabra.slice(1).toLowerCase())
      .join(" ");

    // Muestra la tarjeta de abajo del formulario (verde si salió bien, roja si no)
    const mostrarMensaje = (html, tipo) => {
      confirmEl.innerHTML = html;
      confirmEl.className = "rv-confirm is-" + tipo;
      confirmEl.hidden = false;
      confirmEl.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // Devuelve la lista de lo que falta completar (vacía si está todo)
    const camposFaltantes = (hora, nombre, telefono) => {
      const faltan = [];
      if (hora === "") faltan.push("un horario");
      if (nombre === "") faltan.push("tu nombre");
      if (telefono === "") faltan.push("un teléfono");
      return faltan;
    };

    formRes.addEventListener("submit", async (e) => {
      e.preventDefault();   // que no se recargue la página

      // 1. Leer los datos (.trim() saca los espacios de los costados)
      const complejo = selComplejo.value;
      const hora     = horaSel.value;
      const nombre   = conMayusculas(document.getElementById("nombre").value.trim());
      const telefono = document.getElementById("telefono").value.trim();

      if (pendiente) return;
      // 2. Validar
      const faltan = camposFaltantes(hora, nombre, telefono);
      if (faltan.length > 0) {
        mostrarMensaje(`<p>Para reservar falta completar: <strong>${faltan.join(", ")}</strong>.</p>`, "error");
        return;
      }

      const turno = servicioTurnos.turnos?.[complejo]?.find((t) => t.hora === hora);
      if (!turno?.libre) {
        mostrarMensaje("<p>Elegí un horario disponible.</p>", "error");
        return;
      }
      pendiente = true;
      const boton = formRes.querySelector("button[type=submit]");
      boton.disabled = true;
      boton.textContent = "Confirmando...";
      const controles = [...formRes.elements].map((el) => [el, el.disabled]);
      controles.forEach(([el]) => { el.disabled = true; });

      try {
        // 3. "Enviar" la reserva al servidor
        const mensaje = await servicioReservas.confirmar();

        // 4. Ese horario ya no está libre
        servicioTurnos.marcarOcupado(complejo, hora);

        // 5. Mostrar el resumen
        const c = DATOS[complejo];
        const { total, sena } = calcularTotal(c.precio);
        const codigo = "CY-" + Math.floor(1000 + Math.random() * 9000);

        mostrarMensaje(`
          <h3>¡Listo, ${sinHtml(nombre)}! Tu cancha está reservada</h3>
          <p>${sinHtml(mensaje)}</p>
          <dl>
            <dt>Código</dt>   <dd>${codigo}</dd>
            <dt>Complejo</dt> <dd>${c.nombre} · ${c.dir}</dd>
            <dt>Cancha</dt>   <dd>${nombreTipo(tipoSel.value)}</dd>
            <dt>Horario</dt>  <dd>Hoy, ${hora} h</dd>
            <dt>Total</dt>    <dd>${pesos(total)} (seña ${pesos(sena)})</dd>
          </dl>`, "ok");

        // 6. Volver a dibujar los horarios (el reservado ahora sale "ocupado")
        await mostrarHorarios(complejo);
      } catch (error) {
        mostrarMensaje("<p>No pudimos confirmar la reserva. Probá de nuevo en unos minutos.</p>", "error");
      } finally {
        pendiente = false;
        controles.forEach(([el, disabled]) => { el.disabled = disabled; });
        boton.disabled = false;
        boton.textContent = "Confirmar reserva";
      }
    });


    selComplejo.addEventListener("change", () => mostrarHorarios(selComplejo.value));
    mostrarHorarios(selComplejo.value);
}
