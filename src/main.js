import './styles/main.css'
import { loadConfig, applyConfig, env } from './lib/config.js'
import { renderNav } from './components/nav.js'
import { renderFooter } from './components/footer.js'

/**
 * Punto de entrada común a todas las páginas.
 * Cada HTML hace <script type="module" src="/src/main.js"></script> y este
 * archivo se encarga del CSS, la config y los componentes compartidos.
 */
async function iniciar() {
  // La config se carga antes de pintar nav y footer para que el nombre del
  // sitio y los datos de contacto salgan correctos desde el primer render.
  await loadConfig()

  renderNav()
  renderFooter()
  applyConfig()

  document.documentElement.dataset.ready = 'true'

  if (!env.isProd) {
    console.info('[jvcloud] modo %s · API: %s', env.mode, env.apiUrl || '(sin definir)')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true })
} else {
  iniciar()
}
