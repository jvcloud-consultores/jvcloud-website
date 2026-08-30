/**
 * Red neuronal de la sección de IA (portada).
 *
 * Cinco capas de nodos unidas por curvas, con pulsos que las recorren: cada
 * cierto tiempo sale una onda que se propaga de izquierda a derecha capa por
 * capa, y entre onda y onda saltan chispas sueltas. Cuando un pulso llega a
 * su nodo, el nodo se enciende un momento.
 *
 * Es puramente decorativa: el <canvas> va con aria-hidden y lo que la sección
 * cuenta está en los bloques de texto de alrededor.
 *
 * Se dibuja sobre canvas y no en SVG porque son ~170 curvas repintadas en
 * cada fotograma; en DOM eso serían 170 nodos que el navegador tendría que
 * volver a componer.
 */

/* --- forma de la red ---------------------------------------------- */
const CAPAS = [4, 7, 8, 7, 4]   // nodos por capa
const AZUL = [35, 77, 127]      // #234d7f, el mismo del logotipo
const CLARO = [120, 170, 225]   // hacia dónde aclara un nodo o un pulso
const ALFA_ENLACE = 0.16

/* --- tiempos ------------------------------------------------------- */
const CADA_ONDA = 3200      // ms entre ondas de propagación
const RETRASO_CAPA = 420    // ms de retraso entre capas dentro de una onda
const RAZON_ONDA = 0.45     // fracción de conexiones que se activa en cada onda
const CHISPAS_POR_S = 4     // pulsos sueltos por segundo, fuera de las ondas
const PULSO_MS = [700, 1200]
const ESTELA = 0.16         // largo de la estela, en fracción de la curva
const APAGADO_MS = 650      // lo que tarda un nodo en dejar de brillar

/**
 * Monta la red dentro de `destino` y arranca el ciclo.
 * @param {HTMLElement} destino contenedor con tamaño propio (aspect-ratio)
 */
export function renderRed(destino) {
  if (!destino) return

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const canvas = document.createElement('canvas')
  canvas.className = 'h-red'
  canvas.setAttribute('aria-hidden', 'true')
  destino.replaceChildren(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  /** Mezcla entre el azul del logotipo (k=0) y el azul claro (k=1). */
  const tinte = (k, a = 1) => {
    const c = AZUL.map((v, i) => Math.round(v + (CLARO[i] - v) * k))
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`
  }

  let ancho = 0, alto = 0, radio = 0
  let nodos = [], enlaces = [], pulsos = []

  /** Rehace la geometría al tamaño actual del contenedor. */
  function construir() {
    ancho = destino.clientWidth
    alto = destino.clientHeight
    if (!ancho || !alto) return false

    // Se topa en 2 a propósito: en pantallas a 3x el coste de repintar ~170
    // curvas por fotograma no se paga con nada que se note.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(ancho * dpr)
    canvas.height = Math.round(alto * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    radio = Math.max(2.5, Math.min(7.5, Math.min(ancho, alto) / 85))
    const margenX = ancho * 0.07
    const margenY = alto * 0.07
    const mayor = Math.max(...CAPAS)
    const pasoY = (alto - margenY * 2) / (mayor - 1)
    const pasoX = (ancho - margenX * 2) / (CAPAS.length - 1)

    nodos = []
    enlaces = []
    pulsos = []

    CAPAS.forEach((n, capa) => {
      for (let i = 0; i < n; i++) {
        nodos.push({
          capa,
          x: margenX + capa * pasoX,
          y: alto / 2 + (i - (n - 1) / 2) * pasoY,
          // Unos pocos nodos nacen más claros, para que la malla no sea plana.
          tinte: (i * 7 + capa * 3) % 5 === 0 ? 0.55 : ((i + capa) % 3 === 0 ? 0.25 : 0),
          brillo: 0,
        })
      }
    })

    for (let capa = 0; capa < CAPAS.length - 1; capa++) {
      const desde = nodos.filter((n) => n.capa === capa)
      const hasta = nodos.filter((n) => n.capa === capa + 1)
      for (const a of desde) {
        for (const b of hasta) {
          const dx = (b.x - a.x) * 0.5
          enlaces.push({ capa, a, b, c1x: a.x + dx, c1y: a.y, c2x: b.x - dx, c2y: b.y })
        }
      }
    }
    return true
  }

  /** Punto sobre la curva de un enlace, con t de 0 a 1. */
  const puntoEn = (e, t) => {
    const u = 1 - t, uu = u * u, tt = t * t
    return {
      x: uu * u * e.a.x + 3 * uu * t * e.c1x + 3 * u * tt * e.c2x + tt * t * e.b.x,
      y: uu * u * e.a.y + 3 * uu * t * e.c1y + 3 * u * tt * e.c2y + tt * t * e.b.y,
    }
  }

  /**
   * Lanza un pulso por un enlace. `desde` puede estar en el futuro: el dibujo
   * salta los pulsos que aún no han empezado, así que las ondas se programan
   * sin un solo setTimeout —y por tanto sin temporizadores sueltos que sigan
   * disparando cuando la escena está pausada.
   */
  const nacer = (e, desde) => {
    pulsos.push({ e, desde, dur: PULSO_MS[0] + Math.random() * (PULSO_MS[1] - PULSO_MS[0]) })
  }

  let proximaOnda = 0
  let sobrante = 0

  function planificar(ahora, dt) {
    if (ahora >= proximaOnda) {
      for (const e of enlaces) {
        if (Math.random() < RAZON_ONDA) {
          nacer(e, ahora + e.capa * RETRASO_CAPA + Math.random() * 180)
        }
      }
      proximaOnda = ahora + CADA_ONDA
    }

    sobrante += dt * CHISPAS_POR_S / 1000
    while (sobrante >= 1) {
      sobrante -= 1
      nacer(enlaces[(Math.random() * enlaces.length) | 0], ahora)
    }
  }

  /* --- dibujo ------------------------------------------------------- */
  function pintarMalla() {
    ctx.clearRect(0, 0, ancho, alto)
    ctx.lineWidth = 1
    ctx.strokeStyle = tinte(0, ALFA_ENLACE)
    // Un solo trazo para las ~170 curvas: repartirlo en 170 stroke() cuesta
    // bastante más.
    ctx.beginPath()
    for (const e of enlaces) {
      ctx.moveTo(e.a.x, e.a.y)
      ctx.bezierCurveTo(e.c1x, e.c1y, e.c2x, e.c2y, e.b.x, e.b.y)
    }
    ctx.stroke()
  }

  function pintarPulsos(ahora) {
    ctx.lineCap = 'round'
    for (let i = pulsos.length - 1; i >= 0; i--) {
      const p = pulsos[i]
      const t = (ahora - p.desde) / p.dur
      if (t >= 1) {
        p.e.b.brillo = 1
        pulsos.splice(i, 1)
        continue
      }
      if (t < 0) continue   // programado, todavía no le toca

      const avance = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      const pasos = 10
      const inicio = Math.max(0, avance - ESTELA)
      let previo = puntoEn(p.e, inicio)

      // La estela se gana alfa y grosor hacia la cabeza.
      for (let s = 1; s <= pasos; s++) {
        const punto = puntoEn(p.e, inicio + (avance - inicio) * s / pasos)
        ctx.strokeStyle = tinte(0.35, 0.9 * (s / pasos))
        ctx.lineWidth = 0.8 + 1.6 * (s / pasos)
        ctx.beginPath()
        ctx.moveTo(previo.x, previo.y)
        ctx.lineTo(punto.x, punto.y)
        ctx.stroke()
        previo = punto
      }

      ctx.save()
      ctx.shadowColor = tinte(0.5, 1)
      ctx.shadowBlur = 10
      ctx.fillStyle = tinte(0.6, 1)
      ctx.beginPath()
      ctx.arc(previo.x, previo.y, 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  function pintarNodos(dt) {
    for (const n of nodos) {
      if (n.brillo > 0) {
        const r = radio + radio * 2.2 * (1 - n.brillo)
        ctx.fillStyle = tinte(0.45, 0.35 * n.brillo)
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()
        n.brillo = Math.max(0, n.brillo - dt / APAGADO_MS)
      }
      ctx.fillStyle = tinte(n.tinte, 1)
      ctx.beginPath()
      ctx.arc(n.x, n.y, radio + radio * 0.35 * n.brillo, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const pintarQuieta = () => { pintarMalla(); pintarNodos(0) }

  /* --- ciclo -------------------------------------------------------
     Igual que la escena del stack: no se anima lo que nadie está viendo.
     Al pausar se sale del rAF y al volver se rearranca desde cero, para no
     arrastrar un dt enorme ni una cola de pulsos caducados. */
  let enPantalla = true
  let corriendo = false
  let ultimo = 0

  const activo = () => enPantalla && document.visibilityState === 'visible'

  function fotograma(ahora) {
    if (!activo()) { corriendo = false; return }
    const dt = Math.min(50, ahora - ultimo)
    ultimo = ahora
    planificar(ahora, dt)
    pintarMalla()
    pintarPulsos(ahora)
    pintarNodos(dt)
    requestAnimationFrame(fotograma)
  }

  function arrancar() {
    if (corriendo || reducido || !activo() || !enlaces.length) return
    corriendo = true
    ultimo = performance.now()
    proximaOnda = ultimo + 400
    pulsos = []
    requestAnimationFrame(fotograma)
  }

  // Puede que todavía no haya tamaño: en desarrollo el CSS llega con el
  // bundle, y sin `aspect-ratio` el contenedor mide cero. No se abandona por
  // eso —el ResizeObserver de abajo vuelve a intentarlo en cuanto lo haya.
  if (construir()) {
    if (reducido) pintarQuieta()
    else arrancar()
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      enPantalla = e.isIntersecting
      arrancar()
    }, { threshold: 0 }).observe(destino)
  }
  document.addEventListener('visibilitychange', arrancar)

  // El contenedor manda el tamaño; el `resize` de la ventana no basta porque
  // la rejilla de la sección cambia de forma en sus propios puntos de corte.
  if ('ResizeObserver' in window) {
    let espera
    new ResizeObserver(() => {
      clearTimeout(espera)
      espera = setTimeout(() => {
        if (!construir()) return
        if (reducido) pintarQuieta()
        else { corriendo = false; arrancar() }
      }, 120)
    }).observe(destino)
  }
}
