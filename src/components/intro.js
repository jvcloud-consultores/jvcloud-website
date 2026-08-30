/**
 * Telón de entrada de la portada.
 *
 * El marcado (el telón y el logotipo animado) está en index.html,
 * no aquí: así se pinta en el primer frame y nunca se ve la página antes
 * del telón. Este módulo solo decide cuándo se va y lo retira del DOM.
 *
 * La portada no aparece de golpe: el telón se funde encima de ella (ver
 * intro.css, el estado `data-intro="saliendo"`). Como el telón es blanco
 * y la portada también, fundirlo se ve exactamente como un encendido de
 * la página.
 *
 * Cada cuánto se repite lo decide `intro.repeat` en public/config.json:
 *
 *   "always"   en cada carga de la portada
 *   "session"  una vez por pestaña (por defecto)
 *   "once"     una vez por navegador, hasta que se borren los datos del sitio
 *
 * Con una salvedad importante: el telón se monta antes del primer pintado
 * y config.json se lee con fetch(), así que la decisión de saltarlo NO se
 * toma con la config, sino con la marca que dejó la carga anterior. Lo que
 * hace `intro.repeat` es decidir dónde se escribe esa marca (o si se
 * borra), y por eso un cambio en config.json se nota a partir de la
 * siguiente carga, no en la que lo lee.
 *
 * Al terminar dispara `intro:done` en document, por si algo de la página
 * quiere esperar a que la pantalla esté despejada.
 */
import { loadConfig, get } from '../lib/config.js'

// Ojo: esta misma clave está escrita en el <script> en línea del <head> de
// index.html, que es quien la lee antes del primer pintado. Si cambia aquí,
// cambia allí.
const CLAVE = 'jvcloud:intro-visto'

const MODO_POR_DEFECTO = 'session'
const MODOS = new Set(['always', 'session', 'once'])

const AUTO_MS = 4000          // la coreografía dura ~3.8 s
const SALIDA_MS = 1100        // logotipo (.4 s) + fundido del telón (.35 + .7 s)
const AUTO_MS_REDUCIDO = 1200
const SALIDA_MS_REDUCIDO = 300

// El almacenamiento puede fallar (modo privado, cookies bloqueadas). Si no
// se puede recordar, el telón se vuelve a mostrar: molesta menos que romperse.
function marcar(almacen, poner) {
  try {
    if (poner) almacen.setItem(CLAVE, '1')
    else almacen.removeItem(CLAVE)
  } catch { /* sin persistencia */ }
}

/**
 * Deja la marca donde toque según el modo configurado, y la borra de donde
 * no toca. Así cambiar `intro.repeat` surte efecto sin tener que vaciar el
 * almacenamiento a mano: pasar a "always" limpia las dos marcas y el telón
 * vuelve a salir siempre.
 */
function recordar() {
  const modo = get('intro.repeat', MODO_POR_DEFECTO)
  const valido = MODOS.has(modo) ? modo : MODO_POR_DEFECTO

  if (!MODOS.has(modo)) {
    console.warn('[intro] intro.repeat="%s" no es un modo válido; uso "%s"', modo, valido)
  }

  marcar(sessionStorage, valido === 'session')
  marcar(localStorage, valido === 'once')
}

/**
 * Pone en marcha la salida del telón.
 * @param {HTMLElement} [destino] contenedor `#intro` de la portada
 */
export function renderIntro(destino = document.getElementById('intro')) {
  if (!destino) return

  const raiz = document.documentElement
  const escuchas = new AbortController()

  // La marca solo importa para la próxima carga, así que puede esperar a la
  // config sin retrasar nada. Va antes del early return de abajo a propósito:
  // también hay que reconciliarla en las cargas en las que el telón no sale.
  loadConfig().then(recordar)

  function terminar() {
    escuchas.abort()
    destino.remove()
    raiz.dataset.intro = 'off'
    document.dispatchEvent(new CustomEvent('intro:done'))
  }

  // El <head> ya dijo que aquí no toca telón: fuera sin ceremonia.
  if (raiz.dataset.intro === 'off') {
    terminar()
    return
  }

  raiz.dataset.intro = 'on'

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let saliendo = false

  function salir() {
    if (saliendo) return
    saliendo = true
    clearTimeout(temporizador)

    // Apaga el logotipo y, medio segundo después, funde el telón entero.
    // Los tiempos están en intro.css; aquí solo hay que esperarlos.
    raiz.dataset.intro = 'saliendo'
    setTimeout(terminar, reducido ? SALIDA_MS_REDUCIDO : SALIDA_MS)
  }

  const temporizador = setTimeout(salir, reducido ? AUTO_MS_REDUCIDO : AUTO_MS)

  destino.addEventListener('click', salir, { signal: escuchas.signal })
  window.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' || evento.key === ' ' || evento.key === 'Enter') salir()
  }, { signal: escuchas.signal })
}
