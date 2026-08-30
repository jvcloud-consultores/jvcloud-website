/**
 * Punto de entrada exclusivo de la portada.
 *
 * Monta lo que solo existe en la portada: el telón de entrada, la escena del
 * stack y la red neuronal de la sección de IA.
 *
 * Las hojas de estilo (main, jv, home e intro) van enlazadas en el <head> del
 * HTML, no importadas aquí: tienen que estar aplicadas en el primer frame.
 */
import './main.js'
import { activarApariciones } from './lib/apariciones.js'
import { renderIntro } from './components/intro.js'
import { renderRed } from './components/red.js'
import { renderStack } from './components/stack.js'

// El telón de entrada no espera a DOMContentLoaded ni a la config: cuanto
// antes empiece su cuenta atrás, antes despeja la pantalla. El marcado ya
// está en el HTML, así que aquí solo hay que darle salida.
renderIntro()

/**
 * Promesa que se cumple cuando el telón ya no está por delante. Se resuelve
 * en el acto si no llegó a salir (visita repetida) o si no hay telón.
 *
 * No basta con escuchar `intro:done`: cuando el telón se salta, el evento se
 * dispara antes de que esta página llegue a suscribirse.
 */
function telonFuera() {
  const raiz = document.documentElement
  if (raiz.dataset.intro === 'off' || !document.getElementById('intro')) return Promise.resolve()
  return new Promise((listo) => document.addEventListener('intro:done', listo, { once: true }))
}

/** Monta la escena del stack leyendo la lista de tecnologías del HTML. */
function activarStack() {
  const lista = document.querySelector('[data-tecnologias]')
  if (!lista) return
  const tecnologias = [...lista.querySelectorAll('li')].map((li) => li.textContent.trim())
  // La escena se dibuja ya (si no, la portada daría un salto al aparecer),
  // pero su animación de entrada espera a que el telón se haya ido.
  renderStack(document.getElementById('stack'), tecnologias, telonFuera())
}

function iniciar() {
  activarApariciones()
  activarStack()
  renderRed(document.getElementById('red'))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true })
} else {
  iniciar()
}
