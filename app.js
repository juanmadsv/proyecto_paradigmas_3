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
