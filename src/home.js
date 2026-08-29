/**
 * Punto de entrada exclusivo de la portada.
 *
 * Carga primero lo compartido (config, nav, footer y main.css) y encima
 * los estilos de home.css, que solo existen para esta página. El resto
 * del sitio sigue entrando por src/main.js y no ve nada de esto.
 */
import './main.js'
import './styles/home.css'

/** Deja visibles los bloques marcados con `.h-reveal` al entrar en pantalla. */
function activarApariciones() {
  const bloques = document.querySelectorAll('.h-reveal')
  if (!bloques.length) return

  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (sinMovimiento || !('IntersectionObserver' in window)) {
    bloques.forEach((el) => el.classList.add('is-visible'))
    return
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue
        entrada.target.classList.add('is-visible')
        observador.unobserve(entrada.target)
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  )

  bloques.forEach((el) => observador.observe(el))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', activarApariciones, { once: true })
} else {
  activarApariciones()
}
