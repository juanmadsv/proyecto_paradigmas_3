/* CanchaYa AE2 — Opción 3: catálogo asincrónico y filtro en vivo. */
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("#form-buscar");
  if (!form) return;
  const texto = document.querySelector("#buscar-texto");
  const zona = document.querySelector("#zona");
  const tipos = document.querySelector(".toggle-group");
  const chips = document.querySelector(".filter-chips");
  const lista = document.querySelector("#complejos-lista");
  const estado = document.querySelector(".search-status");
  const vacio = document.querySelector("#no-results");
  const total = document.querySelector("#results-count");
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
    const tarjetas = document.createDocumentFragment();
    resultados.forEach(([id, c]) => {
      const tarjeta = document.createElement("li");
      tarjeta.className = "complex-card";
      const imagen = document.createElement("img");
      imagen.className = "complex-photo";
      imagen.src = "images/" + encodeURIComponent(id) + ".jpg";
      imagen.alt = "Logo de " + c.nombre;
      imagen.addEventListener("error", () => {
        const placeholder = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#12a150"/><circle cx="120" cy="120" r="54" fill="#ffffff"/></svg>';
        imagen.src = "data:image/svg+xml," + encodeURIComponent(placeholder);
      }, { once: true });
      const cuerpo = document.createElement("div");
      cuerpo.className = "complex-body";
      const nombre = document.createElement("h3");
      nombre.className = "complex-name";
      nombre.textContent = c.nombre;
      const tipoEl = document.createElement("p");
      tipoEl.className = "complex-meta";
      tipoEl.textContent = c.tipo;
      const direccion = document.createElement("p");
      direccion.className = "complex-address";
      direccion.textContent = c.dir;
      const serviciosEl = document.createElement("div");
      serviciosEl.className = "complex-services";
      c.servicios.forEach((codigo) => {
        if (!servicio[codigo]) return;
        const chip = document.createElement("span");
        chip.className = "service-chip";
        chip.textContent = servicio[codigo];
        serviciosEl.appendChild(chip);
      });
      const precio = document.createElement("p");
      precio.className = "complex-price";
      precio.append(document.createTextNode("Desde " + pesos(c.precio) + " "));
      const hora = document.createElement("span");
      hora.textContent = "la hora";
      precio.appendChild(hora);
      cuerpo.append(nombre, tipoEl, direccion, serviciosEl, precio);
      const acciones = document.createElement("div");
      acciones.className = "complex-actions";
      const ficha = document.createElement("a");
      ficha.href = "detalle.html?c=" + encodeURIComponent(id);
      ficha.className = "btn btn-secondary btn-sm";
      ficha.textContent = "Ver ficha";
      const reservar = document.createElement("a");
      reservar.href = "comprar.html?c=" + encodeURIComponent(id);
      reservar.className = "btn btn-primary btn-sm";
      reservar.textContent = "Reservar cancha";
      acciones.append(ficha, reservar);
      tarjeta.append(imagen, cuerpo, acciones);
      tarjetas.appendChild(tarjeta);
    });
    lista.replaceChildren(tarjetas);


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
    document.querySelector("#complejos").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  actualizar();
});

/* Opción 5: calculadora independiente de presupuestos. */
/* =========================================================
   CanchaYa · app.js
   Calculadora de tarifas, presupuestos y descuentos (cotizar.html).
   Reto: fetch() + async/await para traer la tabla de precios/descuentos
   desde tarifas.json, y addEventListener('change', ...) para recalcular
   el presupuesto sin usar atributos onclick/onsubmit en el HTML.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const form     = document.querySelector("#form-calculadora");
  if (!form) return; // esta página no tiene la calculadora

  const tipoSel  = document.querySelector("#calc-tipo");
  const horasSel = document.querySelector("#calc-horas");
  const servList = document.querySelector("#calc-servicios");
  const totalEl  = document.querySelector("#calc-total");

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

    const resumen = [document.createTextNode("Presupuesto: " + pesos(total))];
    const detalle = document.createElement("small");
    detalle.textContent = pesos(precioHora) + " x " + horas + " h de cancha" + (subtotalServicios ? " + " + pesos(subtotalServicios) + " de servicios" : "");
    resumen.push(detalle);
    if (descuentos.length) {
      const detalleDescuentos = document.createElement("small");
      detalleDescuentos.className = "calc-desc";
      detalleDescuentos.textContent = "Descuentos aplicados: " + descuentos.join(" · ");
      resumen.push(detalleDescuentos);
    }
    const senaEl = document.createElement("span");
    senaEl.className = "rv-sena";
    senaEl.appendChild(document.createTextNode("Seña sugerida (" + Math.round(TARIFAS.senaPorc * 100) + "%): " + pesos(sena)));
    const saldo = document.createElement("small");
    saldo.textContent = "El resto (" + pesos(total - sena) + ") se paga en el complejo.";
    senaEl.appendChild(saldo);
    resumen.push(senaEl);
    totalEl.replaceChildren(...resumen);

  };

  const renderOpciones = () => {
    tipoSel.replaceChildren(...TARIFAS.tiposCancha.map((tipo) => {
      const opcion = document.createElement("option");
      opcion.value = tipo.valor;
      opcion.textContent = tipo.nombre + (tipo.recargo ? " (+" + pesos(tipo.recargo) + " la hora)" : "");
      return opcion;
    }));

    const servicios = document.createDocumentFragment();
    TARIFAS.servicios.forEach((servicioItem) => {
      const li = document.createElement("li");
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "calc-servicio";
      input.value = servicioItem.valor;
      input.dataset.precio = String(servicioItem.precio);
      label.append(input, document.createTextNode(" " + servicioItem.nombre + " — " + pesos(servicioItem.precio)));
      li.appendChild(label);
      servicios.appendChild(li);
    });
    servList.replaceChildren(servicios);

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

/* Sesión y API: la cookie HttpOnly viaja con fetch, nunca se guarda en localStorage. */
const sesionCanchaYa = {
  usuario: null,
  csrf: null,
  lista: [],
  listaPreparada: null,
  async solicitar(ruta, opciones = {}) {
    const respuesta = await fetch(`api/${ruta}`, { credentials: "same-origin", cache: "no-store", ...opciones });
    let datos;
    try { datos = await respuesta.json(); }
    catch { throw new Error("No se pudo leer la API. Abrí el sitio con Apache de XAMPP."); }
    if (!respuesta.ok) {
      if (respuesta.status === 401 && ruta !== "login.php") this.actualizar(null, []);
      const error = new Error(datos.error || "No se pudo completar la operación.");
      error.status = respuesta.status;
      throw error;
    }
    return datos;
  },
  actualizar(usuario, reservas) {
    this.usuario = usuario;
    this.lista = reservas;
    document.querySelectorAll('[data-sesion="privada"]').forEach((el) => { el.hidden = !usuario; });
    document.querySelectorAll('[data-sesion="publica"]').forEach((el) => { el.hidden = Boolean(usuario); });
    document.querySelectorAll("[data-nombre-usuario]").forEach((el) => { el.textContent = usuario?.nombre || ""; });
    document.querySelectorAll("[data-email-usuario]").forEach((el) => { el.textContent = usuario?.email || ""; });
    const campos = document.querySelector("#datos-reserva");
    if (campos) campos.disabled = !usuario;
    document.querySelector("#rv-confirm")?.replaceChildren();
    document.dispatchEvent(new CustomEvent("sesion-actualizada"));
  },
  async verificar() {
    try {
      // Endpoint privado: una respuesta 401 significa visitante, no un error de MySQL.
      const datos = await this.solicitar("mis_reservas.php");
      this.csrf = datos.csrf_token;
      this.actualizar(datos.usuario, datos.reservas);
    } catch (error) {
      if (error.status !== 401) throw error;
      this.actualizar(null, []);
      this.csrf = null;
    }
  },
  async enviar(ruta, datos = {}) {
    if (!this.csrf) this.csrf = (await this.solicitar("csrf.php")).csrf_token;
    return this.solicitar(ruta, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": this.csrf },
      body: JSON.stringify(datos),
    });
  },
};

// Datos recibidos de usuarios: siempre nodos de texto, nunca HTML interpolado.
function nodoTexto(etiqueta, contenido, clase) {
  const nodo = document.createElement(etiqueta);
  nodo.textContent = contenido;
  if (clase) nodo.className = clase;
  return nodo;
}

document.addEventListener("DOMContentLoaded", () => {
  const estado = document.querySelector("#estado-sesion");
  const mensaje = document.querySelector("#mensaje-cuenta");
  const lista = document.querySelector("#mis-reservas-lista");
  const avisar = (texto, error = false) => {
    if (!mensaje) return;
    mensaje.textContent = texto;
    mensaje.className = error ? "mensaje-error" : "mensaje-exito";
  };
  document.addEventListener("sesion-actualizada", () => {
    if (estado) estado.textContent = sesionCanchaYa.usuario ? "Sesión iniciada" : "Iniciá sesión para reservar y consultar tus reservas.";
    if (!lista) return;
    lista.replaceChildren();
    if (!sesionCanchaYa.usuario) return;
    if (!sesionCanchaYa.lista.length) lista.append(nodoTexto("li", "Todavía no tenés reservas."));
    sesionCanchaYa.lista.forEach((reserva) => {
      const item = document.createElement("li");
      item.append(nodoTexto("h3", `Reserva CY-${reserva.id}`));
      item.append(nodoTexto("p", `${reserva.complejo} · Fútbol ${reserva.tipo} · ${reserva.fecha} a las ${reserva.horario}`));
      item.append(nodoTexto("p", `Total: $${Number(reserva.total).toLocaleString("es-AR")} · Seña: $${Number(reserva.sena).toLocaleString("es-AR")}`));
      lista.append(item);
    });
  });
  sesionCanchaYa.listaPreparada = sesionCanchaYa.verificar().catch((error) => {
    sesionCanchaYa.actualizar(null, []);
    if (estado) estado.textContent = error.message;
    avisar(error.message, true);
  });
  document.querySelectorAll("[data-form-auth]").forEach((form) => {
    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      if (form.dataset.enviando === "si") return;
      const boton = form.querySelector('button[type="submit"]');
      form.dataset.enviando = "si";
      boton.disabled = true;
      try {
        await sesionCanchaYa.listaPreparada;
        const datos = Object.fromEntries(new FormData(form));
        const registro = form.dataset.formAuth === "registro";
        const respuesta = await sesionCanchaYa.enviar(registro ? "registro.php" : "login.php", datos);
        form.reset();
        if (registro) {
          avisar(respuesta.mensaje);
          document.querySelector('#form-login input[name="email"]').value = datos.email;
          document.querySelector('#form-login input[name="password"]').focus();
        } else {
          sesionCanchaYa.csrf = respuesta.csrf_token;
          await sesionCanchaYa.verificar();
          avisar("Sesión iniciada. Ya podés reservar.");
        }
      } catch (error) { avisar(error.message, true); }
      finally { form.dataset.enviando = "no"; boton.disabled = false; }
    });
  });
  document.querySelectorAll("[data-cerrar-sesion]").forEach((boton) => {
    boton.addEventListener("click", async () => {
      boton.disabled = true;
      try {
        await sesionCanchaYa.enviar("logout.php");
        sesionCanchaYa.csrf = null;
        sesionCanchaYa.actualizar(null, []);
        avisar("Sesión cerrada.");
      } catch (error) { avisar(error.message, true); }
      finally { boton.disabled = false; }
    });
  });
  // Sincroniza el DOM si otra pestaña inicia o cierra sesión.
  window.addEventListener("focus", () => sesionCanchaYa.verificar().catch((error) => {
    sesionCanchaYa.actualizar(null, []);
    if (estado) estado.textContent = error.message;
  }));
});

/* Opción 10: horarios desde PHP y reservas persistidas para el usuario de sesión. */
function iniciarReservaHorarios({selComplejo, DATOS, tituloEl, tipoSel, nombreTipo, pesos}) {
  const horaSel = document.querySelector("#rv-horario");
  const estadoEl = document.querySelector("#rv-estado");
  const confirmEl = document.querySelector("#rv-confirm");
  const form = document.querySelector("#form-reserva");
  const campos = document.querySelector("#datos-reserva");
  let pendiente = false;
  let solicitud = 0;
  const mostrarAcceso = () => {
    const acceso = nodoTexto("a", "Iniciar sesión o crear cuenta", "btn btn-primary");
    acceso.href = "cuenta.html";
    confirmEl.className = "rv-confirm";
    confirmEl.hidden = false;
    confirmEl.replaceChildren(acceso);
  };
  const titulo = () => {
    tituloEl.textContent = `Reservar ${DATOS[selComplejo.value].nombre} · ${nombreTipo(tipoSel.value)}${horaSel.value ? ` · ${horaSel.value} h` : ""}`;
  };
  async function horarios() {
    const actual = ++solicitud;
    const complejo = selComplejo.value;
    horaSel.disabled = true;
    horaSel.replaceChildren(nodoTexto("option", "Cargando horarios..."));
    try {
      const datos = await sesionCanchaYa.solicitar("turnos.php");
      if (actual !== solicitud) return;
      const turnos = datos.turnos[complejo] || [];
      const libres = turnos.filter((t) => t.libre).length;
      const vacio = nodoTexto("option", libres ? "Elegí un horario" : "Sin horarios libres hoy");
      vacio.value = "";
      horaSel.replaceChildren(vacio);
      turnos.forEach((turno) => {
        const opcion = nodoTexto("option", `${turno.hora} h — ${turno.libre ? "libre" : "ocupado"}`);
        opcion.value = turno.hora;
        opcion.disabled = !turno.libre;
        horaSel.append(opcion);
      });
      horaSel.disabled = libres === 0;
      estadoEl.textContent = `${libres} de ${turnos.length} horarios libres hoy`;
      titulo();
    } catch (error) {
      if (actual !== solicitud) return;
      horaSel.replaceChildren(nodoTexto("option", "No disponible"));
      estadoEl.textContent = error.message;
    }
  }
  selComplejo.addEventListener("change", horarios);
  tipoSel.addEventListener("change", titulo);
  horaSel.addEventListener("change", titulo);
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (pendiente) return;
    confirmEl.hidden = false;
    confirmEl.replaceChildren();
    if (!sesionCanchaYa.usuario) {
      mostrarAcceso();
      return;
    }
    const datos = {
      complejo: selComplejo.value, tipo: tipoSel.value, horario: horaSel.value,
      telefono: form.querySelector('[name="telefono"]').value.trim(),
      pago: form.querySelector('[name="pago"]').value,
      servicios: [...form.querySelectorAll('[name="servicio"]:checked')].map((el) => el.value),
      cupon: document.querySelector("#mensaje-cupon").classList.contains("mensaje-exito") ? "UCP10" : "",
    };
    if (!datos.horario || !datos.telefono) {
      confirmEl.append(nodoTexto("p", "Elegí un horario y completá tu teléfono."));
      return;
    }
    pendiente = true;
    campos.disabled = true;
    try {
      const respuesta = await sesionCanchaYa.enviar("mis_reservas.php", datos);
      const reserva = respuesta.reserva;
      // verificar() limpia resúmenes viejos; dibujar el nuevo sólo después.
      await sesionCanchaYa.verificar();
      confirmEl.className = "rv-confirm is-ok";
      confirmEl.append(nodoTexto("h3", "¡Tu reserva quedó guardada!"));
      confirmEl.append(nodoTexto("p", `CY-${reserva.id} · ${DATOS[reserva.complejo].nombre} · ${reserva.fecha} · ${reserva.horario} h`));
      confirmEl.append(nodoTexto("p", `Total: ${pesos(Number(reserva.total))} · Seña: ${pesos(Number(reserva.sena))}`));
      const enlace = document.createElement("a");
      enlace.href = "cuenta.html";
      enlace.textContent = "Ver mis reservas";
      confirmEl.append(enlace);
    } catch (error) {
      if (error.status === 401) {
        mostrarAcceso();
      } else {
        confirmEl.className = "rv-confirm is-error";
        confirmEl.append(nodoTexto("p", error.message));
      }
    } finally {
      pendiente = false;
      campos.disabled = !sesionCanchaYa.usuario;
      await horarios();
    }
  });
  horarios();
}

/* Recuperación de contraseña. El token del fragmento sólo se conserva en memoria. */
document.addEventListener("DOMContentLoaded", () => {
  const pedir = document.querySelector("#form-recuperar");
  const cambiar = document.querySelector("#form-restablecer");
  if (!pedir || !cambiar) return;
  const estado = document.querySelector("#mensaje-recuperacion");
  let token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
  // Quitar el secreto de la barra/historial sin enviarlo al servidor.
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  if (token) {
    pedir.hidden = true;
    cambiar.hidden = false;
    if (!/^[a-f0-9]{64}$/.test(token)) {
      cambiar.hidden = true;
      estado.textContent = "El enlace no es válido. Solicitá uno nuevo.";
      token = "";
    }
  }
  for (const form of [pedir, cambiar]) {
    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const boton = form.querySelector('button[type="submit"]');
      if (boton.disabled) return;
      const datos = Object.fromEntries(new FormData(form));
      const restablecer = form === cambiar;
      if (restablecer && datos.password !== datos.password_confirmation) {
        estado.textContent = "Las contraseñas no coinciden.";
        return;
      }
      boton.disabled = true;
      estado.textContent = restablecer ? "Guardando contraseña..." : "Procesando solicitud...";
      try {
        await sesionCanchaYa.listaPreparada;
        const respuesta = await sesionCanchaYa.enviar(
          restablecer ? "restablecer_password.php" : "recuperar_password.php",
          restablecer ? { ...datos, token } : datos
        );
        estado.textContent = respuesta.mensaje;
        form.reset();
        if (restablecer) {
          token = "";
          cambiar.hidden = true;
          sesionCanchaYa.csrf = respuesta.csrf_token;
          sesionCanchaYa.actualizar(null, []);
        }
      } catch (error) {
        estado.textContent = error.message;
      } finally {
        boton.disabled = false;
      }
    });
  }
});
