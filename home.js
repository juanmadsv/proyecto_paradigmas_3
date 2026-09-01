/* =========================================================
   CanchaYa · home.js
   Interacciones de la home: menú, tipo de cancha, buscador y horarios
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

    window.matchMedia("(min-width: 900px)").addEventListener("change", (ev) => {
      if (ev.matches) setMenu(false);
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

  /* ---------- Modal de reserva (horarios + servicios) ---------- */
  const modal       = document.getElementById("modal-horarios");
  const modalTitle  = document.getElementById("modal-title");
  const modalSub    = document.getElementById("modal-sub");
  const modalGrid   = document.getElementById("modal-grid");
  const modalPick   = document.getElementById("modal-pick");
  const modalReserv = document.getElementById("modal-reservar");
  const modalClose  = document.getElementById("modal-close");
  const extrasBox   = document.getElementById("modal-extras");
  const extrasTitle = document.getElementById("modal-extras-title");
  const extrasList  = document.getElementById("modal-extras-list");
  const totalEl     = document.getElementById("modal-total");

  const HORARIOS = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

  const PRECIO_SERVICIO = { parrilla: 3000, quincho: 8000, vestuarios: 0, estacionamiento: 0 };
  const LABEL_SERVICIO  = { parrilla: "Parrilla", quincho: "Quincho", vestuarios: "Vestuarios", estacionamiento: "Estacionamiento" };
  const pesos = (n) => "$" + n.toLocaleString("es-AR");

  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  };

  const horariosDe = (card) => {
    const badge = card.querySelector(".availability");
    const lleno = badge?.classList.contains("availability-full");
    const n = badge?.textContent.match(/\d+/);
    let libres = lleno ? 0 : (n ? Number(n[0]) : 2);
    libres = Math.min(libres, HORARIOS.length);
    const inicio = hash(card.querySelector(".complex-name").textContent.trim()) % HORARIOS.length;
    const setLibres = new Set();
    for (let k = 0; k < libres; k++) setLibres.add((inicio + k * 2) % HORARIOS.length);
    return HORARIOS.map((hora, i) => ({ hora, libre: setLibres.has(i) }));
  };

  let turnoElegido = null;
  let precioBase = 0;

  const extrasSeleccionados = () => [...extrasList.querySelectorAll("input:checked")];
  const totalExtra = () => extrasSeleccionados().reduce((s, c) => s + Number(c.dataset.precio), 0);

  const actualizarTotal = () => {
    const extra = totalExtra();
    const total = precioBase + extra;
    totalEl.innerHTML = extra
      ? `Total: <strong>${pesos(total)}</strong> <span>(${pesos(precioBase)} cancha + ${pesos(extra)} servicios)</span>`
      : `Total: <strong>${pesos(total)}</strong> <span>la hora</span>`;
  };

  const abrirModal = (card) => {
    const nombre    = card.querySelector(".complex-name").textContent.trim();
    const fecha     = document.getElementById("fecha").value;
    const servicios = (card.dataset.servicios || "").split(" ").filter(Boolean);
    precioBase = parseInt((card.querySelector(".complex-price")?.textContent || "0").replace(/[^\d]/g, ""), 10) || 0;

    modalTitle.textContent = nombre;
    modalSub.textContent   = `${formatearFecha(fecha)} · ${nombreTipo(tipoCancha)}`;

    turnoElegido = null;
    modalReserv.disabled = true;
    modalPick.classList.remove("is-ok");
    modalGrid.innerHTML = "";

    // Turnos
    const lista = horariosDe(card);
    lista.forEach(({ hora, libre }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.textContent = hora;
      b.disabled = !libre;
      b.addEventListener("click", () => {
        modalGrid.querySelectorAll(".slot").forEach((x) => x.classList.remove("is-selected"));
        b.classList.add("is-selected");
        turnoElegido = hora;
        modalPick.classList.remove("is-ok");
        modalPick.textContent = `Turno elegido: ${hora}`;
        modalReserv.disabled = false;
      });
      modalGrid.appendChild(b);
    });
    modalPick.textContent = lista.some((s) => s.libre)
      ? "Elegí un horario disponible"
      : "No hay horarios libres para esta fecha";

    // Servicios para sumar
    extrasList.innerHTML = "";
    if (servicios.length) {
      extrasBox.hidden = false;
      extrasTitle.textContent = `Sumá servicios de ${nombre}`;
      servicios.forEach((s) => {
        const precio = PRECIO_SERVICIO[s] ?? 0;
        const li = document.createElement("li");
        li.innerHTML =
          `<label><input type="checkbox" data-precio="${precio}">` +
          `<span>${LABEL_SERVICIO[s] || s}</span>` +
          `<em>${precio ? "+" + pesos(precio) : "incluido"}</em></label>`;
        li.querySelector("input").addEventListener("change", actualizarTotal);
        extrasList.appendChild(li);
      });
    } else {
      extrasBox.hidden = true;
    }
    actualizarTotal();

    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
  };

  if (modal) {
    modalClose.addEventListener("click", () => modal.close());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

    modalReserv.addEventListener("click", () => {
      if (!turnoElegido) return;
      const elegidos = extrasSeleccionados().map((c) => c.closest("label").querySelector("span").textContent);
      const total = precioBase + totalExtra();
      const conServicios = elegidos.length ? ` con ${elegidos.join(", ")}` : "";
      modalPick.classList.add("is-ok");
      modalPick.textContent =
        `¡Listo! Reservaste ${modalTitle.textContent} a las ${turnoElegido}${conServicios}. ` +
        `Total ${pesos(total)}. Pagá la seña y te llega la confirmación automática por WhatsApp.`;
      modalReserv.disabled = true;
      modalGrid.querySelectorAll(".slot").forEach((x) => (x.disabled = true));
      extrasList.querySelectorAll("input").forEach((x) => (x.disabled = true));
    });
  }

  /* ---------- Abrir el modal de reserva desde la tarjeta ---------- */
  document.querySelector(".complex-list")?.addEventListener("click", (e) => {
    const boton = e.target.closest('[data-action="horarios"]');
    const card  = boton && boton.closest(".complex-card");
    if (!card) return;
    e.preventDefault();
    abrirModal(card);
  });

});
