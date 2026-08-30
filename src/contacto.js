/**
 * Punto de entrada de /contacto/.
 *
 * Las hojas de estilo (main, jv y contacto) van enlazadas en el <head> del
 * HTML, no importadas aquí: tienen que estar aplicadas en el primer frame.
 *
 * El formulario funciona con y sin backend: si `VITE_API_URL` está definida
 * hace POST a `/contacto`, y si no cae a un `mailto:` con los datos ya
 * escritos. Un sitio estático no debería dejar el formulario muerto.
 */
import './main.js'
import { get } from './lib/config.js'
import { activarApariciones } from './lib/apariciones.js'

const API = import.meta.env.VITE_API_URL

function activarFormulario() {
  const form = document.getElementById('form-contacto')
  if (!form) return

  const estado = document.getElementById('estado-form')
  const boton = form.querySelector('button[type="submit"]')

  const avisar = (texto, tipo = '') => {
    estado.textContent = texto
    estado.dataset.estado = tipo
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()

    if (form.elements['sitio-web'].value) return   // lo rellenó un bot
    if (!form.checkValidity()) {
      avisar('Revisa los campos obligatorios.', 'error')
      form.reportValidity()
      return
    }

    const datos = Object.fromEntries(new FormData(form))
    delete datos['sitio-web']

    if (!API) {
      const destino = get('contact.email', 'josue.olivares@jvcloud.cl')
      const asunto = encodeURIComponent(`Contacto web · ${datos.nombre}`)
      const cuerpo = encodeURIComponent(
        `Nombre: ${datos.nombre}\nCorreo: ${datos.email}\nEmpresa: ${datos.empresa || '-'}\n\n${datos.mensaje}`,
      )
      window.location.href = `mailto:${destino}?subject=${asunto}&body=${cuerpo}`
      avisar('Abrimos tu cliente de correo para enviar el mensaje.', 'ok')
      return
    }

    boton.disabled = true
    avisar('Enviando…')

    try {
      const respuesta = await fetch(`${API.replace(/\/$/, '')}/contacto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      })
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      form.reset()
      avisar('¡Listo! Recibimos tu mensaje y te respondemos pronto.', 'ok')
    } catch (error) {
      console.error('[contacto]', error)
      avisar('No pudimos enviar el mensaje. Escríbenos directo al correo.', 'error')
    } finally {
      boton.disabled = false
    }
  })
}

function iniciar() {
  activarApariciones()
  activarFormulario()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true })
} else {
  iniciar()
}
