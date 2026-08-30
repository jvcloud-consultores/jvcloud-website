/**
 * Widget flotante de WhatsApp, abajo a la derecha.
 *
 * Un botón redondo que abre un panel con el saludo y un enlace por cada
 * contacto. Todo sale del bloque `whatsapp` de public/config.json —textos,
 * números, cuántos contactos hay— así que sumar o quitar una persona no
 * toca este archivo.
 *
 * Se cuelga del <body> en vez de pedir un contenedor en cada HTML: es un
 * elemento fijo al viewport, no pertenece al flujo de ninguna página.
 */
import { get } from '../lib/config.js'

/** Logotipo oficial: burbuja con auricular. Se pinta en blanco por CSS. */
const GLIFO = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.437-9.884 9.889-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
`

const AVION = `
  <svg class="wa__avion" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.996.996 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91Z"/>
  </svg>
`

const ASPA = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
`

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/**
 * Inyecta el widget al final del <body>.
 * @param {HTMLElement} destino
 */
export function renderWhatsapp(destino = document.body) {
  if (!destino) return
  if (!get('whatsapp.enabled', false)) return

  // Los `href` los arma src/lib/config.js a partir de cada teléfono; aquí solo
  // se pintan. Sin ninguno válido, no hay widget que valga.
  const agentes = get('whatsapp.agents', []).filter((a) => a?.href)
  if (!agentes.length) return

  const titulo = get('whatsapp.title', '') || get('siteName', 'WhatsApp')
  const estado = get('whatsapp.status', 'En línea')
  const mensajes = get('whatsapp.messages', [])
  const marca = get('whatsapp.badge', '')
  const rotulo = get('whatsapp.label', 'Escríbenos por WhatsApp')
  // Onda alrededor del botón. Llama la atención, pero es un bucle infinito en
  // pantalla: por eso se puede apagar sin tocar código.
  const onda = get('whatsapp.pulse', true)

  const caja = document.createElement('div')
  caja.className = onda ? 'wa wa--onda' : 'wa'
  caja.dataset.abierto = 'false'

  const burbujas = mensajes
    .map((texto, i) => `<p class="wa__burbuja" style="--i:${i}">${escapar(texto)}</p>`)
    .join('')

  const enlaces = agentes.map((agente) => {
    const nombre = agente.label || agente.name || 'WhatsApp'
    const rol = agente.role ? `<span class="wa__agente-rol">${escapar(agente.role)}</span>` : ''
    return `
      <a class="wa__agente" href="${escapar(agente.href)}" target="_blank" rel="noopener noreferrer">
        <span class="wa__agente-texto">
          <span class="wa__agente-nombre">${escapar(nombre)}</span>
          ${rol}
        </span>
        ${AVION}
      </a>
    `
  }).join('')

  caja.innerHTML = `
    <div class="wa__panel" id="wa-panel" role="dialog" aria-label="${escapar(rotulo)}">
      <div class="wa__cab">
        <span class="wa__avatar">${GLIFO}</span>
        <div class="wa__id">
          <p class="wa__titulo">${escapar(titulo)}</p>
          ${estado ? `<p class="wa__estado">${escapar(estado)}</p>` : ''}
        </div>
        <button class="wa__cerrar" type="button" aria-label="Cerrar chat">${ASPA}</button>
      </div>
      <div class="wa__cuerpo">
        ${burbujas}
        <div class="wa__agentes">${enlaces}</div>
      </div>
    </div>
    <button class="wa__fab" type="button" aria-expanded="false" aria-controls="wa-panel" aria-label="${escapar(rotulo)}">
      <span class="wa__glifo">${GLIFO}</span>
      <span class="wa__x">${ASPA}</span>
      ${marca ? `<span class="wa__marca" aria-hidden="true">${escapar(marca)}</span>` : ''}
    </button>
  `

  destino.appendChild(caja)
  activar(caja)
}

/** Abrir, cerrar y las tres formas de salir: aspa, Escape y clic fuera. */
function activar(caja) {
  const fab = caja.querySelector('.wa__fab')
  const panel = caja.querySelector('.wa__panel')
  const aspa = caja.querySelector('.wa__cerrar')
  let abierto = false

  function abrir() {
    if (abierto) return
    abierto = true
    caja.dataset.abierto = 'true'
    // El distintivo ya cumplió: no vuelve en esta carga.
    caja.dataset.visto = 'true'
    fab.setAttribute('aria-expanded', 'true')
    fab.setAttribute('aria-label', 'Cerrar chat')
    panel.querySelector('.wa__agente')?.focus({ preventScroll: true })
  }

  function cerrar({ devolverFoco = false } = {}) {
    if (!abierto) return
    abierto = false
    caja.dataset.abierto = 'false'
    fab.setAttribute('aria-expanded', 'false')
    fab.setAttribute('aria-label', fab.title || 'Escríbenos por WhatsApp')
    if (devolverFoco) fab.focus({ preventScroll: true })
  }

  fab.title = fab.getAttribute('aria-label')
  fab.addEventListener('click', () => (abierto ? cerrar({ devolverFoco: true }) : abrir()))
  aspa.addEventListener('click', () => cerrar({ devolverFoco: true }))

  // Al elegir un contacto el chat se abre en otra pestaña; el panel se cierra
  // para que al volver no esté como lo dejamos.
  panel.addEventListener('click', (evento) => {
    if (evento.target.closest('.wa__agente')) cerrar()
  })

  document.addEventListener('keydown', (evento) => {
    if (abierto && evento.key === 'Escape') cerrar({ devolverFoco: true })
  })

  // Clic fuera. No hay encierro de foco ni bloqueo de scroll a propósito: es
  // un panel accesorio, no un diálogo modal —la página sigue viva detrás.
  document.addEventListener('click', (evento) => {
    if (abierto && !caja.contains(evento.target)) cerrar()
  })
}
