
const FORMULARIO_DESTINO = "";

const botonMenu = document.querySelector(".menu-boton");
const menu = document.getElementById("menu");

function cerrarMenu() {
  menu.classList.remove("abierto");
  botonMenu.setAttribute("aria-expanded", "false");
  botonMenu.setAttribute("aria-label", "Abrir el menú");
}

botonMenu.addEventListener("click", () => {
  const abrir = botonMenu.getAttribute("aria-expanded") !== "true";
  menu.classList.toggle("abierto", abrir);
  botonMenu.setAttribute("aria-expanded", String(abrir));
  botonMenu.setAttribute("aria-label", abrir ? "Cerrar el menú" : "Abrir el menú");
});
menu.addEventListener("click", ev => { if (ev.target.closest("a")) cerrarMenu(); });
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape" && menu.classList.contains("abierto")) { cerrarMenu(); botonMenu.focus(); }
});

const botonTema = document.querySelector(".tema-boton");
const oscuroDelSistema = window.matchMedia("(prefers-color-scheme: dark)");
const COLOR_BARRA = { light: "#f4efe6", dark: "#1e1f22" };

function temaActual() {
  return document.documentElement.dataset.theme || (oscuroDelSistema.matches ? "dark" : "light");
}

function pintarBotonTema() {
  const tema = temaActual();
  botonTema.setAttribute("aria-label", tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  if (document.documentElement.dataset.theme) {
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = COLOR_BARRA[tema];
  }
}

botonTema.addEventListener("click", () => {
  const nuevo = temaActual() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nuevo;
  try { localStorage.setItem("tema", nuevo); } catch (e) { /* sin almacenamiento: dura hasta recargar */ }
  pintarBotonTema();
});
oscuroDelSistema.addEventListener("change", pintarBotonTema);
pintarBotonTema();

document.getElementById("anio").textContent = String(new Date().getFullYear());

const formulario = document.getElementById("formulario");
const estado = document.getElementById("estado-envio");
if (FORMULARIO_DESTINO) {
  document.getElementById("lista-pronto").hidden = true;
  document.getElementById("lista-abierta").hidden = false;
}
const EMAIL_VALE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const reglas = {
  nombre: v => !v.trim() || v.trim().length >= 2 ? "" : "Si pones tu nombre, que tenga al menos 2 letras.",
  email: v => EMAIL_VALE.test(v.trim()) ? "" : "Escribe un email válido, como tu@correo.com.",
  mensaje: () => "",
};

function marcar(campo, error) {
  const caja = document.getElementById(campo.id + "-error");
  caja.textContent = error;
  caja.hidden = !error;
  campo.setAttribute("aria-invalid", error ? "true" : "false");
  if (error) campo.setAttribute("aria-describedby", caja.id);
  else campo.removeAttribute("aria-describedby");
}

function avisar(texto, clase) {
  estado.className = "estado-envio" + (clase ? " " + clase : "");
  estado.textContent = texto;
}

for (const nombre of Object.keys(reglas)) {
  const campo = formulario.elements[nombre];
  campo.addEventListener("input", () => {
    if (campo.getAttribute("aria-invalid") === "true") marcar(campo, reglas[nombre](campo.value));
  });
  campo.addEventListener("blur", () => { if (campo.value) marcar(campo, reglas[nombre](campo.value)); });
}

formulario.addEventListener("submit", async ev => {
  ev.preventDefault();
  let primero = null;
  for (const [nombre, regla] of Object.entries(reglas)) {
    const campo = formulario.elements[nombre];
    const error = regla(campo.value);
    marcar(campo, error);
    if (error && !primero) primero = campo;
  }
  if (primero) { primero.focus(); avisar("Revisa los campos marcados.", "mal"); return; }

  if (!FORMULARIO_DESTINO) {
    avisar("El formulario todavía no está conectado, así que no se ha enviado nada. Vuelve a intentarlo en unos días.", "mal");
    return;
  }

  const boton = formulario.querySelector('button[type="submit"]');
  const textoBoton = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Enviando…";
  avisar("Enviando…");
  try {
    const r = await fetch(FORMULARIO_DESTINO, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        nombre: formulario.elements.nombre.value.trim(),
        email: formulario.elements.email.value.trim(),
        mensaje: formulario.elements.mensaje.value.trim(),
      }),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    formulario.reset();
    avisar("¡Recibido! Te escribiremos cuando abramos la primera tanda.", "bien");
  } catch (e) {
    avisar("No se pudo enviar (" + e.message + "). Revisa tu conexión y vuelve a intentarlo.", "mal");
  } finally {
    boton.disabled = false;
    boton.textContent = textoBoton;
  }
});

const pasosGuia = [...document.querySelectorAll(".guia .paso")];
const filasFicha = [...document.querySelectorAll(".guia-lote .lote-pasos li")];
if (pasosGuia.length && "IntersectionObserver" in window) {
  const marcar = n => {
    pasosGuia.forEach((p, i) => p.classList.toggle("activo", i === n));
    filasFicha.forEach((f, i) => { f.classList.toggle("hecho", i < n); f.classList.toggle("ahora", i === n); });
  };
  marcar(0);
  const mira = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) marcar(pasosGuia.indexOf(e.target));
  }, { rootMargin: "-45% 0px -45% 0px" });
  pasosGuia.forEach(p => mira.observe(p));
}

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const grupos = [".seccion h2", ".razon", ".plan", ".acordeon details", ".cierre-lado", ".panel-marco"];
  const blancos = [];
  for (const sel of grupos) {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add("revela");
      el.style.setProperty("--i", String(sel === ".seccion h2" ? 0 : i % 4));
      blancos.push(el);
    });
  }
  document.documentElement.classList.add("anima");
  const entra = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add("visto"); entra.unobserve(e.target); }
  }, { rootMargin: "0px 0px -10% 0px" });
  blancos.forEach(el => entra.observe(el));
}
