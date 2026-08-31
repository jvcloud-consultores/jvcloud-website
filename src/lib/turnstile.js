/**
 * Widget de Cloudflare Turnstile para el formulario de contacto.
 *
 * Va aparte del envío porque son dos cosas distintas: acá sólo se consigue el
 * token que demuestra que hay una persona al otro lado; quien lo valida es el
 * Worker (proyecto `cloudflare-configs`), nunca el navegador. Un token aceptado
 * acá no significa nada: la única palabra que cuenta es la de siteverify, del
 * lado del servidor.
 *
 * Se enciende desde `public/config.json` (bloque `formulario.turnstile`), así
 * que apagarlo o cambiar de widget no exige recompilar. Apagado, el script de
 * Cloudflare ni siquiera se pide.
 *
 * El widget se dibuja en modo explícito (`render=explicit`) y no por la clase
 * `.cf-turnstile`: así conservamos su id, que es lo que hace falta para pedirle
 * un token nuevo después de cada envío. Los tokens son de un solo uso.
 */

const API = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

/** Nombre del callback global que Turnstile invoca cuando su API está lista. */
const LISTO = '__jvcloudTurnstileListo'

/**
 * Cuánto se espera un token antes de rendirse. Un desafío automático tarda uno
 * o dos segundos; pasado esto, lo que falta es un clic del visitante y hay que
 * decírselo, no seguir esperando en silencio.
 */
const ESPERA_TOKEN = 6000
const REINTENTO = 150

let cargaApi = null

/** Carga la API de Turnstile una sola vez por página. */
function cargarApi() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (cargaApi) return cargaApi

  cargaApi = new Promise((resolver, rechazar) => {
    window[LISTO] = () => resolver(window.turnstile)

    const script = document.createElement('script')
    script.src = `${API}?render=explicit&onload=${LISTO}`
    script.async = true
    script.defer = true
    // Un bloqueador o una red caída dejan el formulario sin token. Se avisa
    // acá y el envío lo traduce a un mensaje con el correo directo.
    script.onerror = () => rechazar(new Error('no se pudo cargar el script de Turnstile'))
    document.head.append(script)
  })

  return cargaApi
}

/**
 * Monta el widget en `contenedor` si la config lo pide.
 *
 * @param {{enabled?: boolean, siteKey?: string, action?: string, theme?: string}} [opciones]
 * @param {Element|null} contenedor
 * @returns {{token: () => Promise<{token: string, motivo: string}>, reset: () => void, mostrar: () => void}|null}
 *          `null` cuando la verificación está apagada o mal configurada.
 */
export function montarTurnstile(opciones, contenedor) {
  const { enabled = false, siteKey = '', action = '', theme = 'light' } = opciones ?? {}
  if (!enabled) return null

  const clave = String(siteKey).trim()
  if (!clave) {
    console.warn('[turnstile] está encendido pero falta formulario.turnstile.siteKey')
    return null
  }
  if (!contenedor) {
    console.warn('[turnstile] no hay contenedor [data-turnstile] en el formulario')
    return null
  }

  // El id llega después (el render es asíncrono), pero el formulario ya puede
  // pedir el token: `token()` espera a que el widget exista.
  let id = null
  let fallo = null

  const montado = cargarApi()
    .then((turnstile) => {
      id = turnstile.render(contenedor, {
        sitekey: clave,
        // `action` tiene que calzar con la `accion` declarada para este
        // formulario en el Worker; si no calzan, siteverify acepta el token y
        // el Worker igual lo rechaza.
        action: action || undefined,
        theme,
        // El sitio es en castellano; el widget sigue al documento.
        language: document.documentElement.lang || 'auto',
        'error-callback': (codigo) => {
          console.warn(`[turnstile] el widget devolvió un error: ${codigo}`)
          // Los 4xxxxx son errores de configuración —sitekey mala, dominio no
          // autorizado (400020, el que sale en localhost)— y no se arreglan
          // esperando. Se marcan como fallo para que el envío avise al tiro y
          // con el mensaje correcto, en vez de pedirle al visitante que marque
          // una casilla que nunca va a aparecer.
          if (String(codigo).startsWith('4')) fallo = new Error(`configuración del widget: ${codigo}`)
        },
      })
    })
    .catch((error) => {
      fallo = error
      console.warn(`[turnstile] ${error.message}`)
    })

  /**
   * Token vigente.
   *
   * En modo "managed" el widget casi siempre se resuelve solo, pero puede
   * tardar, y a veces Cloudflare decide pedir un clic ("Verifique que es un ser
   * humano"). Por eso se espera un rato en vez de mandar el formulario sin
   * token y cosechar un 403, y por eso el resultado distingue dos fracasos muy
   * distintos: el widget que nunca cargó (bloqueador, red, sitekey mala) y el
   * que está ahí, esperando que el visitante lo marque. Se ven igual desde
   * afuera y necesitan mensajes opuestos.
   *
   * @returns {Promise<{token: string, motivo: 'ok'|'no-cargo'|'sin-resolver'}>}
   */
  async function token() {
    await montado
    if (fallo || id === null) return { token: '', motivo: 'no-cargo' }

    const limite = Date.now() + ESPERA_TOKEN
    for (;;) {
      const valor = window.turnstile?.getResponse(id) ?? ''
      if (valor) return { token: valor, motivo: 'ok' }
      if (Date.now() > limite) return { token: '', motivo: 'sin-resolver' }
      await new Promise((sigue) => setTimeout(sigue, REINTENTO))
    }
  }

  /** Lleva el desafío a la vista: sin esto, el aviso habla de algo que no se ve. */
  function mostrar() {
    contenedor.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  /** Pide un token nuevo: el anterior ya se gastó en siteverify. */
  function reset() {
    if (id !== null) window.turnstile?.reset(id)
  }

  return { token, reset, mostrar }
}
