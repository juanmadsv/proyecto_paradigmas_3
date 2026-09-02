/* =========================================================
   CanchaYa · main.js
   Interacciones: menu, buscador y formulario de reserva
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

  /* ---------- Formulario de reserva (comprar.html) ----------
     Desde "Complejos disponibles" el botón lleva a comprar.html?c=terraza.
     Muestra solo ese complejo, su descripcion, sus servicios y el total. */
  const selComplejo = document.getElementById("complejo");

  if (selComplejo) {
    const DATOS = {
      terraza: { nombre: "La Terraza", precio: 25000, servicios: ["parrilla", "quincho"],
        desc: "La Terraza — Fútbol 5, Av. Santa Catalina 4150. Cancha de césped sintético con iluminación para jugar de noche. Tiene parrilla y quincho para quedarse después del partido." },
      rampla: { nombre: "La Rampla", precio: 27000, servicios: ["vestuarios"],
        desc: "La Rampla — Fútbol 5, Pedro Morcillo 3326. Cancha techada con vestuarios. Ideal para partidos entre amigos sin depender del clima." },
      napoles: { nombre: "Nápoles", precio: 28000, servicios: ["parrilla", "estacionamiento"],
        desc: "Nápoles — Fútbol 5, Av. Quaranta 2912. Cancha con parrilla y estacionamiento propio. Fácil de llegar." },
      establo: { nombre: "El Establo Fútbol 5", precio: 27500, servicios: ["quincho", "parrilla"],
        desc: "El Establo — Fútbol 5 y 7, Santa Cruz 3436. Complejo con quincho y parrilla. Sirve para partidos y para festejar cumpleaños." },
      potrero: { nombre: "El Potrero Fútbol 5", precio: 25000, servicios: ["estacionamiento"],
        desc: "El Potrero — Fútbol 5, 7 y 11, 3 de Febrero 2040. Complejo grande con estacionamiento. Se usa también para escuelita y torneos." },
      olimpo: { nombre: "El Olimpo Fútbol 5", precio: 29000, servicios: ["parrilla", "quincho", "vestuarios"],
        desc: "El Olimpo — Fútbol 5, Av. Tomás Guido 4025. Cancha con parrilla, quincho y vestuarios. El combo completo para el after." }
    };
    const PRECIO_SERV = { parrilla: 3000, quincho: 8000, vestuarios: 0, estacionamiento: 0 };
    const NOMBRE_SERV = { parrilla: "Parrilla", quincho: "Quincho", vestuarios: "Vestuarios", estacionamiento: "Estacionamiento" };
    const pesos = (n) => "$" + n.toLocaleString("es-AR");

    const descEl  = document.getElementById("rv-desc");
    const tituloEl = document.getElementById("rv-titulo");
    const servBox = document.getElementById("rv-serv-box");
    const servList = document.getElementById("rv-serv");
    const totalEl = document.getElementById("rv-total");

    const calcularTotal = (base) => {
      let extra = 0;
      servList.querySelectorAll("input:checked").forEach((c) => { extra += Number(c.dataset.precio); });
      totalEl.textContent = extra
        ? `Total: ${pesos(base + extra)}  (${pesos(base)} cancha + ${pesos(extra)} servicios)`
        : `Total: ${pesos(base)}  la hora`;
    };

    const mostrarComplejo = (clave) => {
      const c = DATOS[clave];
      if (!c) return;
      tituloEl.textContent = "Reservar " + c.nombre;
      descEl.textContent = c.desc;

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
