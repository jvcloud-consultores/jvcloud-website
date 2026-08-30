/**
 * Aparición de bloques al entrar en pantalla.
 *
 * Los elementos con `.h-reveal` nacen invisibles (lo hace jv.css) y se
 * encienden al asomar. Vive aquí y no en la portada porque la clase es parte
 * del lenguaje visual compartido: una página que la use sin llamar a esto
 * dejaría su contenido invisible para siempre.
 *
 * Sin IntersectionObserver o con `prefers-reduced-motion`, se muestran todos
 * de una vez.
 */
export function activarApariciones(raiz = document) {
  const bloques = raiz.querySelectorAll('.h-reveal')
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
