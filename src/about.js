/**
 * Punto de entrada de /about/.
 *
 * Las hojas de estilo (main, jv y about) van enlazadas en el <head> del HTML,
 * no importadas aquí: tienen que estar aplicadas en el primer frame.
 *
 * Lo único propio de la página es encender las apariciones: los bloques llevan
 * `.h-reveal` y nacen invisibles, así que sin esta llamada se quedarían así
 * para siempre.
 */
import './main.js'
import { activarApariciones } from './lib/apariciones.js'

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => activarApariciones(), { once: true })
} else {
  activarApariciones()
}
