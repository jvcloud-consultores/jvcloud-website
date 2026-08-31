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
  // Datos de contacto oficiales. `phone` se escribe legible
  // ("+56 9 6860 4006"): de ahí se derivan solos `phoneHref` (tel:) y
  // `whatsappHref` (wa.me), así que basta con cambiar el número.
  contact: {
    name: '',
    email: 'josue.olivares@jvcloud.cl',
    phone: '',
    city: '',
    hours: '',
    // Telegram con el mismo número del teléfono. `false` quita el enlace.
    telegram: false,
  },
  // Widget flotante de WhatsApp (abajo a la derecha). `enabled: false` lo apaga
  // entero, botón y panel. `agents` es la lista de personas del panel: cada una
  // con `label`, `phone` y, si conviene, `role` y un `message` propio. Vacía,
  // se usa el teléfono de `contact`. `badge` es el numerito rojo ('' o 0 lo
  // quitan) y `pulse` la onda alrededor del botón.
  whatsapp: {
    enabled: false,
    title: '',
    status: 'En línea',
    messages: [],
    message: '',
    badge: '',
    pulse: true,
    label: 'Escríbenos por WhatsApp',
    agents: [],
  },
  social: {},
  features: { showContactForm: true },
  // Nombres de la sección "Herramientas" y de la escena del stack de la
  // portada. Es la única fuente: vacío significa que no hay ninguna, y la
  // sección no se pinta.
  herramientas: [],
  // Barra de aviso sobre el nav. `enabled: false` o `text: ''` la apagan.
  announcement: { enabled: false, text: '', cta: { label: '', href: '/contacto/' } },
  // Formulario de contacto. `endpoint` es el Worker de `cloudflare-configs`
  // (POST https://<worker>/f/jvcloud), que valida, filtra bots y avisa por
  // Telegram. Vacío no deja el formulario muerto: cae al `mailto:` de siempre.
  formulario: {
    endpoint: '',
    // Turnstile: apagado mientras no haya sitekey. El secret vive en el Worker,
    // nunca acá. `action` tiene que calzar con la `accion` declarada para este
    // formulario en el Worker; si no calzan, siteverify acepta el token y el
    // Worker igual lo rechaza.
    // `theme` se fija en 'light' porque estas páginas son blancas siempre: con
    // 'auto' el widget seguiría al sistema del visitante y a algunos les
    // saldría oscuro sobre papel blanco.
    turnstile: { enabled: false, siteKey: '', action: 'jvcloud', theme: 'light' },
  },
  // Medición de uso. Apagada por defecto: se enciende desde config.json y sin
  // recompilar (ver src/lib/medicion.js).
  analytics: {
    clarity: {
      enabled: false,
      projectId: '',
      onlyInProduction: true,
      respectDoNotTrack: true,
    },
  },
  // Telón de entrada de la portada.
  // `repeat`: always | session | once | daily (una vez, y no vuelve en un día).
  intro: { repeat: 'session' },
}

/** Variables de build (prefijo VITE_). Solo valores públicos. */
export const env = Object.freeze({
  siteName: import.meta.env.VITE_SITE_NAME || DEFAULTS.siteName,
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

/** Enlace de wa.me a partir de un teléfono escrito como sea. */
function enlaceWhatsapp(telefono, mensaje) {
  const digitos = String(telefono ?? '').replace(/\D/g, '')
  if (!digitos) return ''
  return `https://wa.me/${digitos}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
}

/**
 * Rellena los valores que no se escriben a mano en config.json:
 *
 *   contact.phoneHref     -> "tel:+56968604006"
 *   contact.telegramHref  -> "https://t.me/+56968604006"
 *   whatsapp.agents[].href -> "https://wa.me/56968604006?text=Hola…"
 *   contact.whatsappHref  -> el enlace del primer contacto, que es el que
 *                            usan el pie de página y la página de contacto.
 *
 * Así el número se escribe una sola vez, en formato legible, y nadie tiene que
 * mantener URLs de wa.me a mano.
 */
function derivar(cfg) {
  const contact = { ...cfg.contact }
  const digitos = String(contact.phone ?? '').replace(/\D/g, '')
  if (digitos && !contact.phoneHref) contact.phoneHref = `tel:+${digitos}`

  // Telegram sobre el mismo número: t.me/+<internacional>. Si en
  // `social.telegram` hay un usuario (@jvcloud) o una URL, esa manda: un alias
  // es mejor enlace que un teléfono, y no todo el mundo quiere publicarlo.
  const alias = cfg.social?.telegram
  if (!contact.telegramHref) {
    if (alias) {
      contact.telegramHref = /^https?:\/\//.test(alias)
        ? alias
        : `https://t.me/${String(alias).replace(/^@/, '')}`
    } else if (digitos && contact.telegram) {
      contact.telegramHref = `https://t.me/+${digitos}`
    }
  }

  const whatsapp = { ...cfg.whatsapp }
  // Sin lista de contactos, el del bloque `contact` es el único.
  const lista = whatsapp.agents?.length
    ? whatsapp.agents
    : [{ label: contact.name || 'Escríbenos por WhatsApp', phone: contact.phone }]

  whatsapp.agents = lista
    .map((agente) => ({
      ...agente,
      href: agente.href || enlaceWhatsapp(agente.phone, agente.message ?? whatsapp.message),
    }))
    .filter((agente) => agente.href)

  if (whatsapp.enabled && !contact.whatsappHref) {
    contact.whatsappHref = whatsapp.agents[0]?.href ?? ''
  }

  return { ...cfg, contact, whatsapp }
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
