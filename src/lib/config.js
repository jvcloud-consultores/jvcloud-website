/**
 * Configuración del sitio.
 *
 * Hay dos fuentes, con propósitos distintos:
 *
 *  1. `public/config.json` — se sirve tal cual y se lee con fetch() al
 *     arrancar. Se puede editar en el repo (o directamente en la rama
 *     publicada) y el cambio se ve sin volver a compilar.
 *
 *  2. `import.meta.env.VITE_*` — se incrusta en el bundle en tiempo de build.
 *     Cambiarlas exige recompilar. NUNCA metas secretos aquí: quedan en texto
 *     plano dentro de dist/.
 */

/** Valores por defecto: el sitio funciona aunque config.json falle. */
const DEFAULTS = {
  siteName: 'JVCloud Consultores',
  tagline: 'Arquitectura cloud, automatización y operación continua',
  description: '',
  domain: 'jvcloud.cl',
  // Datos de contacto. `phone` se escribe legible ("+56 9 6860 4006"): de ahí
  // se derivan solos `phoneHref` (tel:) y `whatsappHref` (wa.me), así que basta
  // con cambiar el número en config.json. `whatsapp: false` esconde ese enlace.
  contact: {
    name: '',
    email: 'josue.olivares@jvcloud.cl',
    phone: '',
    city: '',
    hours: '',
    whatsapp: false,
  },
  social: {},
  features: { showContactForm: true },
  // Nombres de la sección "Herramientas" y de la escena del stack de la
  // portada. Es la única fuente: vacío significa que no hay ninguna, y la
  // sección no se pinta.
  herramientas: [],
  // Barra de aviso sobre el nav. `enabled: false` o `text: ''` la apagan.
  announcement: { enabled: false, text: '', cta: { label: '', href: '/contacto/' } },
  // Telón de entrada de la portada. `repeat`: always | session | once.
  intro: { repeat: 'session' },
}

/** Variables de build (prefijo VITE_). Solo valores públicos. */
export const env = Object.freeze({
  siteName: import.meta.env.VITE_SITE_NAME || DEFAULTS.siteName,
  apiUrl: import.meta.env.VITE_API_URL || '',
  mode: import.meta.env.MODE,
  isProd: import.meta.env.PROD,
})

let config = { ...DEFAULTS, siteName: env.siteName }
let cargando = null

/** Mezcla superficial-recursiva de objetos planos. */
function merge(base, extra) {
  const out = { ...base }
  for (const [clave, valor] of Object.entries(extra ?? {})) {
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      out[clave] = merge(base?.[clave] ?? {}, valor)
    } else if (valor !== undefined) {
      out[clave] = valor
    }
  }
  return out
}

/**
 * Rellena los valores que no se escriben a mano en config.json:
 *
 *   contact.phoneHref     -> "tel:+56968604006"
 *   contact.whatsappHref  -> "https://wa.me/56968604006"
 *
 * Se calculan desde `contact.phone`, salvo que config.json los traiga
 * explícitos (por ejemplo, un número de WhatsApp distinto del teléfono).
 */
function derivar(cfg) {
  const digitos = String(cfg.contact?.phone ?? '').replace(/\D/g, '')
  if (!digitos) return cfg

  const contact = { ...cfg.contact }
  if (!contact.phoneHref) contact.phoneHref = `tel:+${digitos}`
  if (!contact.whatsappHref && contact.whatsapp) contact.whatsappHref = `https://wa.me/${digitos}`
  return { ...cfg, contact }
}

/**
 * Carga `/config.json` una sola vez. Si falla (red, JSON inválido, 404)
 * devuelve los valores por defecto y deja un aviso en consola: la página
 * nunca se queda en blanco por culpa de la config.
 */
export function loadConfig() {
  if (cargando) return cargando

  cargando = fetch('/config.json', { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then((remoto) => {
      config = merge(config, remoto)
      // VITE_SITE_NAME manda sobre config.json cuando está definida en el build.
      if (import.meta.env.VITE_SITE_NAME) config.siteName = import.meta.env.VITE_SITE_NAME
      config = derivar(config)
      return config
    })
    .catch((error) => {
      console.warn('[config] no se pudo cargar /config.json, uso valores por defecto:', error.message)
      return config
    })

  return cargando
}

/** Config ya cargada (síncrono). Úsalo después de `await loadConfig()`. */
export function getConfig() {
  return config
}

/**
 * Lee un valor anidado por ruta: get('contact.email').
 * @param {string} ruta
 * @param {*} [porDefecto]
 */
export function get(ruta, porDefecto = '') {
  const valor = ruta.split('.').reduce((acc, clave) => (acc == null ? acc : acc[clave]), config)
  return valor ?? porDefecto
}

/**
 * Rellena el HTML con valores de la config, sin escribir JS por página:
 *
 *   <span data-config="contact.email"></span>
 *   <a data-config="contact.email" data-config-attr="href" data-config-prefix="mailto:"></a>
 *   <img data-config="social.github" data-config-attr="src">
 *
 * Los elementos con `data-config-if="features.showContactForm"` se ocultan si el
 * valor es falsy.
 */
export function applyConfig(raiz = document) {
  for (const el of raiz.querySelectorAll('[data-config-if]')) {
    if (!get(el.dataset.configIf, false)) el.hidden = true
  }

  for (const el of raiz.querySelectorAll('[data-config]')) {
    const valor = get(el.dataset.config, '')
    if (valor === '' || valor == null) continue
    const texto = `${el.dataset.configPrefix ?? ''}${valor}${el.dataset.configSuffix ?? ''}`
    if (el.dataset.configAttr) el.setAttribute(el.dataset.configAttr, texto)
    else el.textContent = texto
  }

  // <title> y meta description también respetan la config.
  const titulo = document.querySelector('title[data-config-title]')
  if (titulo) titulo.textContent = `${titulo.dataset.configTitle} · ${get('siteName')}`
}
