/* =========================================================
   CanchaYa · main.js
   Interacciones compartidas, ficha de complejo y formulario de reserva
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  /* ---------- Menú (botón hamburguesa + nav) ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  const siteNav = document.querySelector("#site-nav");

  const setMenu = (abierto) => {
    menuBtn.setAttribute("aria-expanded", String(abierto));
    menuBtn.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    siteNav.classList.toggle("is-open", abierto);
  };

  if (menuBtn && siteNav) {
    menuBtn.addEventListener("click", () => {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });

    siteNav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".site-header")) setMenu(false);
    });
  }

  /* ---------- Helpers compartidos ---------- */
  const nombreTipo = (v) => ({ "5": "Fútbol 5", "7": "Fútbol 7", "11": "Fútbol 11" }[v] || "Fútbol 5");

  const pesos = (n) => "$" + n.toLocaleString("es-AR");
  const NOMBRE_SERV = { parrilla: "Parrilla", quincho: "Quincho", vestuarios: "Vestuarios", estacionamiento: "Estacionamiento" };

  /* Los listados, fichas y reservas usan el mismo JSON que el buscador. */
  if (!document.querySelector("#tabla-complejos, #cards-complejos, #fichas-lista, #complejo")) return;
  let COMPLEJOS;
  try {
    const respuesta = await fetch("data/complejos.json");
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    COMPLEJOS = await respuesta.json();
    if (!COMPLEJOS || typeof COMPLEJOS !== "object" || Array.isArray(COMPLEJOS)) throw new Error("JSON inválido");
  } catch (error) {
    const aviso = document.createElement("p");
    aviso.className = "no-results";
    aviso.setAttribute("role", "alert");
    aviso.textContent = "No se pudo cargar el catálogo. Abrí el sitio con Apache de XAMPP y volvé a intentar.";
    document.querySelector("main")?.prepend(aviso);
    console.error("Error al cargar el catálogo:", error);
    return;
  }

  const claveComplejo = (valor) => (COMPLEJOS[valor] ? valor : "terraza");

  /* ---------- Placeholder circular para logos que todavía no existen ---------- */
  const iniciales = (nombre) => {
    const stop = new Set(["el", "la", "los", "las", "de", "del", "complejo", "deportivo"]);
    let w = nombre.trim().split(/\s+/)
      .filter((x) => !stop.has(x.toLowerCase()))
      .filter((x) => !/^(f[uú]tbol|5|7|11)$/i.test(x));
    if (w.length === 0) w = nombre.trim().split(/\s+/);
    if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
    return (w[0][0] + w[1][0]).toUpperCase();
  };

  const placeholder = (nombre) => {
    const txt = iniciales(nombre) || "CY";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
        <rect width="240" height="240" fill="#12a150"/>
        <text x="120" y="132" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif"
              font-size="104" font-weight="800" fill="#ffffff">${txt}</text>
      </svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg.trim());
  };

  /* ---------- Listados armados desde COMPLEJOS ---------- */
  const crearNodo = (etiqueta, clase = "", texto = "") => {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    nodo.textContent = texto;
    return nodo;
  };

  const chipsServicios = (arr) => {
    const caja = crearNodo("div", "complex-services");
    arr.forEach((servicio) => {
      if (NOMBRE_SERV[servicio]) caja.appendChild(crearNodo("span", "service-chip", NOMBRE_SERV[servicio]));
    });
    return caja;
  };

  const tablaComplejos = document.querySelector("#tabla-complejos");
  if (tablaComplejos) {
    const filas = document.createDocumentFragment();
    Object.entries(COMPLEJOS).forEach(([clave, c]) => {
      const fila = document.createElement("tr");
      [c.nombre, c.zona, c.tipo, c.servicios.map((s) => NOMBRE_SERV[s]).filter(Boolean).join(", "), pesos(c.precio)].forEach((valor) => {
        fila.appendChild(crearNodo("td", "", String(valor)));
      });
      const celda = document.createElement("td");
      const enlace = crearNodo("a", "", "Ver ficha");
      enlace.href = "detalle.html?c=" + encodeURIComponent(clave);
      celda.appendChild(enlace);
      fila.appendChild(celda);
      filas.appendChild(fila);
    });
    tablaComplejos.replaceChildren(filas);
  }

  const cardsComplejos = document.querySelector("#cards-complejos");
  if (cardsComplejos) {
    const tarjetas = document.createDocumentFragment();
    Object.entries(COMPLEJOS).forEach(([clave, c]) => {
      const tarjeta = crearNodo("li", "complex-card");
      const imagen = crearNodo("img", "complex-photo");
      imagen.src = "images/" + encodeURIComponent(clave) + ".jpg";
      imagen.alt = "Logo de " + c.nombre;
      const cuerpo = crearNodo("div", "complex-body");
      cuerpo.append(
        crearNodo("h3", "complex-name", c.nombre),
        crearNodo("p", "complex-meta", c.tipo),
        crearNodo("p", "complex-address", c.dir),
        chipsServicios(c.servicios)
      );
      const precio = crearNodo("p", "complex-price");
      precio.append(document.createTextNode("Desde " + pesos(c.precio) + " "));
      precio.appendChild(crearNodo("span", "", "la hora"));
      cuerpo.appendChild(precio);
      const enlace = crearNodo("a", "btn btn-primary btn-sm", "Ver ficha");
      enlace.href = "detalle.html?c=" + encodeURIComponent(clave);
      tarjeta.append(imagen, cuerpo, enlace);
      tarjetas.appendChild(tarjeta);
    });
    cardsComplejos.replaceChildren(tarjetas);
  }


  /* ---------- Ficha de complejo (detalle.html) ----------
     Arma las fichas desde datos del catálogo usando nodos de texto seguros. */
  const fichasLista = document.querySelector("#fichas-lista");
  if (fichasLista) {
    const fichas = document.createDocumentFragment();
    Object.entries(COMPLEJOS).forEach(([clave, c]) => {
      const ficha = crearNodo("article", "ficha-item");
      ficha.id = "c-" + clave;
      ficha.appendChild(crearNodo("h3", "ficha-nombre", c.nombre));
      const datos = crearNodo("div", "ficha");
      const imagen = crearNodo("img", "ficha-foto");
      imagen.src = "images/" + encodeURIComponent(clave) + ".jpg";
      imagen.alt = "Logo de " + c.nombre;
      imagen.dataset.nombre = c.nombre;
      imagen.addEventListener("error", () => { imagen.src = placeholder(imagen.dataset.nombre); }, { once: true });
      if (imagen.complete && imagen.naturalWidth === 0) imagen.dispatchEvent(new Event("error"));
      const informacion = crearNodo("div", "ficha-datos");
      const agregarDato = (etiqueta, valor) => {
        const parrafo = crearNodo("p", "ficha-dato");
        parrafo.append(crearNodo("strong", "", etiqueta + ":"), document.createTextNode(" " + valor));
        informacion.appendChild(parrafo);
      };
      agregarDato("Dirección", c.dir);
      agregarDato("Zona", c.zona);
      agregarDato("Tipo de cancha", c.tipo);
      agregarDato("Precio", "Desde " + pesos(c.precio) + " la hora");
      informacion.appendChild(chipsServicios(c.servicios));
      const reservar = crearNodo("a", "btn btn-primary", "Reservar");
      reservar.href = "comprar.html?c=" + encodeURIComponent(clave);
      reservar.appendChild(crearNodo("span", "arrow", "→"));
      informacion.appendChild(reservar);
      datos.append(imagen, informacion);
      ficha.append(datos, crearNodo("p", "section-text ficha-desc", c.resumen));
      fichas.appendChild(ficha);
    });
    fichasLista.replaceChildren(fichas);
    const foco = document.querySelector("#c-" + claveComplejo(new URLSearchParams(location.search).get("c")));
    if (location.search && foco) foco.scrollIntoView({ behavior: "smooth", block: "start" });
  }


  /* ---------- Formulario de reserva (comprar.html) ----------
     Desde "Complejos disponibles" el botón lleva a comprar.html?c=terraza.
     Muestra solo ese complejo, su descripcion, sus servicios y el total. */
  const selComplejo = document.querySelector("#complejo");

  if (selComplejo) {
    const DATOS = COMPLEJOS;
    const PRECIO_SERV = { parrilla: 3000, quincho: 8000, vestuarios: 0, estacionamiento: 0 };
    const descComplejo = (c) => `${c.nombre} — ${c.tipo}, ${c.dir}. ${c.resumen}`;

    selComplejo.replaceChildren(...Object.entries(COMPLEJOS).map(([clave, c]) => {
      const opcion = document.createElement("option");
      opcion.value = clave;
      opcion.textContent = c.nombre + " — " + c.tipo + " — " + pesos(c.precio);
      return opcion;
    }));

        const descEl  = document.querySelector("#rv-desc");
    const tituloEl = document.querySelector("#rv-titulo");
    const tipoSel = document.querySelector("#rv-tipo");
    const servBox = document.querySelector("#rv-serv-box");
    const servList = document.querySelector("#rv-serv");
    const totalEl = document.querySelector("#rv-total");

    // "Reservar La Terraza · Fútbol 7" segun complejo + tipo de cancha elegido
    const refrescarTitulo = () => {
      const c = DATOS[selComplejo.value];
      tituloEl.textContent = `Reservar ${c.nombre} · ${nombreTipo(tipoSel.value)}`;
    };
    tipoSel.addEventListener("change", refrescarTitulo);

    const SENA_PCT = 0.20;   // seña que se paga ahora para dejar reservado (la mitad)
    const cuponInput = document.querySelector("#codigo-cupon");
    const mensajeCupon = document.querySelector("#mensaje-cupon");
    let cuponActivo = false;

    const calcularTotal = (base) => {
      let extra = 0;
      servList.querySelectorAll("input:checked").forEach((c) => { extra += Number(c.dataset.precio); });
      const subtotal = base + extra;
      const descuento = cuponActivo ? Math.round(subtotal * 0.10) : 0;
      const total = subtotal - descuento;
      const sena = Math.round(total * SENA_PCT);
      totalEl.dataset.total = total;
      totalEl.dataset.sena = sena;
      const desglose = extra ? ` (${pesos(base)} cancha + ${pesos(extra)} servicios)` : " la hora";
      const resumen = [];
      if (cuponActivo) {
        const subtotalEl = crearNodo("span", "rv-subtotal", "Subtotal: " + pesos(subtotal) + desglose);
        const descuentoEl = crearNodo("span", "rv-descuento", "Cupón UCP10 (10%): -" + pesos(descuento));
        resumen.push(subtotalEl, descuentoEl);
      }
      resumen.push(document.createTextNode("Total: " + pesos(total) + (cuponActivo ? "" : desglose)));
      const senaEl = crearNodo("span", "rv-sena", "Seña para reservar (" + Math.round(SENA_PCT * 100) + "%): " + pesos(sena));
      senaEl.appendChild(crearNodo("small", "", "El resto (" + pesos(total - sena) + ") se paga en el complejo."));
      resumen.push(senaEl);
      totalEl.replaceChildren(...resumen);
      return { total, sena };
    };

    document.querySelector("#aplicar-cupon").addEventListener("click", () => {
      const codigo = cuponInput.value.trim().toUpperCase();
      cuponActivo = codigo === "UCP10";
      if (!codigo) {
        mensajeCupon.textContent = "Por favor, ingresá un código.";
        mensajeCupon.className = "coupon-feedback mensaje-error";
      } else if (cuponActivo) {
        mensajeCupon.textContent = "¡Cupón aplicado! Tenés un 10% de descuento.";
        mensajeCupon.className = "coupon-feedback mensaje-exito";
      } else {
        mensajeCupon.textContent = "Código inválido o vencido.";
        mensajeCupon.className = "coupon-feedback mensaje-error";
      }
      calcularTotal(DATOS[selComplejo.value].precio);
    });

    cuponInput.addEventListener("input", () => {
      if (cuponActivo) {
        cuponActivo = false;
        calcularTotal(DATOS[selComplejo.value].precio);
      }
      mensajeCupon.textContent = "";
      mensajeCupon.className = "coupon-feedback";
    });

    const mostrarComplejo = (clave) => {
      const c = DATOS[clave];
      if (!c) return;
      descEl.textContent = descComplejo(c);

      // opciones de tipo de cancha segun lo que ofrece este complejo (5 / 7 / 11)
      tipoSel.replaceChildren(...c.tipos.split(" ").map((tipo) => {
        const opcion = document.createElement("option");
        opcion.value = tipo;
        opcion.textContent = nombreTipo(tipo);
        return opcion;
      }));
      refrescarTitulo();

      servList.replaceChildren();
      if (c.servicios.length) {
        servBox.hidden = false;
        c.servicios.forEach((s) => {
          if (!NOMBRE_SERV[s]) return;
          const precio = PRECIO_SERV[s] || 0;
          const li = document.createElement("li");
          const label = document.createElement("label");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.name = "servicio";
          input.value = s;
          input.dataset.precio = String(precio);
          input.addEventListener("change", () => calcularTotal(c.precio));
          label.append(input, document.createTextNode(" " + NOMBRE_SERV[s] + " — " + (precio ? "+" + pesos(precio) : "incluido")));
          li.appendChild(label);
          servList.appendChild(li);
        });
      } else {
        servBox.hidden = true;
      }
      calcularTotal(c.precio);
    };

    // Si viene ?c=terraza, dejar ese elegido
    const desdeUrl = new URLSearchParams(window.location.search).get("c");
    if (desdeUrl && DATOS[desdeUrl]) selComplejo.value = desdeUrl;

    selComplejo.addEventListener("change", () => mostrarComplejo(selComplejo.value));
    mostrarComplejo(selComplejo.value);
    iniciarReservaHorarios({selComplejo, DATOS, tituloEl, tipoSel, calcularTotal, nombreTipo, pesos});
  }

});
