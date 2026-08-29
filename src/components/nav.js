import logo from '../assets/logo.svg?raw'
import { get } from '../lib/config.js'

/** Links de la navegación principal. Agregar uno aquí lo publica en todas las páginas. */
const LINKS = [
  { href: '/', texto: 'Inicio' },
  { href: '/about/', texto: 'Acerca de' },
  { href: '/blog/', texto: 'Blog' },
  { href: '/contacto/', texto: 'Contacto' },
]

/** Normaliza la ruta actual: /blog/index.html y /blog -> /blog/ */
function rutaActual() {
  let ruta = window.location.pathname.replace(/index\.html$/, '')
  if (!ruta.endsWith('/')) ruta += '/'
  return ruta
}

/**
 * ¿Este link corresponde a la página que se está viendo?
 * "/" solo coincide con la raíz exacta; el resto también con sus hijas
 * (así /blog/primer-post/ deja "Blog" marcado).
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

  // El botón de contacto no se repite cuando ya estás en esa página.
  const cta = esActivo('/contacto/', ruta)
    ? ''
    : '<li><a class="btn btn--primary nav__cta" href="/contacto/">Conversemos</a></li>'

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
}
