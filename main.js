/* =========================================================
   CanchaYa · main.js
   Interacciones compartidas, ficha de complejo y formulario de reserva
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  /* ---------- Menú (botón hamburguesa + nav) ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  const siteNav = document.getElementById("site-nav");

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
  const chipsServicios = (arr) => arr.map((s) => `<span class="service-chip">${NOMBRE_SERV[s]}</span>`).join("");

  const tablaComplejos = document.getElementById("tabla-complejos");
  if (tablaComplejos) {
    tablaComplejos.innerHTML = Object.entries(COMPLEJOS).map(([clave, c]) => `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.zona}</td>
        <td>${c.tipo}</td>
        <td>${c.servicios.map((s) => NOMBRE_SERV[s]).join(", ")}</td>
        <td>${pesos(c.precio)}</td>
        <td><a href="detalle.html?c=${clave}">Ver ficha</a></td>
      </tr>`).join("");
  }

  const cardsComplejos = document.getElementById("cards-complejos");
  if (cardsComplejos) {
    cardsComplejos.innerHTML = Object.entries(COMPLEJOS).map(([clave, c]) => `
      <li class="complex-card">
        <img class="complex-photo" src="images/${clave}.jpg" alt="Logo de ${c.nombre}">
        <div class="complex-body">
          <h3 class="complex-name">${c.nombre}</h3>
          <p class="complex-meta">${c.tipo}</p>
          <p class="complex-address">${c.dir}</p>
          <div class="complex-services">${chipsServicios(c.servicios)}</div>
          <p class="complex-price">Desde ${pesos(c.precio)} <span>la hora</span></p>
        </div>
        <a href="detalle.html?c=${clave}" class="btn btn-primary btn-sm">Ver ficha</a>
      </li>`).join("");
  }

  /* ---------- Ficha de complejo (detalle.html) ----------
     Arma la ficha de TODOS los complejos, una abajo de la otra.
     Si se llega con ?c=olimpo (botón "Ver ficha"), baja hasta ese complejo. */
  const fichasLista = document.getElementById("fichas-lista");

  if (fichasLista) {
    fichasLista.innerHTML = Object.entries(COMPLEJOS).map(([clave, c]) => `
      <article class="ficha-item" id="c-${clave}">
        <h3 class="ficha-nombre">${c.nombre}</h3>
        <div class="ficha">
          <img class="ficha-foto" src="images/${clave}.jpg" alt="Logo de ${c.nombre}" data-nombre="${c.nombre}">
          <div class="ficha-datos">
            <p class="ficha-dato"><strong>Dirección:</strong> ${c.dir}</p>
            <p class="ficha-dato"><strong>Zona:</strong> ${c.zona}</p>
            <p class="ficha-dato"><strong>Tipo de cancha:</strong> ${c.tipo}</p>
            <p class="ficha-dato"><strong>Precio:</strong> Desde ${pesos(c.precio)} la hora</p>
            <div class="complex-services">${chipsServicios(c.servicios)}</div>
            <a href="comprar.html?c=${clave}" class="btn btn-primary">Reservar <span class="arrow">→</span></a>
          </div>
        </div>
        <p class="section-text ficha-desc">${c.resumen}</p>
      </article>`).join("");

    fichasLista.querySelectorAll(".ficha-foto").forEach((img) => {
      img.addEventListener("error", () => { img.src = placeholder(img.dataset.nombre); }, { once: true });
      if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event("error"));
    });

    const foco = document.getElementById("c-" + claveComplejo(new URLSearchParams(location.search).get("c")));
    if (location.search && foco) foco.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Formulario de reserva (comprar.html) ----------
     Desde "Complejos disponibles" el botón lleva a comprar.html?c=terraza.
     Muestra solo ese complejo, su descripcion, sus servicios y el total. */
  const selComplejo = document.getElementById("complejo");

  if (selComplejo) {
    const DATOS = COMPLEJOS;
    const PRECIO_SERV = { parrilla: 3000, quincho: 8000, vestuarios: 0, estacionamiento: 0 };
    const descComplejo = (c) => `${c.nombre} — ${c.tipo}, ${c.dir}. ${c.resumen}`;

    selComplejo.innerHTML = Object.entries(COMPLEJOS)
      .map(([clave, c]) => `<option value="${clave}">${c.nombre} — ${c.tipo} — ${pesos(c.precio)}</option>`)
      .join("");

    const descEl  = document.getElementById("rv-desc");
    const tituloEl = document.getElementById("rv-titulo");
    const tipoSel = document.getElementById("rv-tipo");
    const servBox = document.getElementById("rv-serv-box");
    const servList = document.getElementById("rv-serv");
    const totalEl = document.getElementById("rv-total");

    // "Reservar La Terraza · Fútbol 7" segun complejo + tipo de cancha elegido
    const refrescarTitulo = () => {
      const c = DATOS[selComplejo.value];
      tituloEl.textContent = `Reservar ${c.nombre} · ${nombreTipo(tipoSel.value)}`;
    };
    tipoSel.addEventListener("change", refrescarTitulo);

    const SENA_PCT = 0.5;   // seña que se paga ahora para dejar reservado (la mitad)
    const cuponInput = document.getElementById("codigo-cupon");
    const mensajeCupon = document.getElementById("mensaje-cupon");
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
      totalEl.innerHTML =
        (cuponActivo
          ? `<span class="rv-subtotal">Subtotal: ${pesos(subtotal)}${desglose}</span>` +
            `<span class="rv-descuento">Cupón UCP10 (10%): -${pesos(descuento)}</span>`
          : "") +
        `Total: ${pesos(total)}${cuponActivo ? "" : desglose}` +
        `<span class="rv-sena">Seña para reservar (${Math.round(SENA_PCT * 100)}%): ${pesos(sena)}` +
        `<small>El resto (${pesos(total - sena)}) se paga en el complejo.</small></span>`;
      return { total, sena };
    };

    document.getElementById("aplicar-cupon").addEventListener("click", () => {
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
      tipoSel.innerHTML = c.tipos.split(" ")
        .map((t) => `<option value="${t}">${nombreTipo(t)}</option>`)
        .join("");
      refrescarTitulo();

      servList.innerHTML = "";
      if (c.servicios.length) {
        servBox.hidden = false;
        c.servicios.forEach((s) => {
          const p = PRECIO_SERV[s] || 0;
          const li = document.createElement("li");
          li.innerHTML = `<label><input type="checkbox" name="servicio" value="${s}" data-precio="${p}"> ` +
            `${NOMBRE_SERV[s]} — ${p ? "+" + pesos(p) : "incluido"}</label>`;
          li.querySelector("input").addEventListener("change", () => calcularTotal(c.precio));
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
