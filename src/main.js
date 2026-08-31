import { loadConfig, applyConfig, env } from './lib/config.js'
import { initAnalytics } from './lib/medicion.js'
import { renderAviso } from './components/aviso.js'
import { renderNav } from './components/nav.js'
import { renderFooter } from './components/footer.js'
import { renderWhatsapp } from './components/whatsapp.js'

/**
 * Punto de entrada común a todas las páginas.
 * Cada HTML hace <script type="module" src="/src/main.js"></script> y este
 * archivo se encarga de la config y de los componentes compartidos.
 *
 * El CSS no: va enlazado desde el <head> de cada página, para que bloquee el
 * primer pintado en vez de llegar con el bundle.
 */
async function iniciar() {
  // La config se carga antes de pintar nav y footer para que el nombre del
  // sitio y los datos de contacto salgan correctos desde el primer render.
  const config = await loadConfig()

  renderAviso()
  renderNav()
  renderFooter()
  applyConfig()
  // El último, y a propósito: es un accesorio. Si algo fallara al pintarlo, ya
  // están puestos los datos de la página, que es lo que no se puede perder.
  renderWhatsapp()

  document.documentElement.dataset.ready = 'true'

  // Medición de uso (Clarity), si config.json la trae encendida. Va al final a
  // propósito: es lo único que no se ve, y su script —async— no tiene por qué
  // competir con lo que sí se dibuja.
  initAnalytics(config)

  if (!env.isProd) {
    console.info('[jvcloud] modo %s', env.mode)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true })
} else {
  iniciar()
}
