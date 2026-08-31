/**
 * Punto de entrada de /contacto/.
 *
 * Las hojas de estilo (main, jv y contacto) van enlazadas en el <head> del
 * HTML, no importadas aquí: tienen que estar aplicadas en el primer frame.
 *
 * El formulario envía a `formulario.endpoint` de public/config.json, que es el
 * Worker del proyecto `cloudflare-configs` (POST /f/jvcloud): valida, filtra
 * bots y avisa por Telegram. Como el destino se lee en runtime, cambiarlo o
 * apagarlo no exige recompilar.
 *
 * Sin endpoint configurado el formulario no queda muerto: cae al `mailto:` de
 * siempre, con el mensaje ya redactado. Un sitio estático no debería dejar el
 * formulario sin salida.
 */
import './main.js'
import { loadConfig, get } from './lib/config.js'
import { montarTurnstile } from './lib/turnstile.js'
import { activarApariciones } from './lib/apariciones.js'

/**
 * Traducción de los códigos que devuelve el Worker (ver la tabla de respuestas
 * en el README de `cloudflare-configs`). Lo que no esté acá usa el `mensaje` de
 * la respuesta, que ya llega redactado en castellano.
 */
const ERRORES_ENVIO = {
  demasiados_envios: 'Enviaste varios mensajes seguidos. Espera un minuto y vuelve a intentarlo.',
  campos_incompletos: 'Faltan datos obligatorios: revisa nombre, correo y mensaje.',
  email_invalido: 'Revisa la dirección de correo: no tiene un formato válido.',
  cuerpo_muy_grande: 'El mensaje es demasiado largo. Resúmelo un poco y vuelve a enviarlo.',
  verificacion_fallida: 'No pudimos verificar que eres una persona. Recarga la página e inténtalo otra vez.',
  origen_no_permitido: 'Este sitio no está autorizado para enviar el formulario. Escríbenos al correo.',
  formulario_desconocido: 'El formulario no está disponible ahora mismo. Escríbenos al correo.',
}

/**
 * El endpoint vive en config.json y se comprueba antes de usarlo: un valor con
 * una errata mandaría los datos del visitante a cualquier parte. Se exige
 * https, salvo en localhost, donde `wrangler dev` sirve por http.
 *
 * @param {string} valor
 * @returns {string} el endpoint, o '' si no sirve
 */
function endpointValido(valor) {
  const crudo = String(valor ?? '').trim()
  if (!crudo) return ''

  try {
    const url = new URL(crudo)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.protocol === 'https:' || (url.protocol === 'http:' && local)) return crudo
    console.warn(`[contacto] el endpoint tiene que ser https: "${crudo}"`)
  } catch {
    console.warn(`[contacto] formulario.endpoint no es una URL válida: "${crudo}"`)
  }
  return ''
}

/**
 * Contador de caracteres de los campos con límite.
 *
 * El número no se escribe acá: sale del `maxlength` del campo, que es el que
 * de verdad manda y el que tiene que calzar con LARGO_MAXIMO del Worker. Así
 * hay un solo lugar que actualizar cuando cambien los límites.
 *
 * @param {HTMLFormElement} form
 */
function activarContadores(form) {
  for (const salida of form.querySelectorAll('[data-cuenta-de]')) {
    const campo = form.querySelector(`#${salida.dataset.cuentaDe}`)
    const limite = Number(campo?.getAttribute('maxlength'))
    if (!campo || !limite) continue

    const pintar = () => {
      const usados = campo.value.length
      salida.textContent = `${usados}/${limite}`
      // Se avisa recién en el último 10%: antes, el contador es un dato de
      // fondo y no tiene por qué llamar la atención.
      salida.toggleAttribute('data-cerca', usados >= limite * 0.9)
    }

    campo.addEventListener('input', pintar)
    // También después de un envío: form.reset() no dispara 'input'.
    form.addEventListener('reset', () => setTimeout(pintar))
    pintar()
  }
}

function activarFormulario() {
  const form = document.getElementById('form-contacto')
  if (!form) return

  activarContadores(form)

  const estado = document.getElementById('estado-form')
  const boton = form.querySelector('button[type="submit"]')
  const botonTexto = boton?.querySelector('.btn__texto')
  const exito = form.querySelector('.c-exito')
  const otro = form.querySelector('.c-otro')
  const cajaTurnstile = form.querySelector('[data-turnstile]')

  const endpoint = endpointValido(get('formulario.endpoint', ''))
  const ROTULO = botonTexto?.textContent ?? 'Enviar mensaje'
  const correo = get('contact.email', 'josue.olivares@jvcloud.cl')

  /**
   * Única vía para hablarle al visitante: el renglón bajo el botón —que se
   * queda mientras corrige— y el aviso flotante, que le llama la atención. Todo
   * mensaje sale por acá, para que un error se vea igual de fuerte que un
   * acierto: al pie de un formulario largo, el renglón solo se pierde.
   */
  const informar = (texto, tipo = '') => {
    if (estado) {
      estado.textContent = texto
      estado.dataset.estado = tipo
    }
    avisoFlotante(texto, tipo)
  }

  /** Botón trabajando: sin clics, con aro girando y diciendo lo que hace. */
  const cargando = (activo) => {
    if (!boton) return
    boton.disabled = activo
    boton.toggleAttribute('data-cargando', activo)
    if (botonTexto) botonTexto.textContent = activo ? 'Enviando…' : ROTULO
  }

  /**
   * Mensaje entregado: el botón se va y en su lugar queda la confirmación. El
   * desafío de Turnstile también se esconde; sin formulario que enviar, ahí
   * sólo estorba.
   */
  const mostrarExito = (mensaje) => {
    form.reset()
    form.dispatchEvent(new Event('reset'))
    if (estado) {
      estado.textContent = ''
      estado.dataset.estado = ''
    }
    if (boton) boton.hidden = true
    if (cajaTurnstile) cajaTurnstile.hidden = true
    if (exito) exito.hidden = false
    avisoFlotante(mensaje, 'ok')
  }

  // El widget se dibuja al cargar, no al enviar: en modo "managed" tarda un
  // momento en resolverse y así llega con el token listo cuando toca.
  const turnstile = montarTurnstile(get('formulario.turnstile', {}), cajaTurnstile)

  /** Vuelve al formulario en blanco: sin esto, un segundo mensaje exigía recargar. */
  otro?.addEventListener('click', () => {
    if (exito) exito.hidden = true
    if (cajaTurnstile) cajaTurnstile.hidden = false
    if (boton) boton.hidden = false
    // El token anterior ya se gastó; el widget vuelve a empezar.
    turnstile?.reset()
    form.querySelector('#nombre')?.focus()
  })

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()

    if (!form.checkValidity()) {
      informar('Revisa los campos obligatorios.', 'error')
      form.reportValidity()
      return
    }

    // El campo trampa viaja tal cual lo entrega el formulario: es el Worker
    // quien decide qué hacer con él, no esta página. (Responde "recibido" en
    // falso, así el bot no aprende que fue detectado.)
    const datos = Object.fromEntries(new FormData(form))

    if (!endpoint) {
      const asunto = encodeURIComponent(`Contacto web · ${datos.nombre}`)
      const cuerpo = encodeURIComponent(
        `Nombre: ${datos.nombre}\nCorreo: ${datos.email}\nEmpresa: ${datos.empresa || '-'}\n\n${datos.mensaje}`,
      )
      window.location.href = `mailto:${correo}?subject=${asunto}&body=${cuerpo}`
      informar('Abrimos tu cliente de correo para enviar el mensaje.', 'ok')
      return
    }

    // Doble envío: con la red lenta es fácil pulsar dos veces, y cada envío
    // gasta una de las cinco fichas por minuto que da el Worker.
    cargando(true)
    if (estado) {
      estado.textContent = ''
      estado.dataset.estado = ''
    }

    try {
      if (turnstile) {
        // Quien valida el token es el Worker; esto sólo lo consigue y lo adjunta.
        const { token, motivo } = await turnstile.token()

        // Un desafío sin resolver no es un error del sitio: falta el clic del
        // visitante, y el aviso tiene que pedirle eso y no mandarlo a recargar.
        if (motivo === 'sin-resolver') {
          turnstile.mostrar()
          informar('Marca la casilla de verificación y vuelve a enviar.', 'error')
          return
        }
        if (!token) {
          informar(
            `No pudimos cargar la verificación anti-bots. Recarga la página o escríbenos a ${correo}.`,
            'error',
          )
          return
        }
        datos['cf-turnstile-response'] = token
      }

      const respuesta = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
      // El Worker responde JSON también en los errores; si algo se rompió antes
      // de llegar a él (un proxy, una página de error), no se asume nada.
      const cuerpo = await respuesta.json().catch(() => ({}))

      if (respuesta.ok && cuerpo.ok) {
        mostrarExito(cuerpo.mensaje ?? '¡Listo! Recibimos tu mensaje y te respondemos pronto.')
        return
      }

      const detalle = ERRORES_ENVIO[cuerpo.codigo] ?? cuerpo.mensaje
      informar(detalle ?? `No pudimos enviar el mensaje. Escríbenos a ${correo}.`, 'error')
    } catch (error) {
      // Acá sólo cae lo que ni siquiera llegó a respuesta: sin conexión, DNS,
      // CORS rechazado. El correo directo es la salida que sí funciona.
      console.error('[contacto]', error)
      informar(`No pudimos conectar. Escríbenos a ${correo}.`, 'error')
    } finally {
      cargando(false)
      // El token es de un solo uso: haya salido bien o mal, el siguiente envío
      // necesita uno nuevo.
      turnstile?.reset()
    }
  })
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Aviso flotante de confirmación.
 *
 * El renglón debajo del botón se pierde: queda al pie de un formulario largo y
 * con el mismo peso que la pista de al lado. Esto aparece encima de todo, al
 * centro abajo, que es justo donde está mirando quien acaba de enviar.
 *
 * Se va solo a los pocos segundos porque la confirmación permanente ya quedó
 * dentro del formulario; esto es el golpe de atención, no el registro.
 *
 * Se arma con nodos y no con innerHTML: el texto llega desde la respuesta del
 * servidor y no tiene por qué interpretarse como marcado.
 */
function avisoFlotante(mensaje, tipo = 'ok') {
  if (!mensaje) return
  document.querySelector('.c-flotante')?.remove()

  const esError = tipo === 'error'

  const aviso = document.createElement('div')
  aviso.className = 'c-flotante'
  aviso.dataset.tipo = esError ? 'error' : 'ok'
  // Un error interrumpe ("alert"); una confirmación espera su turno ("status").
  aviso.setAttribute('role', esError ? 'alert' : 'status')

  const icono = document.createElementNS(SVG_NS, 'svg')
  icono.setAttribute('class', 'c-flotante__icono')
  icono.setAttribute('viewBox', '0 0 48 48')
  icono.setAttribute('aria-hidden', 'true')
  icono.setAttribute('focusable', 'false')

  const circulo = document.createElementNS(SVG_NS, 'circle')
  circulo.setAttribute('class', 'trazo')
  circulo.setAttribute('cx', '24')
  circulo.setAttribute('cy', '24')
  circulo.setAttribute('r', '18')
  icono.append(circulo)

  if (esError) {
    // Signo de exclamación: el palo y el punto.
    const palo = document.createElementNS(SVG_NS, 'path')
    palo.setAttribute('class', 'trazo')
    palo.setAttribute('d', 'M24 14 V27')
    const punto = document.createElementNS(SVG_NS, 'circle')
    punto.setAttribute('class', 'relleno')
    punto.setAttribute('cx', '24')
    punto.setAttribute('cy', '33.5')
    punto.setAttribute('r', '2')
    icono.append(palo, punto)
  } else {
    const visto = document.createElementNS(SVG_NS, 'path')
    visto.setAttribute('class', 'trazo')
    visto.setAttribute('d', 'M15 24.5 L21 30.5 L33 18')
    icono.append(visto)
  }

  const texto = document.createElement('p')
  texto.textContent = mensaje

  aviso.append(icono, texto)
  document.body.append(aviso)

  const cerrar = () => {
    clearTimeout(reloj)
    aviso.dataset.yendose = 'true'
    // La animación de salida dura 300 ms, pero con "reducir movimiento" termina
    // de inmediato: el temporizador es sólo el respaldo si el evento no llega.
    aviso.addEventListener('animationend', () => aviso.remove(), { once: true })
    setTimeout(() => aviso.remove(), 600)
  }

  const reloj = setTimeout(cerrar, esError ? 9000 : 6500)
  aviso.addEventListener('click', cerrar)
}

/**
 * El formulario necesita la config ya cargada —endpoint y Turnstile salen de
 * ahí—, así que espera a `loadConfig()`. La promesa está cacheada: main.js ya
 * la pidió, acá no se dispara un segundo fetch.
 */
async function iniciar() {
  activarApariciones()
  await loadConfig()
  activarFormulario()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true })
} else {
  iniciar()
}
