import logo from '../assets/logo.svg?raw'
import { get } from '../lib/config.js'

/**
 * Links de la navegación principal. Agregar uno aquí lo publica en todas las
 * páginas. Contacto no está en la lista: a esa página se llega por el botón
 * "Contáctanos" de la portada y por el footer.
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
 *
 * La barra queda con lo mínimo —logotipo y el botón "Menú"— y el telón, a
 * pantalla completa, solo con la lista de links: es el mismo menú en
 * escritorio y en móvil, así que no hay dos navegaciones que mantener. El
 * link de la página actual se marca con `.is-active`, `aria-current="page"`
 * y una línea bajo el texto.
 */
export function renderNav(destino = document.getElementById('nav')) {
  if (!destino) return

  const ruta = rutaActual()
  const nombre = get('siteName', 'JVCloud')

  // El índice alimenta el número (01, 02…) y el escalonado de la entrada:
  // cada item hereda su turno por la variable CSS --i.
  const items = LINKS.map((link, i) => {
    const activo = esActivo(link.href, ruta)
    return `<li class="nav__item" style="--i: ${i}">
        <a class="nav__link${activo ? ' is-active' : ''}" href="${link.href}"${activo ? ' aria-current="page"' : ''}>
          <span class="nav__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <span class="nav__texto">${escapar(link.texto)}</span>
        </a>
      </li>`
  }).join('')

  destino.className = 'nav'
  destino.innerHTML = `
    <a class="nav__skip" href="#contenido">Saltar al contenido</a>
    <div class="nav__inner">
      <a class="nav__brand" href="/" title="${escapar(nombre)}">
        ${logo}
      </a>
      <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Abrir menú">
        <span class="nav__toggle-texto">Menú</span>
        <span class="nav__toggle-icono" aria-hidden="true"></span>
      </button>
    </div>
    <div id="nav-menu" class="nav__panel">
      <nav class="nav__panel-inner" aria-label="Navegación principal">
        <ul class="nav__list">${items}</ul>
      </nav>
    </div>
  `

  const estaAbierto = activarPanel(destino)
  activarAutoocultar(destino, estaAbierto)
}

/**
 * Abre y cierra el telón del menú.
 *
 * Mientras está arriba: la página no se desplaza, la barra se funde con el
 * telón (pierde su fondo y su línea) y el foco no se escapa del panel —el
 * botón entra en el ciclo porque sigue visible arriba.
 *
 * @returns {() => boolean} consulta del estado, para el auto-ocultar
 */
function activarPanel(nav) {
  const boton = nav.querySelector('.nav__toggle')
  const etiqueta = nav.querySelector('.nav__toggle-texto')
  const panel = nav.querySelector('.nav__panel')
  const raiz = document.documentElement

  let abierto = false

  /**
   * Todo lo que se pueda tabular con el telón arriba, en orden de DOM: el
   * logotipo y el botón de la barra —siguen a la vista— y los links del telón.
   * Se descarta el link de saltar al contenido, que lleva a lo que hay debajo.
   */
  const cadena = () => [...nav.querySelectorAll('a[href]:not(.nav__skip), button:not([disabled])')]

  function abrir() {
    if (abierto) return
    abierto = true
    // Si el auto-ocultar la había retirado, la barra vuelve: el botón de
    // cerrar tiene que estar a la vista.
    nav.classList.remove('is-hidden')
    nav.classList.add('is-abierto')
    panel.classList.add('is-open')
    boton.setAttribute('aria-expanded', 'true')
    boton.setAttribute('aria-label', 'Cerrar menú')
    etiqueta.textContent = 'Cerrar'
    raiz.dataset.menu = 'abierto'
  }

  function cerrar({ devolverFoco = false } = {}) {
    if (!abierto) return
    abierto = false
    nav.classList.remove('is-abierto')
    panel.classList.remove('is-open')
    boton.setAttribute('aria-expanded', 'false')
    boton.setAttribute('aria-label', 'Abrir menú')
    etiqueta.textContent = 'Menú'
    delete raiz.dataset.menu
    if (devolverFoco) boton.focus()
  }

  boton.addEventListener('click', () => (abierto ? cerrar({ devolverFoco: true }) : abrir()))

  // Al elegir un link el telón se va antes de que el navegador atienda el
  // click: así los anclas de la misma página (#servicios) encuentran la
  // página ya desbloqueada y pueden desplazarse.
  panel.addEventListener('click', (evento) => {
    if (evento.target.closest('a[href]')) cerrar()
  })

  document.addEventListener('keydown', (evento) => {
    if (!abierto) return

    if (evento.key === 'Escape') return cerrar({ devolverFoco: true })
    if (evento.key !== 'Tab') return

    // Encierro del foco: del último se vuelve al primero y al revés.
    const focos = cadena()
    if (!focos.length) return
    const primero = focos[0]
    const ultimo = focos[focos.length - 1]
    const actual = document.activeElement

    if (evento.shiftKey && (actual === primero || !nav.contains(actual))) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && actual === ultimo) {
      evento.preventDefault()
      primero.focus()
    }
  })

  return () => abierto
}

/**
 * Esconde la barra al bajar y la devuelve al subir.
 *
 * No se oculta cerca del tope de la página ni con el menú abierto, y vuelve
 * si algo dentro recibe el foco: si no, el teclado saltaría a links
 * invisibles.
 */
function activarAutoocultar(nav, estaAbierto) {
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

    if (estaAbierto()) return mostrar()
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
