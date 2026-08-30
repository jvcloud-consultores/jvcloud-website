/**
 * Punto de entrada exclusivo de la portada.
 *
 * Monta lo que solo existe en la portada: el telón de entrada, la lista de
 * herramientas con la escena del stack que la anima, y la red neuronal de la
 * sección de IA.
 *
 * Las hojas de estilo (main, jv, home e intro) van enlazadas en el <head> del
 * HTML, no importadas aquí: tienen que estar aplicadas en el primer frame.
 */
import './main.js'
import { loadConfig, get } from './lib/config.js'
import { activarApariciones } from './lib/apariciones.js'
import { renderIntro } from './components/intro.js'
import { renderCinta } from './components/cinta.js'
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

/**
 * Trae la lista de herramientas y se la reparte a quien la usa: la sección
 * "Herramientas" y la escena del stack del hero.
 *
 * La única fuente es `herramientas` en public/config.json, así que la lista se
 * cambia sin recompilar y no hay una segunda copia en el HTML que pueda
 * quedarse atrás. El precio de eso: sin JS —o si config.json no se puede
 * cargar— no hay nombres que mostrar, y entonces la sección se retira entera
 * en vez de quedar con el título encabezando un hueco.
 */
function activarHerramientas() {
  const lista = document.querySelector('[data-herramientas]')
  if (!lista) return
  const escena = document.getElementById('stack')

  // Se pide antes de esperar a la config: si no, el telón podría irse mientras
  // tanto y esta página se suscribiría al evento cuando ya pasó.
  const telon = telonFuera()

  // Esperar a la config no retrasa nada visible: la animación de entrada de la
  // escena arranca cuando se va el telón, bastante después.
  loadConfig().then(() => {
    const nombres = get('herramientas', []).map((n) => String(n).trim()).filter(Boolean)

    if (!nombres.length) {
      lista.closest('section')?.remove()
      return
    }

    lista.replaceChildren(...nombres.map((nombre) => {
      const li = document.createElement('li')
      li.textContent = nombre
      return li
    }))

    const cuenta = document.querySelector('[data-herramientas-cuenta]')
    if (cuenta) cuenta.textContent = `${nombres.length} herramientas`

    // La lista se convierte en cinta; si eso no sale adelante, se queda la
    // lista corrida, que se lee igual.
    renderCinta(lista, nombres)

    if (escena) renderStack(escena, nombres, telon)
  })
}

function iniciar() {
  activarApariciones()
  activarHerramientas()
  renderRed(document.getElementById('red'))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true })
} else {
  iniciar()
}
