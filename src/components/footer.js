import logo from '../assets/logo.svg?raw'
import { get } from '../lib/config.js'

const LINKS = [
  { href: '/', texto: 'Inicio' },
  { href: '/about/', texto: 'Acerca de' },
  { href: '/portafolio/', texto: 'Portafolio' },
  { href: '/contacto/', texto: 'Contacto' },
]

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/** Inyecta el footer compartido en `<footer id="footer">`. */
export function renderFooter(destino = document.getElementById('footer')) {
  if (!destino) return

  const nombre = get('siteName', 'JVCloud Consultores')
  const email = get('contact.email')
  const telefono = get('contact.phone')
  const telHref = get('contact.phoneHref')
  const whatsapp = get('contact.whatsappHref')
  const ciudad = get('contact.city')
  const linkedin = get('social.linkedin')
  const github = get('social.github')

  const navegacion = LINKS
    .map((l) => `<li><a href="${l.href}">${escapar(l.texto)}</a></li>`)
    .join('')

  const redes = [
    whatsapp && `<li><a href="${escapar(whatsapp)}" rel="noopener noreferrer" target="_blank">WhatsApp</a></li>`,
    linkedin && `<li><a href="${escapar(linkedin)}" rel="noopener noreferrer" target="_blank">LinkedIn</a></li>`,
    github && `<li><a href="${escapar(github)}" rel="noopener noreferrer" target="_blank">GitHub</a></li>`,
  ].filter(Boolean).join('')

  destino.className = 'footer'
  destino.innerHTML = `
    <div class="footer__inner">
      <div class="footer__col">
        <a class="footer__brand" href="/" title="${escapar(nombre)}">${logo}</a>
        ${ciudad ? `<p class="footer__muted">${escapar(ciudad)}</p>` : ''}
        ${email ? `<p><a href="mailto:${escapar(email)}">${escapar(email)}</a></p>` : ''}
        ${telefono ? `<p><a href="${escapar(telHref || `tel:${telefono.replace(/\D/g, '')}`)}">${escapar(telefono)}</a></p>` : ''}
      </div>
      <div class="footer__col">
        <h2 class="footer__title">Sitio</h2>
        <ul class="footer__list">${navegacion}</ul>
      </div>
      ${redes ? `<div class="footer__col">
        <h2 class="footer__title">Contacto</h2>
        <ul class="footer__list">${redes}</ul>
      </div>` : ''}
    </div>
    <div class="footer__legal">
      <p>&copy; ${new Date().getFullYear()} ${escapar(nombre)}. Todos los derechos reservados.</p>
    </div>
  `
}
