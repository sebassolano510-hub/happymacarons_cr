// ===== Datos del negocio (cámbielos aquí si algo cambia) =====
const WHATSAPP = "50687558620";   // 506 + número, sin espacios
const ENTREGA = 1500;             // costo de entrega en la GAM
const PRECIOS = { 4: 3900, 6: 5800, 8: 7600 };
const SABORES = [
  { id: "creme",  nombre: "Crème Brûlée", foto: "img/creme-brulee.jpg" },
  { id: "limon",  nombre: "Pie de Limón", foto: "img/pie-de-limon.jpg" },
  { id: "red",    nombre: "Red Velvet",   foto: "img/red-velvet.jpg" },
  { id: "choco",  nombre: "Chocolate",    foto: "img/chocolate-card.jpg" },
];

// ===== Utilidades =====
const colones = n => "₡" + n.toLocaleString("es-CR").replace(/\s|,/g, ".");
const $ = s => document.querySelector(s);

document.getElementById("year").textContent = new Date().getFullYear();

// Menú en celular
const toggle = $(".nav-toggle"), links = $(".nav-links");
toggle.addEventListener("click", () => toggle.setAttribute("aria-expanded", links.classList.toggle("open")));
links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));

// La fecha mínima de entrega es mañana
const fecha = document.querySelector('[name="fecha"]');
const manana = new Date(); manana.setDate(manana.getDate() + 1);
fecha.min = manana.toISOString().slice(0, 10);

// ===== Armador de caja =====
const cantidades = Object.fromEntries(SABORES.map(s => [s.id, 0]));
let tamano = 6;

const contenedor = $("#flavor-pickers");
SABORES.forEach(s => {
  const fila = document.createElement("div");
  fila.className = "picker";
  fila.innerHTML = `
    <img src="${s.foto}" alt="">
    <span class="name">${s.nombre}</span>
    <div class="stepper">
      <button type="button" data-id="${s.id}" data-d="-1" aria-label="Quitar ${s.nombre}">−</button>
      <output id="q-${s.id}">0</output>
      <button type="button" data-id="${s.id}" data-d="1" aria-label="Agregar ${s.nombre}">+</button>
    </div>`;
  contenedor.appendChild(fila);
});

const total = () => Object.values(cantidades).reduce((a, b) => a + b, 0);

function actualizar() {
  const n = total();
  SABORES.forEach(s => { $("#q-" + s.id).textContent = cantidades[s.id]; });
  contenedor.querySelectorAll("button").forEach(b => {
    const id = b.dataset.id, d = +b.dataset.d;
    b.disabled = d < 0 ? cantidades[id] === 0 : n >= tamano;
  });
  const count = $("#count");
  count.textContent = `${n} / ${tamano}`;
  count.classList.toggle("full", n === tamano);
  $("#progress-bar").style.width = (n / tamano * 100) + "%";
  $("#sum-box").textContent = colones(PRECIOS[tamano]);
  $("#sum-total").textContent = colones(PRECIOS[tamano] + ENTREGA);
  $("#form-msg").textContent = "";
}

contenedor.addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  cantidades[b.dataset.id] = Math.max(0, cantidades[b.dataset.id] + +b.dataset.d);
  actualizar();
});

function cambiarTamano(n) {
  tamano = n;
  document.querySelector(`[name="size"][value="${n}"]`).checked = true;
  // Si ya había más macarons que el nuevo tamaño, se quitan desde el último sabor
  let sobra = total() - tamano;
  for (let i = SABORES.length - 1; sobra > 0 && i >= 0; i--) {
    const id = SABORES[i].id, q = Math.min(cantidades[id], sobra);
    cantidades[id] -= q; sobra -= q;
  }
  actualizar();
}

document.querySelectorAll('[name="size"]').forEach(r => r.addEventListener("change", () => cambiarTamano(+r.value)));

// Las tarjetas de "Cajas" eligen el tamaño y bajan al formulario
document.querySelectorAll(".box").forEach(b => b.addEventListener("click", () => {
  cambiarTamano(+b.dataset.size);
  $("#pedido").scrollIntoView({ behavior: "smooth" });
}));

// Mezcla variada: reparte lo más parejo posible
$("#mix").addEventListener("click", () => {
  SABORES.forEach((s, i) => {
    cantidades[s.id] = Math.floor(tamano / SABORES.length) + (i < tamano % SABORES.length ? 1 : 0);
  });
  actualizar();
});

// ===== Enviar por WhatsApp =====
$("#order-form").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const msg = $("#form-msg");
  const n = total();
  if (n !== tamano) { msg.textContent = `Le faltan ${tamano - n} macarons para completar la caja.`; return; }
  if (!f.get("nombre").trim()) { msg.textContent = "Escriba su nombre."; return; }
  if (!f.get("fecha")) { msg.textContent = "Elija la fecha de entrega."; return; }
  if (!f.get("lugar").trim()) { msg.textContent = "Escriba el lugar de entrega."; return; }

  const [y, m, d] = f.get("fecha").split("-");
  const lista = SABORES.filter(s => cantidades[s.id] > 0).map(s => `   - ${cantidades[s.id]} ${s.nombre}`).join("\n");
  const texto =
    `¡Hola Happy Macarons! 🩷 Quiero hacer un pedido:\n\n` +
    `*Caja de ${tamano}* (${colones(PRECIOS[tamano])})\n${lista}\n\n` +
    `*Nombre:* ${f.get("nombre").trim()}\n` +
    `*Fecha de entrega:* ${d}/${m}/${y}\n` +
    `*Lugar:* ${f.get("lugar").trim()}\n` +
    (f.get("comentarios").trim() ? `*Comentarios:* ${f.get("comentarios").trim()}\n` : "") +
    `\n*Total:* ${colones(PRECIOS[tamano] + ENTREGA)} (incluye entrega ${colones(ENTREGA)})`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank");
});

actualizar();
