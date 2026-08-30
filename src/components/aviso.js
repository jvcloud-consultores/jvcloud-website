/**
 * Barra de aviso, encima del navegador principal.
 *
 * El contenido sale de `announcement` en public/config.json, así que se
 * puede cambiar o apagar sin recompilar.
 *
 * El botón de cerrar la quita de esta vista y nada más: no se guarda nada,
 * ni en localStorage ni en sessionStorage, así que vuelve a salir en la
 * siguiente carga. Es a propósito —el aviso tiene que llegar a todo el
 * mundo cada vez— y por eso no hay `enabled: false` que valga: para
 * apagarla del todo, esa bandera está en config.json.
 */
import { get } from '../lib/config.js'

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/**
 * Inyecta la barra en `<div id="aviso">`, si hay mensaje configurado.
 * @param {HTMLElement} destino
 */
export function renderAviso(destino = document.getElementById('aviso')) {
  if (!destino) return

  const texto = get('announcement.text', '')
  const activo = get('announcement.enabled', true)
  if (!activo || !texto) return

  const etiqueta = get('announcement.cta.label', '')
  const href = get('announcement.cta.href', '/contacto/')

  destino.className = 'aviso'
  destino.setAttribute('role', 'region')
  destino.setAttribute('aria-label', 'Aviso')
  destino.innerHTML = `
    <div class="aviso__inner">
      <p class="aviso__texto">
        ${escapar(texto)}
        ${etiqueta ? `<a class="aviso__cta" href="${escapar(href)}">${escapar(etiqueta)}</a>` : ''}
      </p>
      <button class="aviso__cerrar" type="button" aria-label="Cerrar aviso">
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
        </svg>
      </button>
    </div>
  `

  destino.querySelector('.aviso__cerrar').addEventListener('click', () => destino.remove())
}
