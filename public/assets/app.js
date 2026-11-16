"use strict";

const ROOT = document.body.dataset.root || "../";
const API = ROOT + "api/";
const app = document.querySelector("#app");
const main = document.querySelector("#contenido");
const globalStatus = document.querySelector("#estado-global");
const SERVICE_NAMES = {
  parrilla: "Parrilla",
  quincho: "Quincho",
  vestuarios: "Vestuarios",
  estacionamiento: "Estacionamiento"
};
const SERVICE_PRICES = { parrilla: 3000, quincho: 8000, vestuarios: 0, estacionamiento: 0 };
const PAYMENT_OPTIONS = [
  ["debito", "Tarjeta de débito"],
  ["credito", "Tarjeta de crédito"],
  ["mercadopago", "Mercado Pago"],
  ["personalpay", "Personal Pay"],
  ["naranjax", "Naranja X"],
  ["uala", "Ualá"]
];
let catalog = {};
let tarifas = null;
let csrfToken = "";
let currentUser = null;

const node = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined && text !== null) el.textContent = String(text);
  if (className) el.className = className;
  return el;
};
const pesos = value => "$" + Math.round(Number(value) || 0).toLocaleString("es-AR");
const announce = (message, error = false) => {
  globalStatus.textContent = message;
  globalStatus.dataset.error = String(error);
};
const showToast = message => {
  const toast = node("div", message, "toast");
  toast.setAttribute("aria-hidden", "true");
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 700);
};
const setPage = (title, content) => {
  document.title = title + " · CanchaYa";
  app.replaceChildren(content);
  app.setAttribute("aria-busy", "false");
};
const panel = (title, description) => {
  const section = node("section", null, "panel");
  section.setAttribute("aria-labelledby", "page-title");
  const h = node("h1", title, "panel-heading");
  h.id = "page-title";
  section.appendChild(h);
  if (description) section.appendChild(node("p", description, "muted"));
  return section;
};
const field = (labelText, control) => {
  const wrap = node("div", null, "field");
  const label = node("label", labelText);
  label.htmlFor = control.id;
  wrap.append(label, control);
  return wrap;
};
const selectControl = (id, labelText, values, selected) => {
  const select = node("select");
  select.id = id;
  values.forEach(item => {
    const option = node("option", item[1]);
    option.value = item[0];
    option.selected = item[0] === selected;
    select.appendChild(option);
  });
  return field(labelText, select);
};
const textControl = (id, labelText, type, options = {}) => {
  const input = node("input");
  input.id = id;
  input.name = options.name || id;
  input.type = type;
  Object.entries(options).forEach(([key, value]) => {
    if (key === "name") return;
    if (key === "required") input.required = true;
    else if (key === "minLength" || key === "maxLength") input[key] = value;
    else input.setAttribute(key, value);
  });
  return field(labelText, input);
};
const button = (text, className = "") => {
  const el = node("button", text, className);
  el.type = "submit";
  return el;
};
const link = (text, href, className = "") => {
  const el = node("a", text, className);
  el.href = href;
  return el;
};
const serviceChips = services => {
  const wrap = node("div", null, "chips");
  (services || []).forEach(code => {
    if (SERVICE_NAMES[code]) wrap.appendChild(node("span", SERVICE_NAMES[code], "chip"));
  });
  return wrap;
};
const request = async (path, options = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const headers = { Accept: "application/json" };
  const init = { method, credentials: "same-origin", headers };
  if (method !== "GET" && method !== "HEAD") {
    if (!csrfToken && path !== "csrf.php") {
      const csrf = await request("csrf.php");
      csrfToken = csrf.csrf_token;
    }
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = csrfToken;
    init.body = JSON.stringify(options.body || {});
  }
  const response = await fetch(API + path, init);
  let data;
  try { data = await response.json(); }
  catch { throw new Error("El servidor devolvió una respuesta que no es JSON."); }
  if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
  if (data.csrf_token) csrfToken = data.csrf_token;
  return data;
};
const loadData = async () => {
  const [complexResponse, ratesResponse] = await Promise.all([
    fetch(ROOT + "data/complejos.json"),
    fetch(ROOT + "tarifas.json")
  ]);
  if (!complexResponse.ok || !ratesResponse.ok) throw new Error("No se pudo cargar el catálogo o las tarifas.");
  catalog = await complexResponse.json();
  tarifas = await ratesResponse.json();
};
const fallbackImage = () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#dbe9de"/><circle cx="320" cy="180" r="70" fill="#087a40"/></svg>';
  return "data:image/svg+xml," + encodeURIComponent(svg);
};

function renderHome() {
  const view = panel("Encontrá y reservá tu cancha", "Buscá complejos por nombre, zona y tipo de cancha. La disponibilidad de turnos se consulta al servidor.");
  const hero = node("div", null, "hero");
  const kicker = node("p", "POSADAS, MISIONES");
  const title = node("h2");
  title.append(document.createTextNode("Elegí dónde jugar. "));
  title.appendChild(node("span", "Reservá en pocos pasos.", "accent"));
  hero.append(kicker, title, node("p", "Compará complejos, servicios y precios desde una sola pantalla."));
  const heroActions = node("div", null, "actions");
  heroActions.append(link("Ver complejos", "#complejos", "button"), link("Ir a mi cuenta", "#cuenta", "button secondary"));
  hero.appendChild(heroActions);
  view.appendChild(hero);

  const filters = node("section", null, "panel");
  filters.setAttribute("aria-labelledby", "filters-title");
  const heading = node("h2", "Filtrar complejos", "panel-heading");
  heading.id = "filters-title";
  const form = node("form", null, "filters");
  const search = document.createElement("input");
  search.id = "filter-name";
  search.type = "search";
  search.autocomplete = "off";
  form.appendChild(field("Nombre o dirección", search));
  const zones = [["", "Todas las zonas"], ...[...new Set(Object.values(catalog).map(c => c.zonaSlug))].map(z => [z, Object.values(catalog).find(c => c.zonaSlug === z)?.zona || z])];
  const zoneSelect = document.createElement("select");
  zoneSelect.id = "filter-zone";
  zones.forEach(([value, label]) => { const o = node("option", label); o.value = value; zoneSelect.appendChild(o); });
  form.appendChild(field("Zona", zoneSelect));
  const typeSelect = document.createElement("select");
  typeSelect.id = "filter-type";
  [["", "Todos los tipos"], ["5", "Fútbol 5"], ["7", "Fútbol 7"], ["11", "Fútbol 11"]].forEach(([value, label]) => { const o=node("option",label);o.value=value;typeSelect.appendChild(o); });
  form.appendChild(field("Tipo de cancha", typeSelect));
  filters.append(heading, form);
  view.appendChild(filters);

  const results = node("section", null, "panel");
  results.id = "complejos";
  const resultsTitle = node("h2", "Complejos disponibles", "panel-heading");
  const count = node("p", null, "status-inline");
  count.setAttribute("role", "status");
  count.setAttribute("aria-live", "polite");
  const list = node("ul", null, "card-grid clean");
  list.setAttribute("aria-label", "Resultados de complejos");
  list.setAttribute("aria-live", "polite");
  const render = () => {
    const term = search.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const selectedZone = zoneSelect.value, selectedType = typeSelect.value;
    const entries = Object.entries(catalog).filter(([, c]) => {
      const match = !term || (c.nombre + " " + c.dir).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(term);
      const typeMatch = !selectedType || c.tipos.split(" ").includes(selectedType);
      return match && (!selectedZone || c.zonaSlug === selectedZone) && typeMatch;
    });
    const cards = document.createDocumentFragment();
    entries.forEach(([id, c]) => {
      const card = node("li", null, "card");
      const image = document.createElement("img");
      image.src = ROOT + "images/" + encodeURIComponent(id) + ".jpg";
      image.alt = "Complejo " + c.nombre;
      image.loading = "lazy";
      image.addEventListener("error", () => { image.src = fallbackImage(); }, { once: true });
      const body = node("div", null, "card-body");
      body.append(node("h3", c.nombre), node("p", c.dir, "muted"), node("p", c.zona + " · " + c.tipo), serviceChips(c.servicios), node("strong", "Desde " + pesos(c.precio) + " la hora"));
      const actions = node("div", null, "card-actions");
      const details = link("Ver detalles", "#detalle?id=" + encodeURIComponent(id), "secondary");
      const reserve = link("Reservar", "#reservar?id=" + encodeURIComponent(id));
      actions.append(details, reserve);
      body.appendChild(actions);
      card.append(image, body);
      cards.appendChild(card);
    });
    list.replaceChildren(cards);
    count.textContent = entries.length + (entries.length === 1 ? " complejo encontrado." : " complejos encontrados.");
  };
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
  results.append(resultsTitle, count, list);
  view.appendChild(results);
  setPage("Buscar", view);
}

function renderDetails(id) {
  const c = catalog[id];
  if (!c) { announce("No encontramos ese complejo.", true); renderHome(); return; }
  const view = panel(c.nombre, c.resumen);
  view.append(node("p", c.dir + " · " + c.zona), node("p", c.tipo), node("strong", "Desde " + pesos(c.precio) + " la hora"), serviceChips(c.servicios));
  const actions = node("div", null, "actions");
  actions.append(link("Reservar este complejo", "#reservar?id=" + encodeURIComponent(id), "button"), link("Volver al catálogo", "#inicio", "button secondary"));
  view.appendChild(actions);
  setPage(c.nombre, view);
}

async function renderReserve(id) {
  const view = panel("Reservar una cancha", "Elegí una fecha, un turno y los servicios. La disponibilidad se vuelve a validar en el servidor.");
  if (!currentUser) {
    const notice = node("p", "Iniciá sesión para confirmar una reserva.", "status-inline");
    notice.setAttribute("role", "status");
    view.append(notice, link("Ir a Mi cuenta", "#cuenta", "button"));
  }
  const entries = Object.entries(catalog);
  const currentId = catalog[id] ? id : entries[0]?.[0];
  if (!currentId) { view.appendChild(node("p", "No hay complejos para mostrar.")); setPage("Reservar", view); return; }

  const form = node("form", null, "form-grid");
  const complexSelect = document.createElement("select");
  complexSelect.id = "reserve-complex";
  entries.forEach(([key, c]) => { const option=node("option",c.nombre);option.value=key;option.selected=key===currentId;complexSelect.appendChild(option); });
  form.appendChild(field("Complejo", complexSelect));

  const dateControl=document.createElement("input");
  dateControl.type="date";dateControl.id="reserve-date";dateControl.name="fecha";dateControl.required=true;
  const today=new Date();
  const localDate=value=>new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,10);
  dateControl.min=localDate(today);
  const maxDate=new Date(today);maxDate.setDate(maxDate.getDate()+90);
  dateControl.max=localDate(maxDate);dateControl.value=dateControl.min;
  form.appendChild(field("Fecha (hasta 90 días)",dateControl));

  const typeSelect = document.createElement("select");
  typeSelect.id = "reserve-type";
  const fillTypes=key=>{
    typeSelect.replaceChildren(...catalog[key].tipos.split(" ").map(t=>{
      const option=node("option",({"5":"Fútbol 5","7":"Fútbol 7","11":"Fútbol 11"})[t]||t);
      option.value=t;return option;
    }));
  };
  fillTypes(currentId);
  form.appendChild(field("Tipo de cancha", typeSelect));

  const scheduleSelect=document.createElement("select");
  scheduleSelect.id="reserve-time";scheduleSelect.required=true;
  form.appendChild(field("Horario disponible",scheduleSelect));

  const phone=document.createElement("input");
  phone.id="reserve-phone";phone.name="telefono";phone.type="tel";phone.autocomplete="tel";phone.required=true;phone.maxLength=30;
  form.appendChild(field("Teléfono de contacto",phone));

  const payment=document.createElement("select");
  payment.id="reserve-payment";
  PAYMENT_OPTIONS.forEach(([value,label])=>{const option=node("option",label);option.value=value;payment.appendChild(option);});
  form.appendChild(field("Medio de pago declarado",payment));

  const coupon=document.createElement("input");
  coupon.id="reserve-coupon";coupon.name="cupon";coupon.autocomplete="off";coupon.maxLength=20;
  form.appendChild(field("Cupón (opcional)",coupon));

  const servicesWrap=node("fieldset");
  const legend=node("legend","Servicios adicionales");
  const servicesList=node("ul",null,"clean");
  const serviceInputs=[];
  const addServices=key=>{
    servicesList.replaceChildren();serviceInputs.length=0;
    (catalog[key].servicios||[]).forEach(code=>{
      if(!SERVICE_NAMES[code])return;
      const item=node("li");
      const label=node("label",null,"check-row");
      const input=document.createElement("input");input.type="checkbox";input.value=code;input.dataset.price=String(SERVICE_PRICES[code]||0);
      label.append(input,node("span",SERVICE_NAMES[code]+" — "+((SERVICE_PRICES[code]||0)?"+ "+pesos(SERVICE_PRICES[code]):"incluido")));
      item.appendChild(label);servicesList.appendChild(item);serviceInputs.push(input);
    });
    servicesWrap.replaceChildren(legend,servicesList);
  };
  addServices(currentId);form.appendChild(servicesWrap);

  const summary=node("div",null,"price-summary");
  summary.setAttribute("role","status");summary.setAttribute("aria-live","polite");
  const updateSummary=()=>{
    const complex=catalog[complexSelect.value];
    const extra=serviceInputs.filter(input=>input.checked).reduce((sum,input)=>sum+Number(input.dataset.price),0);
    const subtotal=Number(complex.precio)+extra;
    const discount=coupon.value.trim().toUpperCase()==="UCP10"?Math.round(subtotal*.10):0;
    const total=subtotal-discount,sena=Math.round(total*.20);
    summary.replaceChildren(
      node("p","Total estimado: "+pesos(total)),
      node("p","Seña mínima (20%): "+pesos(sena)),
      node("p","Saldo estimado: "+pesos(total-sena))
    );
  };
  const feedback=node("p","", "status-inline");
  feedback.setAttribute("role","status");feedback.setAttribute("aria-live","polite");
  const submit=button("Confirmar reserva");
  submit.disabled=!currentUser;
  const refreshAvailability=async()=>{
    submit.disabled=true;
    scheduleSelect.replaceChildren();
    try{
      const response=await request("turnos.php?fecha="+encodeURIComponent(dateControl.value));
      const available=(response.turnos&&response.turnos[complexSelect.value]||[]).filter(slot=>slot.libre);
      if(available.length){
        scheduleSelect.replaceChildren(...available.map(slot=>{const option=node("option",slot.hora);option.value=slot.hora;return option;}));
      }else{
        const option=node("option","No hay turnos disponibles para esta fecha");option.value="";scheduleSelect.appendChild(option);
        feedback.textContent="Elegí otra fecha o complejo.";
      }
      submit.disabled=!currentUser||!available.length;
    }catch(error){
      const option=node("option","No se pudo cargar la disponibilidad");option.value="";scheduleSelect.appendChild(option);
      feedback.textContent=error.message;announce(error.message,true);
    }
  };
  complexSelect.addEventListener("change",()=>{fillTypes(complexSelect.value);addServices(complexSelect.value);updateSummary();refreshAvailability();});
  dateControl.addEventListener("change",refreshAvailability);
  servicesWrap.addEventListener("change",updateSummary);
  coupon.addEventListener("input",updateSummary);
  updateSummary();
  refreshAvailability();

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!currentUser){feedback.textContent="Iniciá sesión antes de reservar.";return;}
    submit.disabled=true;feedback.textContent="Guardando reserva…";
    try{
      const result=await request("mis_reservas.php",{method:"POST",body:{
        complejo:complexSelect.value,tipo:typeSelect.value,fecha:dateControl.value,horario:scheduleSelect.value,
        telefono:phone.value.trim(),pago:payment.value,cupon:coupon.value.trim(),
        servicios:serviceInputs.filter(input=>input.checked).map(input=>input.value)
      }});
      announce(result.mensaje||"Reserva guardada.");
      location.hash="#mis-reservas";
    }catch(error){feedback.textContent=error.message;announce(error.message,true);submit.disabled=false;}
  });
  form.append(summary,submit);
  view.appendChild(form);view.appendChild(feedback);
  setPage("Reservar",view);
}

function renderAccount() {
  const view = panel("Mi cuenta", currentUser ? "Tu sesión está activa." : "Registrate o iniciá sesión para reservar y consultar tus reservas.");
  if (currentUser) {
    view.appendChild(node("p","Hola, "+currentUser.nombre));
    const actions=node("div",null,"actions");
    actions.append(link("Mis reservas","#mis-reservas","button"));
    const logout=node("button","Cerrar sesión");
    logout.type="button";
    logout.addEventListener("click",async()=>{
      try{await request("logout.php",{method:"POST",body:{}});currentUser=null;announce("Sesión cerrada.");await renderRoute();}
      catch(error){announce(error.message,true);}
    });
    actions.appendChild(logout);view.appendChild(actions);setPage("Mi cuenta",view);return;
  }
  const status=node("p","", "status-inline");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
  const login=node("form",null,"panel");
  login.appendChild(node("h2","Iniciar sesión","panel-heading"));
  login.append(textControl("login-email","Email","email",{name:"email",autocomplete:"username",required:true,maxLength:190}));
  login.append(textControl("login-password","Contraseña","password",{name:"password",autocomplete:"current-password",required:true,minLength:8}));
  const loginButton=button("Iniciar sesión");login.appendChild(loginButton);
  login.addEventListener("submit",async e=>{
    e.preventDefault();loginButton.disabled=true;status.textContent="Validando credenciales…";
    try{
      const result=await request("login.php",{method:"POST",body:{email:login.elements.email.value,password:login.elements.password.value}});
      currentUser=result.usuario;csrfToken=result.csrf_token||csrfToken;announce("Sesión iniciada.");await renderRoute();
    }catch(error){status.textContent=error.message;loginButton.disabled=false;}
  });
  const register=node("form",null,"panel");
  register.appendChild(node("h2","Crear cuenta","panel-heading"));
  register.append(textControl("register-name","Nombre","text",{name:"nombre",autocomplete:"name",required:true,maxLength:100}));
  register.append(textControl("register-email","Email","email",{name:"email",autocomplete:"email",required:true,maxLength:190}));
  register.append(textControl("register-password","Contraseña (8 a 72 bytes)","password",{name:"password",autocomplete:"new-password",required:true,minLength:8}));
  const registerButton=button("Crear cuenta");register.appendChild(registerButton);
  register.addEventListener("submit",async e=>{
    e.preventDefault();registerButton.disabled=true;status.textContent="Creando cuenta…";
    try{
      const result=await request("registro.php",{method:"POST",body:{nombre:register.elements.nombre.value.trim(),email:register.elements.email.value,password:register.elements.password.value}});
      const successMessage=result.mensaje||"Cuenta creada. Ya podés iniciar sesión.";
      status.textContent=successMessage;status.className="status-inline success";register.reset();
      showToast(successMessage);
      login.elements.email.focus();
    }catch(error){status.textContent=error.message;status.className="status-inline error";}
    finally{registerButton.disabled=false;}
  });
  view.append(login,register,status);
  setPage("Mi cuenta",view);
}

async function renderMyReservations() {
  const view = panel("Mis reservas", "Consultá y cancelá tus reservas con al menos 24 horas de anticipación.");
  if(!currentUser){view.append(node("p","Iniciá sesión para ver tus reservas.","status-inline"),link("Ir a Mi cuenta","#cuenta","button"));setPage("Mis reservas",view);return;}
  const reserveAction=node("div",null,"actions");
  reserveAction.appendChild(link("Realizar una reserva","#reservar","button"));
  view.appendChild(reserveAction);
  try{
    const data=await request("mis_reservas.php");
    currentUser=data.usuario||currentUser;
    if(!data.reservas.length)view.appendChild(node("p","Todavía no tenés reservas."));
    data.reservas.forEach(reserva=>{
      const item=node("article",null,"reservation");
      const complexName=catalog[reserva.complejo]?.nombre||reserva.complejo;
      item.append(node("h2",complexName),node("p",reserva.fecha+" · "+reserva.horario+" · Fútbol "+reserva.tipo));
      item.append(node("p","Total: "+pesos(reserva.total)+" · Seña: "+pesos(reserva.sena)));
      item.append(node("p","Estado: "+(reserva.estado==="cancelada"?"Cancelada":"Confirmada")));
      if(reserva.estado==="confirmada"){
        const start=new Date(reserva.fecha+"T"+reserva.horario+":00");
        const canCancel=start.getTime()-Date.now()>=24*60*60*1000;
        if(canCancel){
          const cancel=node("button","Cancelar reserva");
          cancel.type="button";
          cancel.addEventListener("click",async()=>{
            cancel.disabled=true;
            try{
              const result=await request("mis_reservas.php",{method:"DELETE",body:{reserva_id:reserva.id}});
              announce(result.mensaje||"Reserva cancelada.");
              await renderMyReservations();
            }catch(error){announce(error.message,true);cancel.disabled=false;}
          });
          item.appendChild(cancel);
        }else{
          item.appendChild(node("p","La cancelación requiere al menos 24 horas de anticipación.","muted"));
        }
      }
      view.appendChild(item);
    });
  }catch(error){view.appendChild(node("p",error.message,"error"));}
  setPage("Mis reservas",view);
}

function renderQuote() {
  const view=panel("Cotizar","Calculá una estimación. La cotización no crea una reserva ni procesa pagos.");
  const form=node("form",null,"form-grid");
  const type=document.createElement("select");type.id="quote-type";
  tarifas.tiposCancha.forEach(item=>{const o=node("option",item.nombre);o.value=item.valor;type.appendChild(o);});
  form.appendChild(field("Tipo de cancha",type));
  const hours=document.createElement("select");hours.id="quote-hours";
  [1,2,3,4].forEach(n=>{const o=node("option",n+" hora"+(n===1?"":"s"));o.value=String(n);hours.appendChild(o);});
  form.appendChild(field("Duración",hours));
  const list=node("fieldset");list.appendChild(node("legend","Servicios"));
  const checks=[];
  tarifas.servicios.forEach(item=>{
    const label=node("label",null,"check-row");
    const input=document.createElement("input");input.type="checkbox";input.value=item.valor;input.dataset.price=String(item.precio);
    label.append(input,node("span",item.nombre+" — "+pesos(item.precio)));list.appendChild(label);checks.push(input);
  });
  form.appendChild(list);
  const summary=node("div",null,"price-summary");summary.setAttribute("role","status");summary.setAttribute("aria-live","polite");
  const calculate=()=>{
    const selected=tarifas.tiposCancha.find(t=>t.valor===type.value)||tarifas.tiposCancha[0];
    const count=Number(hours.value);const base=(tarifas.precioBaseHora+selected.recargo)*count;
    const services=checks.filter(c=>c.checked).reduce((sum,c)=>sum+Number(c.dataset.price),0);
    const discountHours=tarifas.descuentosPorHoras.find(rule=>count>=rule.minHoras);
    const serviceCount=checks.filter(c=>c.checked).length;
    const discountServices=tarifas.descuentosPorServicios.find(rule=>serviceCount>=rule.minServicios);
    const total=(base-(discountHours?base*discountHours.descuento:0))+(services-(discountServices?services*discountServices.descuento:0));
    const deposit=Math.round(total*tarifas.senaPorc);
    const details=[node("p","Total estimado: "+pesos(total)),node("p","Seña sugerida (20%): "+pesos(deposit))];
    if(discountHours)details.push(node("p",discountHours.etiqueta));
    if(discountServices)details.push(node("p",discountServices.etiqueta));
    summary.replaceChildren(...details);
  };
  form.addEventListener("change",calculate);calculate();
  view.append(form,summary);setPage("Cotizar",view);
}

async function renderRoute() {
  app.setAttribute("aria-busy","true");
  const [route, query = ""] = location.hash.replace(/^#/, "").split("?");
  const params=new URLSearchParams(query);
  try {
    if(route==="reservar") await renderReserve(params.get("id"));
    else if(route==="detalle") renderDetails(params.get("id"));
    else if(route==="cuenta") renderAccount();
    else if(route==="mis-reservas") await renderMyReservations();
    else if(route==="cotizar") renderQuote();
    else renderHome();
    main.focus({preventScroll:true});
  } catch(error) {
    app.replaceChildren(node("section","", "panel"));
    app.firstElementChild.append(node("h1","No se pudo abrir esta sección","panel-heading"),node("p",error.message,"error"));
    app.setAttribute("aria-busy","false");announce(error.message,true);
  }
}

document.addEventListener("DOMContentLoaded",async()=>{
  try{
    await loadData();
    try{
      const csrf=await request("csrf.php");
      csrfToken=csrf.csrf_token;
    }catch(error){announce(error.message,true);}
    try{
      const session=await request("mis_reservas.php");
      currentUser=session.usuario||null;
      csrfToken=session.csrf_token||csrfToken;
    }catch(error){
      if(!error.message.toLowerCase().includes("iniciá sesión")) announce(error.message,true);
    }
    announce(currentUser?"Sesión iniciada.":"Catálogo listo.");
    if(!location.hash)location.hash="#inicio";
    else await renderRoute();
  }catch(error){announce(error.message,true);app.setAttribute("aria-busy","false");}
});
window.addEventListener("hashchange",renderRoute);
