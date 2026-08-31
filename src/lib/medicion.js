/**
 * Medición de uso del sitio: por ahora, Microsoft Clarity.
 *
 * El archivo NO se llama `analytics.js` a propósito. EasyPrivacy, una de las
 * listas que uBlock Origin trae encendidas por defecto, incluye la regla
 * genérica `/lib/analytics.js`, sin dominio ni excepción para localhost. En
 * `npm run dev` Vite sirve cada módulo por su propia URL, así que el bloqueador
 * cortaría el import y con él todo lo que cuelga de `main.js`. Si algún día se
 * renombra, revisar que el nombre nuevo no calce con esas listas.
 *
 * El interruptor vive en `public/config.json` (bloque `analytics.clarity`), no
 * en el HTML ni en una variable de build: encender o apagar la medición, o
 * cambiar de proyecto, no exige recompilar ni desplegar de nuevo. El
 * identificador de Clarity es público por definición —viaja en la URL del
 * script—, así que no hay nada que esconder en el JSON.
 *
 * El script se pide recién cuando corresponde y siempre `async`: nada de esto
 * bloquea la pintura de la página.
 */

import { env } from './config.js'

const CLARITY_TAG = 'https://www.clarity.ms/tag/'

/**
 * Los identificadores de Clarity son alfanuméricos y cortos. Se validan porque
 * el valor viene de un archivo editable a mano y termina dentro de la URL de un
 * script: lo que no calce con esto no se carga.
 */
const ID_CLARITY = /^[a-z0-9]{5,32}$/i

/**
 * Arranca la analítica configurada. Silenciosa a propósito: si está apagada,
 * mal configurada o el visitante pidió no ser rastreado, no pasa nada y el
 * sitio sigue igual.
 *
 * @param {object} config Config ya cargada (ver lib/config.js).
 * @returns {boolean} `true` si se inyectó algo.
 */
export function initAnalytics(config) {
  return initClarity(config?.analytics?.clarity)
}

/**
 * @param {{ enabled?: boolean, projectId?: string, onlyInProduction?: boolean,
 *           respectDoNotTrack?: boolean }} [opciones]
 */
function initClarity({
  enabled = false,
  projectId = '',
  onlyInProduction = true,
  respectDoNotTrack = true,
} = {}) {
  if (!enabled) return false

  const id = String(projectId).trim()
  if (!id) {
    console.warn('[analytics] clarity.enabled es true pero falta clarity.projectId')
    return false
  }
  if (!ID_CLARITY.test(id)) {
    console.warn(`[analytics] clarity.projectId no parece un id de Clarity: "${id}"`)
    return false
  }

  // En dev las visitas son las de quien programa: ensucian las grabaciones y
  // los mapas de calor del proyecto real. Se puede desactivar con
  // `onlyInProduction: false` para probar la instalación.
  if (onlyInProduction && !env.isProd) return false

  if (respectDoNotTrack && noQuiereSerRastreado()) return false

  // Doble arranque (recarga en caliente de Vite, un segundo bootstrap): el tag
  // ya está puesto y volver a inyectarlo duplicaría los eventos.
  if (window.clarity) return false

  // Cola de llamadas previa al script, tal como la arma el fragmento oficial:
  // window.clarity('set', …) funciona desde ya y se reproduce al cargar el tag.
  window.clarity = function () {
    ;(window.clarity.q = window.clarity.q || []).push(arguments)
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `${CLARITY_TAG}${encodeURIComponent(id)}`
  document.head.append(script)

  return true
}

/**
 * Do Not Track y Global Privacy Control. No son obligatorios para Clarity, pero
 * si el navegador ya expresó la preferencia, respetarla sale gratis.
 */
function noQuiereSerRastreado() {
  return (
    navigator.globalPrivacyControl === true ||
    navigator.doNotTrack === '1' ||
    window.doNotTrack === '1' ||
    navigator.msDoNotTrack === '1'
  )
}
