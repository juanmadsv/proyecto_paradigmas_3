/* =========================================================
   CanchaYa · main.js
   Interacciones: menu, buscador, ficha de complejo y formulario de reserva
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

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

  /* ---------- Toggle: tipo de cancha ---------- */
  const toggleGroup = document.querySelector(".toggle-group");
  let tipoCancha = toggleGroup?.querySelector(".toggle-option.is-active")?.dataset.value || "5";

  if (toggleGroup) {
    toggleGroup.addEventListener("click", (e) => {
      const opcion = e.target.closest(".toggle-option");
      if (!opcion) return;

      toggleGroup.querySelectorAll(".toggle-option").forEach((b) => {
        b.classList.toggle("is-active", b === opcion);
        b.setAttribute("aria-pressed", String(b === opcion));
      });

      tipoCancha = opcion.dataset.value;
    });
  }

  /* ---------- Chips de servicios (multi-selección) ---------- */
  const chipsWrap = document.querySelector(".filter-chips");
  if (chipsWrap) {
    chipsWrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      const activo = chip.classList.toggle("is-active");
      chip.setAttribute("aria-pressed", String(activo));
    });
  }
  const chipsActivos = () => {
    const serv = [], usos = [];
    chipsWrap?.querySelectorAll(".filter-chip.is-active").forEach((c) => {
      if (c.dataset.serv) serv.push(c.dataset.serv);
      if (c.dataset.uso) usos.push(c.dataset.uso);
    });
    return { serv, usos };
  };

  /* ---------- Helpers compartidos ---------- */
  // "2026-08-30" -> "domingo, 30 de agosto"
  const formatearFecha = (valor) => {
    if (!valor) return "la fecha elegida";
    const [a, m, d] = valor.split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const nombreTipo = (v) => ({ "5": "Fútbol 5", "7": "Fútbol 7", "11": "Fútbol 11" }[v] || "Fútbol 5");

  const pesos = (n) => "$" + n.toLocaleString("es-AR");
  const NOMBRE_SERV = { parrilla: "Parrilla", quincho: "Quincho", vestuarios: "Vestuarios", estacionamiento: "Estacionamiento" };

  /* ---------- Datos de los complejos ----------
     Fuente unica: la usan la portada, la tabla, las tarjetas, la ficha y la reserva.
     zonaSlug / tipos / usos son los valores que filtra el buscador de la portada. */
  const COMPLEJOS = {
    terraza: { nombre: "La Terraza", zona: "Centro", zonaSlug: "centro", dir: "Av. Santa Catalina 4150",
      tipo: "Fútbol 5", tipos: "5", precio: 25000, servicios: ["parrilla", "quincho"], usos: "partido eventos",
      disp: { texto: "2 horarios libres hoy", estado: "open" },
      resumen: "Cancha de césped sintético con iluminación para jugar de noche. Tiene parrilla y quincho para quedarse después del partido." },
    rampla: { nombre: "La Rampla", zona: "Villa Cabello", zonaSlug: "a3", dir: "Pedro Morcillo 3326",
      tipo: "Fútbol 5", tipos: "5", precio: 27000, servicios: ["vestuarios"], usos: "partido",
      disp: { texto: "3 horarios libres hoy", estado: "open" },
      resumen: "Cancha techada con vestuarios. Ideal para partidos entre amigos sin depender del clima." },
    napoles: { nombre: "Nápoles", zona: "Itaembé Miní", zonaSlug: "itaembe-mini", dir: "Av. Quaranta 2912",
      tipo: "Fútbol 5", tipos: "5", precio: 28000, servicios: ["parrilla", "estacionamiento"], usos: "partido",
      disp: { texto: "Sin horarios libres hoy", estado: "full" },
      resumen: "Cancha con parrilla y estacionamiento propio. Fácil de llegar." },
    establo: { nombre: "El Establo Fútbol 5", zona: "Centro", zonaSlug: "centro", dir: "Santa Cruz 3436",
      tipo: "Fútbol 5 · 7", tipos: "5 7", precio: 27500, servicios: ["quincho", "parrilla"], usos: "partido eventos escuelita",
      disp: { texto: "2 horarios libres hoy", estado: "open" },
      resumen: "Complejo con quincho y parrilla. Sirve para partidos y para festejar cumpleaños." },
    potrero: { nombre: "El Potrero Fútbol 5", zona: "Itaembé Miní", zonaSlug: "itaembe-mini", dir: "3 de Febrero 2040",
      tipo: "Fútbol 5 · 7 · 11", tipos: "5 7 11", precio: 25000, servicios: ["estacionamiento"], usos: "partido escuelita torneos",
      disp: { texto: "4 horarios libres hoy", estado: "open" },
      resumen: "Complejo grande con estacionamiento. Se usa también para escuelita y torneos." },
    olimpo: { nombre: "El Olimpo Fútbol 5", zona: "Villa Sarita", zonaSlug: "villa-sarita", dir: "Av. Tomás Guido 4025",
      tipo: "Fútbol 5", tipos: "5", precio: 29000, servicios: ["parrilla", "quincho", "vestuarios"], usos: "partido eventos",
      disp: { texto: "Sin horarios libres hoy", estado: "full" },
      resumen: "Cancha con parrilla, quincho y vestuarios. El combo completo para el after." }
  };

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

  const portadaComplejos = document.getElementById("complejos-lista");
  if (portadaComplejos) {
    portadaComplejos.innerHTML = Object.entries(COMPLEJOS).map(([clave, c]) => `
      <li class="complex-card" data-zona="${c.zonaSlug}" data-tipo="${c.tipos}" data-servicios="${c.servicios.join(" ")}" data-usos="${c.usos}">
        <img class="complex-photo" src="images/${clave}.jpg" alt="Logo de ${c.nombre}">
        <div class="complex-body">
          <h3 class="complex-name">${c.nombre}</h3>
          <p class="complex-meta">${c.tipo}</p>
          <p class="complex-address">${c.dir}</p>
          <div class="complex-services">${chipsServicios(c.servicios)}</div>
          <p class="complex-price">Desde ${pesos(c.precio)} <span>la hora</span></p>
          <span class="availability availability-${c.disp.estado}">${c.disp.texto}</span>
        </div>
        <a href="comprar.html?c=${clave}" class="btn btn-primary btn-sm">Reservar cancha</a>
      </li>`).join("");

    const badge = document.getElementById("results-count");
    if (badge) badge.textContent = Object.keys(COMPLEJOS).length + " complejos";
  }

  document.querySelectorAll(".complex-photo").forEach((img) => {
    img.addEventListener("error", () => {
      const nombre = img.closest(".complex-card")?.querySelector(".complex-name")?.textContent || "CanchaYa";
      img.src = placeholder(nombre);
    }, { once: true });
    if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event("error"));
  });

  /* ---------- Buscador ---------- */
  const form       = document.getElementById("form-buscar");
  const status     = document.querySelector(".search-status");
  const resultados = document.getElementById("complejos");
  const cards      = Array.from(document.querySelectorAll(".complex-card"));
  const noResults  = document.getElementById("no-results");
  const countBadge = document.getElementById("results-count");

  const tiene = (attr, valores) => {
    const lista = (attr || "").split(" ");
    return valores.every((v) => lista.includes(v));
  };

  const filtrar = ({ zona, tipo, serv, usos }) => {
    let visibles = 0;

    cards.forEach((card) => {
      const zonaOk = !zona || card.dataset.zona === zona;
      const tipoOk = (card.dataset.tipo || "5").split(" ").includes(tipo);
      const servOk = tiene(card.dataset.servicios, serv);
      const usosOk = tiene(card.dataset.usos, usos);
      const mostrar = zonaOk && tipoOk && servOk && usosOk;
      card.hidden = !mostrar;
      if (mostrar) visibles++;
    });

    if (noResults) noResults.hidden = visibles > 0;
    if (countBadge) {
      countBadge.textContent = visibles === 1
        ? "1 complejo"
        : `${visibles} complejos`;
    }
    return visibles;
  };

  const nombreServicio = (s) => ({
    quincho: "quincho", parrilla: "parrilla", vestuarios: "vestuarios",
    estacionamiento: "estacionamiento", eventos: "eventos", escuelita: "escuelita",
  }[s] || s);

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const zonaSelect = document.getElementById("zona");
      const zona       = zonaSelect.value;
      const zonaTexto  = zonaSelect.options[zonaSelect.selectedIndex].text;
      const fecha      = document.getElementById("fecha").value;
      const { serv, usos } = chipsActivos();

      filtrar({ zona, tipo: tipoCancha, serv, usos });

      if (status) {
        const extras = [...serv, ...usos].map(nombreServicio);
        const conServicios = extras.length ? ` con <strong>${extras.join(" + ")}</strong>` : "";
        status.innerHTML =
          `Mostrando complejos de <strong>${nombreTipo(tipoCancha)}</strong>${conServicios} ` +
          `en <strong>${zonaTexto}</strong> para <strong>${formatearFecha(fecha)}</strong>`;
      }

      resultados?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

    const calcularTotal = (base) => {
      let extra = 0;
      servList.querySelectorAll("input:checked").forEach((c) => { extra += Number(c.dataset.precio); });
      const total = base + extra;
      const sena = Math.round(total * SENA_PCT);
      const desglose = extra ? ` (${pesos(base)} cancha + ${pesos(extra)} servicios)` : " la hora";
      totalEl.innerHTML =
        `Total: ${pesos(total)}${desglose}` +
        `<span class="rv-sena">Seña para reservar (${Math.round(SENA_PCT * 100)}%): ${pesos(sena)}` +
        `<small>El resto (${pesos(total - sena)}) se paga en el complejo.</small></span>`;
    };

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
  }

});
