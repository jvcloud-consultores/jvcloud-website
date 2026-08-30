import logo from '../assets/logo.svg?raw'
import { get } from '../lib/config.js'

/**
 * Links de la navegación principal. Agregar uno aquí lo publica en todas las
 * páginas. Contacto no está en la lista: de esa página se encarga el botón
 * "Contáctenos", que se arma aparte más abajo.
 */
const LINKS = [
  { href: '/', texto: 'Inicio' },
  // No hay página de servicios: es una sección de la portada, así que el link
  // lleva a su ancla. Desde otra página navega a "/" y baja hasta ella.
  { href: '/#servicios', texto: 'Servicios' },
  { href: '/about/', texto: 'Acerca de' },
  { href: '/portafolio/', texto: 'Portafolio' },
]

/** Normaliza la ruta actual: /about/index.html y /about -> /about/ */
function rutaActual() {
  let ruta = window.location.pathname.replace(/index\.html$/, '')
  if (!ruta.endsWith('/')) ruta += '/'
  return ruta
}

/**
 * ¿Este link corresponde a la página que se está viendo?
 * "/" solo coincide con la raíz exacta; el resto también con sus hijas
 * (así una futura /portafolio/proyecto/ deja "Portafolio" marcado).
 */
function esActivo(href, ruta) {
  return href === '/' ? ruta === '/' : ruta === href || ruta.startsWith(href)
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/**
 * Inyecta el header/nav compartido en `<header id="nav">`.
 * Marca el link activo con la clase `.is-active` y `aria-current="page"`.
 */
export function renderNav(destino = document.getElementById('nav')) {
  if (!destino) return

  const ruta = rutaActual()
  const nombre = get('siteName', 'JVCloud')

  const items = LINKS.map((link) => {
    const activo = esActivo(link.href, ruta)
    return `<li>
        <a class="nav__link${activo ? ' is-active' : ''}" href="${link.href}"${activo ? ' aria-current="page"' : ''}>${escapar(link.texto)}</a>
      </li>`
  }).join('')

  // "Contáctenos" es ahora el único acceso a contacto desde el nav, así que
  // sale en todas las páginas —antes se escondía en /contacto/ para no repetir
  // el link que había al lado— y se marca cuando estás en ella.
  const enContacto = esActivo('/contacto/', ruta)
  const cta = `<li>
        <a class="btn btn--primary nav__cta" href="/contacto/"${enContacto ? ' aria-current="page"' : ''}>Contáctenos</a>
      </li>`

  destino.className = 'nav'
  destino.innerHTML = `
    <a class="nav__skip" href="#contenido">Saltar al contenido</a>
    <div class="nav__inner">
      <a class="nav__brand" href="/" title="${escapar(nombre)}">
        ${logo}
      </a>
      <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Abrir menú">
        <span class="nav__bars" aria-hidden="true"></span>
      </button>
      <nav id="nav-menu" class="nav__menu" aria-label="Navegación principal">
        <ul class="nav__list">${items}${cta}</ul>
      </nav>
    </div>
  `

  const boton = destino.querySelector('.nav__toggle')
  const menu = destino.querySelector('.nav__menu')
  boton.addEventListener('click', () => {
    const abierto = boton.getAttribute('aria-expanded') === 'true'
    boton.setAttribute('aria-expanded', String(!abierto))
    boton.setAttribute('aria-label', abierto ? 'Abrir menú' : 'Cerrar menú')
    menu.classList.toggle('is-open', !abierto)
  })

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && menu.classList.contains('is-open')) boton.click()
  })

  activarAutoocultar(destino, menu)
}

/**
 * Esconde la barra al bajar y la devuelve al subir.
 *
 * No se oculta cerca del tope de la página ni con el menú móvil abierto, y
 * vuelve si algo dentro recibe el foco: si no, el teclado saltaría a links
 * invisibles.
 */
function activarAutoocultar(nav, menu) {
  const UMBRAL = 8     // ignora el temblor del scroll y el rebote táctil
  const DESDE = 140    // por encima de esto la barra siempre se ve

  let ultimo = window.scrollY
  let pendiente = false

  const mostrar = () => nav.classList.remove('is-hidden')

  const revisar = () => {
    pendiente = false
    const y = Math.max(0, window.scrollY)
    const delta = y - ultimo
    if (Math.abs(delta) < UMBRAL) return
    ultimo = y

    if (menu.classList.contains('is-open')) return mostrar()
    if (delta > 0 && y > DESDE) nav.classList.add('is-hidden')
    else mostrar()
  }

  window.addEventListener('scroll', () => {
    if (pendiente) return
    pendiente = true
    requestAnimationFrame(revisar)
  }, { passive: true })

  nav.addEventListener('focusin', mostrar)
}
