/**
 * Escena isométrica del stack tecnológico (portada).
 *
 * Dibuja un servidor sobre el que van cayendo capas, cada una con el
 * nombre de una tecnología, y las va absorbiendo por abajo. Alrededor,
 * los equipos y servicios conectados con pistas por las que viaja una
 * señal.
 *
 * La escena se monta primero a la vista —la plataforma baja girando, van
 * apareciendo los objetos encima y se levanta la torre— y solo entonces
 * empieza el ciclo de siempre.
 *
 * La lista de tecnologías NO vive aquí: se lee del `<ul data-tecnologias>`
 * del HTML, que además queda visible para lectores de pantalla y
 * buscadores aunque el JS no llegue a ejecutarse.
 *
 * Todo el dibujo es decorativo: el <svg> va con aria-hidden.
 */

// El logotipo se trae en crudo y se incrusta tal cual: su viewBox ya viene
// recortado al dibujo, así que la marca del piso solo tiene que decir en qué
// caja quiere que entre. El azul viene en atributos, y el CSS lo rebaja.
import logotipo from '../assets/jvcloud-vertical-ajustado.svg?raw'

const NS = 'http://www.w3.org/2000/svg'

/* --- Tiempos y geometría ------------------------------------------ */
const TORRE_MAX = 5      // capas visibles antes de que la de abajo se hunda
const CAIDA_MS = 600
const ESPERA_MS = 300
const HUNDIDO_MS = 550
const PAUSA_MS = 450
const PASO = 18          // separación vertical entre capas

// Posiciones en pantalla (isometría 2:1)
const SERVIDOR = { x: 480, y: 430 }
const NOTEBOOK = { x: 200, y: 540 }
const TABLET = { x: 330, y: 600 }
const TELEFONO = { x: 410, y: 628 }
const MODULOS = [
  { x: 175, y: 440, label: 'integración' },
  { x: 710, y: 395, label: 'respaldos', to: 'right', flip: true },
  { x: 650, y: 575, label: 'monitoreo' },
]
const IA = { x: 300, y: 345 }
const API = { x: 800, y: 485 }
const PISO = { x: 450, y: 470, hw: 420, hd: 210, h: 14 }
// Lado del cuadro donde se encaja el logotipo del piso, en unidades del plano
// de la cara superior. Se pinta centrado en la huella del servidor y por
// debajo de ella (el zócalo mide 162 de medio lado), así que se ve mientras la
// plataforma baja sola y desaparece en cuanto el servidor se posa encima.
const LOGO_LADO = 150

// Chasis del servidor y capas
const HWo = 150, HDo = 75, HWi = 134, HDi = 67, FONDO = 32, MURO = 44
const HW = 110, HD = 55, T = 14

// La escena está espejada (el notebook mira a la derecha); los textos se
// compensan en el helper `el` para que no salgan al revés.
const ESPEJO = true

const ANCHO = 900

const ESQUELETO = `
<svg id="jvEscena" viewBox="0 0 ${ANCHO} 720" xmlns="${NS}" aria-hidden="true" focusable="false">
  <defs><clipPath id="jvClipInterior"><polygon id="jvClipPoly"/></clipPath></defs>
  <g id="jvMundo" transform="translate(${ANCHO},0) scale(-1,1)">
    <g id="jvPiso"></g>
    <g id="jvPistas"></g>
    <g id="jvObjetos"></g>
  </g>
</svg>`

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const barajar = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const EASE = {
  outBack: (t) => { const c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2 },
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
}

/**
 * Monta la escena dentro de `destino` y arranca el ciclo.
 * @param {HTMLElement} destino
 * @param {string[]} tecnologias
 * @param {Promise<void>} [esperar] se aguarda antes de la animación de
 *   entrada (no antes de dibujar). La portada pasa aquí el final del telón,
 *   para que la entrada no se represente tapada.
 */
export function renderStack(destino, tecnologias = [], esperar = Promise.resolve()) {
  if (!destino || !tecnologias.length) return

  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  destino.innerHTML = `
    <div class="h-stack__lienzo">${ESQUELETO}</div>
    <div class="h-stack__hud" aria-hidden="true">
      <p class="h-stack__eyebrow">Utilizamos</p>
      <p class="h-stack__tech"></p>
      <p class="h-stack__contador"></p>
    </div>`

  const svg = destino.querySelector('#jvEscena')
  const $ = (id) => svg.querySelector(`#${id}`)
  const hudEl = destino.querySelector('.h-stack__hud')
  const nombreEl = destino.querySelector('.h-stack__tech')
  const contadorEl = destino.querySelector('.h-stack__contador')

  /* --- helpers de dibujo ------------------------------------------ */
  const el = (tag, attrs = {}, padre) => {
    const n = document.createElementNS(NS, tag)
    if (ESPEJO && tag === 'text') {
      // Des-espejar el texto sobre su propio eje x.
      const x = parseFloat(attrs.x || 0)
      const propio = (attrs.transform || '').replace('skewY(26.57)', 'skewY(-26.57)')
      attrs = { ...attrs, transform: `translate(${2 * x},0) scale(-1,1)${propio ? ' ' + propio : ''}` }
    }
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
    if (padre) padre.appendChild(n)
    return n
  }
  const pts = (a) => a.map((p) => p.join(',')).join(' ')

  /** Caja isométrica: centro (cx,cy) del piso, media anchura, media profundidad, alto. */
  const caja = (padre, cx, cy, hw, hd, h, cls = {}) => {
    const g = el('g', { transform: `translate(${cx},${cy})` }, padre)
    el('polygon', { class: cls.left || 'f-left', points: pts([[-hw, -h], [0, hd - h], [0, hd], [-hw, 0]]) }, g)
    el('polygon', { class: cls.right || 'f-right', points: pts([[hw, -h], [0, hd - h], [0, hd], [hw, 0]]) }, g)
    el('polygon', { class: cls.top || 'f-top', points: pts([[0, -hd - h], [hw, -h], [0, hd - h], [-hw, -h]]) }, g)
    return g
  }

  /* --- piso con grilla -------------------------------------------- */
  {
    const { x, y, hw, hd, h } = PISO
    const f = $('jvPiso')
    caja(f, x, y, hw, hd, h, { left: 'floor-side', right: 'floor-side', top: 'floor-top' })
    const grid = el('g', { class: 'floor-grid', transform: `translate(${x},${y - h})` }, f)
    const N = 10
    for (let i = 1; i < N; i++) {
      const t = i / N
      el('line', { x1: -hw + hw * t, y1: -hd * t, x2: hw * t, y2: hd - hd * t }, grid)
      el('line', { x1: hw - hw * t, y1: -hd * t, x2: -hw * t, y2: hd - hd * t }, grid)
    }

    // Logotipo pintado sobre la cara superior, como una marca en el suelo. Va
    // detrás de todo (el piso es el primer grupo) pero encima de la grilla.
    //
    // La misma matriz que usan el teclado del portátil y la red de la IA tumba
    // el dibujo sobre el plano de la cara superior; el `scale(-1,1)` deshace el
    // espejo del mundo, que si no lo dejaría al revés.
    const marca = el('g', {
      class: 'floor-logo',
      transform: `translate(${x},${y}) scale(-1,1) matrix(1,0.5,-1,0.5,0,${-h})`,
    }, f)

    // Dónde cae el logotipo: en el centro de la huella del servidor, no en el
    // del piso. Ojo con el espejo del mundo, que es de donde salen las `x`
    // restadas: sobre este plano ya deshecho, el eje que en pantalla va hacia
    // la derecha es el que en coordenadas de dibujo va hacia la izquierda.
    const aPlano = (dx, dy) => ({ u: dx / 2 + dy, v: dy - dx / 2 })
    const centro = aPlano(
      (ANCHO - SERVIDOR.x) - (ANCHO - x),   // el zócalo, respecto al piso
      (SERVIDOR.y + MURO) - (y - h),
    )

    const doc = new DOMParser().parseFromString(logotipo, 'image/svg+xml')
    const dibujo = document.importNode(doc.documentElement, true)
    // Un <svg> anidado se encarga solo de escalar y centrar su viewBox dentro
    // de la caja que se le dé (preserveAspectRatio por defecto).
    dibujo.setAttribute('x', centro.u - LOGO_LADO / 2)
    dibujo.setAttribute('y', centro.v - LOGO_LADO / 2)
    dibujo.setAttribute('width', LOGO_LADO)
    dibujo.setAttribute('height', LOGO_LADO)
    marca.appendChild(dibujo)
  }

  /* --- pistas: cada componente conectado al servidor --------------- */
  const aIso = (p) => ({ u: p.x / 2 + p.y, v: p.y - p.x / 2 })
  const aPantalla = (q) => ({ x: q.u - q.v, y: (q.u + q.v) / 2 })

  const pista = (desde, hasta, dur, retraso, flip = false) => {
    const a = aIso(desde), b = aIso(hasta)
    const medio = aPantalla(flip ? { u: a.u, v: b.v } : { u: b.u, v: a.v })
    const d = `M${desde.x} ${desde.y} L${medio.x} ${medio.y} L${hasta.x} ${hasta.y}`
    const off = PISO.h
    el('path', { class: 'trace', d, transform: `translate(0,${-off})` }, $('jvPistas'))
    if (sinMovimiento) return
    const s = el('circle', { class: 'signal', r: 4, transform: `translate(0,${-off})` }, $('jvPistas'))
    el('animateMotion', {
      dur: `${dur}s`, begin: `-${(retraso * dur).toFixed(2)}s`, repeatCount: 'indefinite', path: d,
    }, s)
  }

  const esquina = { x: SERVIDOR.x, y: SERVIDOR.y + HDo + MURO }
  const caraIzq = (x) => ({ x, y: esquina.y - (SERVIDOR.x - x) * 0.5 })
  const esquinaDer = { x: SERVIDOR.x + HWo, y: esquina.y - HDo }

  MODULOS.forEach((m, i) =>
    pista({ x: m.x, y: m.y }, m.to === 'right' ? esquinaDer : esquina, 3 + i * 0.7, (i * 0.23) % 1, !!m.flip))
  pista(IA, { x: SERVIDOR.x - HWo, y: esquina.y - HDo }, 3.4, 0.35)
  pista(API, esquinaDer, 3.8, 0.65, true)
  // Los equipos entran de frente por la cara izquierda. La pista arranca en
  // el borde del aparato, no en su centro, para ver la señal desde el inicio.
  const borde = (p, d) => ({ x: p.x + d, y: p.y - d / 2 })
  pista(borde(NOTEBOOK, 40), caraIzq(SERVIDOR.x - 149), 3.2, 0.1, true)
  pista(borde(TABLET, 25), caraIzq(SERVIDOR.x - 24), 3.6, 0.5, true)
  pista(borde(TELEFONO, 12), esquina, 4.0, 0.8, true)

  /* --- objetos de la escena, de atrás hacia adelante --------------- */
  const dibujarModulo = (p) => {
    const hw = 54, hd = 27, uh = 9, hueco = 2, unidades = 3
    const g = el('g', {}, $('jvObjetos'))
    for (let k = 0; k < unidades; k++) {
      const u = caja(g, p.x, p.y - k * (uh + hueco), hw, hd, uh)
      const yL = (x) => (x + hw) * (hd / hw) - uh
      const yR = (x) => (hw - x) * (hd / hw) - uh
      for (let j = 0; j < 5; j++) {
        const x = -hw + 10 + j * 7
        el('line', { class: 'vent', x1: x, y1: yL(x) + 2.5, x2: x, y2: yL(x) + uh - 2.5 }, u)
      }
      ;[0, 1].forEach((j) => {
        const x = hw - 10 - j * 7
        el('circle', { class: 'led' + (j === 0 ? ' on' : ''), cx: x, cy: yR(x) + uh / 2, r: 1.6 }, u)
      })
      const x0 = hw - 24, x1 = hw - 40
      el('polygon', { class: 'b-port', points: pts([[x0, yR(x0) + 2.5], [x1, yR(x1) + 2.5], [x1, yR(x1) + uh - 2.5], [x0, yR(x0) + uh - 2.5]]) }, u)
    }
    if (p.label) {
      const t = el('text', { class: 'scene-label', x: p.x, y: p.y - unidades * (uh + hueco) - hd - 8 }, g)
      t.textContent = p.label
    }
  }

  // IA: chip elevado con una pequeña red neuronal en la cara superior.
  const dibujarIa = (p) => {
    const hw = 62, hd = 31, h = 18
    const g = caja($('jvObjetos'), p.x, p.y - 6, hw, hd, h)
    for (let k = 1; k <= 5; k++) {
      const xl = -hw + k * (hw / 6), yl = (xl + hw) * (hd / hw)
      el('line', { class: 'pin', x1: xl, y1: yl, x2: xl, y2: yl + 6 }, g)
      const xr = hw - k * (hw / 6), yr = (hw - xr) * (hd / hw)
      el('line', { class: 'pin', x1: xr, y1: yr, x2: xr, y2: yr + 6 }, g)
    }
    const red = el('g', { transform: `matrix(1,0.5,-1,0.5,0,${-h})` }, g)
    const capas = [[-18, [-14, 0, 14]], [0, [-18, -6, 6, 18]], [18, [-8, 8]]]
    for (let i = 0; i < capas.length - 1; i++)
      for (const a of capas[i][1])
        for (const b of capas[i + 1][1])
          el('line', { class: 'sinapsis', x1: capas[i][0], y1: a, x2: capas[i + 1][0], y2: b }, red)
    capas.forEach(([x, ys], i) =>
      ys.forEach((y) => el('circle', { class: 'neurona' + (i === 2 ? ' salida' : ''), cx: x, cy: y, r: 2.6 }, red)))
    if (!sinMovimiento) {
      const pulso = el('circle', { class: 'pulso', cx: 18, cy: -8, r: 2.6 }, red)
      el('animate', { attributeName: 'r', values: '2.6;9', dur: '1.6s', repeatCount: 'indefinite' }, pulso)
      el('animate', { attributeName: 'stroke', values: '#6583a6;#ffffff', dur: '1.6s', repeatCount: 'indefinite' }, pulso)
    }
    const t = el('text', { class: 'scene-label', x: 0, y: -h - hd - 8 }, g)
    t.textContent = 'IA'
  }

  // APIs: nodo hexagonal.
  const dibujarApi = (p) => {
    const g = el('g', { transform: `translate(${p.x},${p.y})` }, $('jvObjetos'))
    const r = 36, h = 22
    const hex = (z) => [0, 1, 2, 3, 4, 5].map((i) => {
      const a = Math.PI / 6 + i * Math.PI / 3
      return [Math.cos(a) * r, Math.sin(a) * r * 0.5 - z]
    })
    const arriba = hex(h), abajo = hex(0)
    ;[[2, 3, 'c1'], [1, 2, 'c2'], [0, 1, 'c3'], [5, 0, 'c4']].forEach(([a, b, c]) =>
      el('polygon', { class: `hex ${c}`, points: pts([arriba[a], arriba[b], abajo[b], abajo[a]]) }, g))
    el('polygon', { class: 'hex hex-top', points: pts(arriba) }, g)
    const t = el('text', { class: 'api-label', x: 0, y: -h + 1 }, g)
    t.textContent = '{ API }'
    ;[0, 1, 2].forEach((i) =>
      el('circle', { class: 'led' + (i < 2 ? ' on' : ''), cx: -18 + i * 8, cy: r * 0.5 - h / 2 - 2 + i * 2.2, r: 1.6 }, g))
    const l = el('text', { class: 'scene-label', x: 0, y: -h - r * 0.5 - 8 }, g)
    l.textContent = 'APIs'
  }

  // Aparato plano (tablet) apoyado en el piso.
  const dibujarPlano = (p, hw, hd, h) => {
    const g = caja($('jvObjetos'), p.x, p.y, hw, hd, h)
    const m = 5
    el('polygon', { class: 'screen', points: pts([[0, -hd - h + m], [hw - m * 2, -h], [0, hd - h - m], [-hw + m * 2, -h]]) }, g)
    el('polygon', { class: 'screen-inner', points: pts([[0, -hd - h + m + 3], [hw - m * 2 - 6, -h], [0, hd - h - m - 3], [-hw + m * 2 + 6, -h]]) }, g)
    ;[0.38, 0.3, 0.22].forEach((f, i) => {
      const x0 = -hw * f + 8, len = hw * f * 1.1, yb = -h - hd * 0.35 + i * (hd * 0.3)
      el('line', { class: 'screen-line', x1: x0, y1: yb + x0 * 0.5, x2: x0 + len, y2: yb + (x0 + len) * 0.5 }, g)
    })
    el('circle', { class: 'led on', cx: hw - m - 2, cy: -h + 1, r: 1.5 }, g)
  }
  const dibujarTablet = (p) => dibujarPlano(p, 52, 26, 4)

  // Teléfono de pie, en el plano de la cara frontal derecha.
  const dibujarTelefono = (p) => {
    const g = el('g', { transform: `translate(${p.x},${p.y})` }, $('jvObjetos'))
    el('ellipse', { class: 'sombra', cx: 0, cy: 2, rx: 22, ry: 6 }, g)
    const W = 26, H = 50, D = 4
    const cara = el('g', { transform: `matrix(1,-0.5,0,1,${-W / 2},${W / 4})` }, g)
    el('rect', { class: 'tel-canto', x: -D, y: -H - D / 2, width: W, height: H, rx: 5 }, cara)
    el('rect', { class: 'tel-cuerpo', x: 0, y: -H, width: W, height: H, rx: 5 }, cara)
    el('rect', { class: 'screen', x: 2.5, y: -H + 4, width: W - 5, height: H - 8, rx: 3 }, cara)
    el('rect', { class: 'screen-inner', x: 4, y: -H + 8, width: W - 8, height: H - 14, rx: 2 }, cara)
    el('circle', { class: 'tel-camara', cx: W / 2, cy: -H + 6, r: 1.2 }, cara)
    ;[[6, 12], [6, 9], [6, 14]].forEach(([x0, len], i) =>
      el('line', { class: 'screen-line', x1: x0, y1: -H + 16 + i * 6, x2: x0 + len, y2: -H + 16 + i * 6 }, cara))
    el('line', { class: 'tel-barra', x1: W / 2 - 4, y1: -6, x2: W / 2 + 4, y2: -6 }, cara)
  }

  const dibujarNotebook = (p) => {
    const g = caja($('jvObjetos'), p.x, p.y, 84, 42, 7)
    // Teclado y trackpad, dibujados en el plano de la cara superior.
    const kb = el('g', { transform: 'matrix(1,0.5,-1,0.5,0,-7)' }, g)
    const tecla = (u, v, w, h) => el('rect', { class: 'tecla', x: u, y: v, width: w, height: h, rx: 0.5 }, kb)
    for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) tecla(-38 + c * 6.4 + r * 0.4, -35 + r * 6.2, 5, 4.8)
    const sr = -35 + 4 * 6.2
    tecla(-36.4, sr, 8, 4.8); tecla(-27, sr, 5, 4.8); tecla(-20.6, sr, 27, 4.8)
    tecla(7.8, sr, 5, 4.8); tecla(14.2, sr, 5, 4.8); tecla(20.6, sr, 12, 4.8)
    el('rect', { class: 'trackpad', x: -13, y: 4, width: 26, height: 20, rx: 2 }, kb)
    for (let i = 0; i < 6; i++) el('line', { class: 'altavoz', x1: -40 + i * 2, y1: 6, x2: -40 + i * 2, y2: 20 }, kb)
    // Pantalla apoyada en el borde trasero, inclinada hacia atrás.
    const H = 78, tilt = 14
    el('polygon', { class: 'screen', points: pts([[0, -42 - 7], [84, -7], [84 + tilt, -7 - tilt / 2 - H], [tilt, -42 - 7 - tilt / 2 - H]]) }, g)
    el('polygon', { class: 'screen-inner', points: pts([[8, -42 - 7], [76, -7 - 4], [76 + tilt - 1, -7 - tilt / 2 - H + 8], [8 + tilt - 1, -42 - 7 - tilt / 2 - H + 8]]) }, g)
    ;[[14, 30], [22, 46], [18, 36], [26, 24]].forEach(([x0, len], i) => {
      const yb = -42 - 7 - tilt / 2 - H + 22 + i * 14
      el('line', { class: 'screen-line', x1: x0, y1: yb + (x0 - tilt) * 0.5, x2: x0 + len, y2: yb + (x0 + len - tilt) * 0.5 }, g)
    })
  }

  let chasis
  const dibujarServidor = (p) => {
    // Zócalo y chasis van juntos en un grupo con nombre: el resto de objetos
    // ya ocupa un solo nodo de `jvObjetos` y la entrada los trata a todos por
    // igual, uno por objeto.
    const g = el('g', { id: 'jvServidor' }, $('jvObjetos'))
    caja(g, p.x, p.y + MURO + 9, HWo + 12, HDo + 6, 9,
      { top: 'plinth-top', left: 'plinth-side', right: 'plinth-side' })
    chasis = el('g', { transform: `translate(${p.x},${p.y})` }, g)
    el('polygon', { class: 'b-back-l', points: pts([[-HWi, 0], [0, -HDi], [0, -HDi + FONDO], [-HWi, FONDO]]) }, chasis)
    el('polygon', { class: 'b-back-r', points: pts([[HWi, 0], [0, -HDi], [0, -HDi + FONDO], [HWi, FONDO]]) }, chasis)
    el('polygon', { class: 'b-floor', points: pts([[0, -HDi + FONDO], [HWi, FONDO], [0, HDi + FONDO], [-HWi, FONDO]]) }, chasis)
    el('polygon', { class: 'rim', id: 'jvRimBack', points: pts([[-HWo, 0], [0, -HDo], [HWo, 0], [HWi, 0], [0, -HDi], [-HWi, 0]]) }, chasis)
    el('path', { class: 'rim-edge', d: `M${-HWo} 0 L0 ${-HDo} L${HWo} 0 M${-HWi} 0 L0 ${-HDi} L${HWi} 0` }, chasis)
    el('g', { id: 'jvInterior', 'clip-path': 'url(#jvClipInterior)' }, chasis)
    el('polygon', { class: 'b-front-l', points: pts([[-HWo, 0], [0, HDo], [0, HDo + MURO], [-HWo, MURO]]) }, chasis)
    el('polygon', { class: 'b-front-r', points: pts([[HWo, 0], [0, HDo], [0, HDo + MURO], [HWo, MURO]]) }, chasis)
    el('polygon', { class: 'rim', id: 'jvRimFront', points: pts([[-HWo, 0], [0, HDo], [HWo, 0], [HWi, 0], [0, HDi], [-HWi, 0]]) }, chasis)
    el('path', { class: 'rim-edge', d: `M${-HWo} 0 L0 ${HDo} L${HWo} 0 M${-HWi} 0 L0 ${HDi} L${HWi} 0` }, chasis)
    el('path', { class: 'rim-edge', d: `M${-HWo} 0 V${MURO} M0 ${HDo} V${HDo + MURO} M${HWo} 0 V${MURO}` }, chasis)

    const yL = (x) => (x + HWo) * (HDo / HWo)
    const yR = (x) => (HWo - x) * (HDo / HWo)
    const rect = (cls, yf, x0, x1, off, h) =>
      el('polygon', { class: cls, points: pts([[x0, yf(x0) + off], [x1, yf(x1) + off], [x1, yf(x1) + off + h], [x0, yf(x0) + off + h]]) }, chasis)

    // Cara frontal izquierda: encendido, LEDs, puertos y etiqueta.
    const px = -HWo + 20
    el('circle', { class: 'b-power', cx: px, cy: yL(px) + 14, r: 5 }, chasis)
    el('circle', { class: 'b-power-dot', cx: px, cy: yL(px) + 14, r: 1.8 }, chasis)
    ;[0, 1, 2].forEach((i) =>
      el('circle', { class: 'led' + (i < 2 ? ' on' : ''), cx: px + 14 + i * 8, cy: yL(px + 14 + i * 8) + 14, r: 2 }, chasis))
    for (let k = 0; k < 4; k++) rect('b-port', yL, px + 4 + k * 12, px + 12 + k * 12, 24, 7)
    el('circle', { class: 'b-glow', id: 'jvGlow', cx: px + 30, cy: yL(px + 30) + 14, r: 3.2 }, chasis)
    const lx = -42
    const lbl = el('text', { class: 'base-label', x: lx, y: yL(lx) + 31 + (ESPEJO ? 1 : -1) * lx * 0.5, transform: 'skewY(26.57)' }, chasis)
    lbl.textContent = 'JV Cloud'

    // Cara frontal derecha: rejilla y asa.
    for (let k = 0; k < 14; k++) {
      const x = 12 + k * 9
      el('line', { class: 'b-vent', x1: x, y1: yR(x) + 10, x2: x, y2: yR(x) + MURO - 10 }, chasis)
    }
    const hx0 = HWo - 34, hx1 = HWo - 12
    el('path', { class: 'b-handle', d: `M${hx0} ${yR(hx0) + 16} V${yR(hx0) + MURO - 16} M${hx1} ${yR(hx1) + 16} V${yR(hx1) + MURO - 16}` }, chasis)

    $('jvClipPoly').setAttribute('points', pts([[-HWi, 0], [0, HDi], [HWi, 0], [HWi, -2000], [-HWi, -2000]]))
  }

  const objetos = [
    ...MODULOS.map((m) => ({ kind: 'module', ...m })),
    { kind: 'server', ...SERVIDOR, sort: SERVIDOR.y + MURO },
    { kind: 'laptop', ...NOTEBOOK },
    { kind: 'tablet', ...TABLET },
    { kind: 'phone', ...TELEFONO },
    { kind: 'ai', ...IA },
    { kind: 'api', ...API },
  ].sort((a, b) => (a.sort ?? a.y) - (b.sort ?? b.y))

  const pintores = {
    module: dibujarModulo, laptop: dibujarNotebook, tablet: dibujarTablet,
    phone: dibujarTelefono, server: dibujarServidor, ai: dibujarIa, api: dibujarApi,
  }
  objetos.forEach((o) => pintores[o.kind](o))

  /* --- torre de capas --------------------------------------------- */
  const crearCapa = (nombre) => {
    const g = el('g', { class: 'layer' })
    el('polygon', { class: 'left', points: pts([[-HW, 0], [0, HD], [0, HD + T], [-HW, T]]) }, g)
    el('polygon', { class: 'right', points: pts([[HW, 0], [0, HD], [0, HD + T], [HW, T]]) }, g)
    for (let k = 0; k < 9; k++) {
      const x = -HW + 14 + k * 9, y = (x + HW) * (HD / HW)
      el('line', { class: 'vent', x1: x, y1: y + 4, x2: x, y2: y + T - 4 }, g)
    }
    for (let k = 0; k < 2; k++) {
      const x0 = HW - 28 - k * 30, x1 = x0 - 24
      const yy = (x) => (HW - x) * (HD / HW)
      el('polygon', { class: 'bay', points: pts([[x0, yy(x0) + 4], [x1, yy(x1) + 4], [x1, yy(x1) + T - 4], [x0, yy(x0) + T - 4]]) }, g)
    }
    ;[0, 1, 2].forEach((k) => {
      const x = 14 + k * 8, y = (HW - x) * (HD / HW) + T / 2
      el('circle', { class: 'uled' + (k !== 1 ? ' on' : ''), cx: x, cy: y, r: 1.8 }, g)
    })
    el('polygon', { class: 'top', points: pts([[0, -HD], [HW, 0], [0, HD], [-HW, 0]]) }, g)
    const t = el('text', { class: 'name', x: 0, y: 0 }, g)
    t.textContent = nombre
    return g
  }

  let mazo = []
  const siguiente = () => {
    if (!mazo.length) mazo = barajar([...tecnologias])
    return mazo.pop()
  }

  const torre = []
  let cuenta = 0
  const alturaDe = (i) => -i * PASO
  // Las capas se mueven con el atributo `transform`, no con CSS: así el
  // navegador no las promueve a capas compuestas y el resto de la escena
  // no se re-rasteriza (si no, la ilustración "tiembla").
  const colocar = (g, y) => { g._y = y; g.setAttribute('transform', `translate(0,${y})`) }
  /** Interpola de 0 a 1 y llama a `paso` en cada fotograma. */
  const animar = (ms, ease, paso) => new Promise((res) => {
    const t0 = performance.now()
    const marco = (ahora) => {
      const t = Math.min(1, (ahora - t0) / ms)
      paso(ease(t))
      t < 1 ? requestAnimationFrame(marco) : res()
    }
    requestAnimationFrame(marco)
  })

  const mover = (g, aY, ms, ease) => new Promise((res) => {
    const desdeY = g._y, t0 = performance.now()
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - t0) / ms)
      colocar(g, desdeY + (aY - desdeY) * ease(t))
      t < 1 ? requestAnimationFrame(paso) : res()
    }
    requestAnimationFrame(paso)
  })

  // La torre de arranque se crea ya, pero no se cuelga: con movimiento la
  // levanta la entrada capa a capa, y sin movimiento se coloca puesta.
  const capasIniciales = Array.from({ length: TORRE_MAX - 1 }, () => crearCapa(siguiente()))
  const ponerCapa = (g, i) => {
    colocar(g, alturaDe(i))
    $('jvInterior').appendChild(g)
    torre.push(g)
  }

  // El rótulo entra entero con la primera tecnología. Si no, "Utilizamos" se
  // queda colgado en el aire mientras la escena se monta, sin nada debajo.
  const mostrar = (nombre) => {
    const s = document.createElement('span')
    s.className = 'in'
    s.textContent = nombre
    nombreEl.replaceChildren(s)
    contadorEl.textContent = `${++cuenta} tecnologías`
    hudEl.classList.add('is-visible')
  }

  if (sinMovimiento) {
    // Sin movimiento: la escena queda montada y quieta, con una tecnología.
    capasIniciales.forEach(ponerCapa)
    const g = crearCapa(siguiente())
    colocar(g, alturaDe(torre.length))
    $('jvInterior').appendChild(g)
    contadorEl.textContent = `${tecnologias.length} tecnologías`
    nombreEl.textContent = tecnologias[0]
    hudEl.classList.add('is-visible')
    return
  }

  /* --- ciclo -------------------------------------------------------
     Se detiene cuando la escena sale de pantalla o la pestaña pasa a
     segundo plano: no tiene sentido animar lo que nadie está viendo. */
  let visible = true
  let despertar = null
  const enPantalla = () => (visible && document.visibilityState === 'visible'
    ? Promise.resolve()
    : new Promise((r) => { despertar = r }))
  const revisar = () => {
    if (visible && document.visibilityState === 'visible' && despertar) {
      const r = despertar; despertar = null; r()
    }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; revisar() }, { threshold: 0 }).observe(destino)
  }
  document.addEventListener('visibilitychange', revisar)

  async function agregarCapa(nombre) {
    const i = torre.length
    const g = crearCapa(nombre)
    colocar(g, alturaDe(i) - 240)
    $('jvInterior').appendChild(g)
    torre.push(g)
    await mover(g, alturaDe(i), CAIDA_MS, EASE.outBack)

    g.classList.add('settle')
    mostrar(nombre)
    setTimeout(() => g.classList.remove('settle'), 600)
    await dormir(ESPERA_MS)

    if (torre.length > TORRE_MAX) {
      $('jvRimBack').classList.add('hot')
      $('jvRimFront').classList.add('hot')
      $('jvGlow').classList.add('on')
      const abajo = torre.shift()
      await Promise.all([
        mover(abajo, HD + HDi + T + 4, HUNDIDO_MS, EASE.inCubic),
        ...torre.map((o, k) => mover(o, alturaDe(k), HUNDIDO_MS, EASE.inOut)),
      ])
      abajo.remove()
      $('jvRimBack').classList.remove('hot')
      $('jvRimFront').classList.remove('hot')
      $('jvGlow').classList.remove('on')
    }
  }

  /* --- entrada -----------------------------------------------------
     Antes del ciclo la escena se monta a la vista: baja la plataforma
     girando sobre sí misma, encima aparece el servidor y detrás el resto
     de objetos, se encienden las pistas y por último se levanta la torre
     capa a capa.

     Las opacidades son temporales y se quitan al terminar: un grupo con
     `opacity < 1` obliga al navegador a rasterizarlo aparte, que es justo
     lo que la escena evita durante el ciclo. */
  const PISO_MS = 800
  const OBJETO_MS = 420
  const OBJETO_PASO_MS = 70
  const PISTAS_MS = 360
  const CAPA_MS = 380

  /** Envuelve un nodo en un <g> propio, para poder moverlo sin pisar el
      `transform` que ya lleva puesto. */
  const envolver = (nodo) => {
    const w = el('g')
    nodo.parentNode.insertBefore(w, nodo)
    w.appendChild(nodo)
    return w
  }

  const piso = $('jvPiso')
  const pistas = $('jvPistas')
  const envueltos = [...$('jvObjetos').children].map(envolver)
  // El servidor abre el desfile por ser el protagonista; el resto entra de
  // atrás hacia adelante, que es el orden en el que ya está en el DOM.
  const servidorW = $('jvServidor').parentNode
  const desfile = [servidorW, ...envueltos.filter((w) => w !== servidorW)]

  const posarPiso = (t) => {
    piso.setAttribute('transform',
      `translate(0,${(-150 * (1 - t)).toFixed(2)}) translate(${PISO.x},${PISO.y})`
      + ` rotate(${(-14 * (1 - t)).toFixed(2)}) scale(${(0.88 + 0.12 * t).toFixed(4)})`
      + ` translate(${-PISO.x},${-PISO.y})`)
    piso.style.opacity = Math.min(1, t * 2.5).toFixed(3)
  }

  // `outBack` se pasa de 1 y se mete por debajo de 0; el alto y bajo sirven
  // al rebote, pero una opacidad fuera de rango la descartaría el navegador
  // y el objeto aparecería de golpe.
  const posarObjeto = (w, t) => {
    w.setAttribute('transform', `translate(0,${(-22 * (1 - t)).toFixed(2)})`)
    w.style.opacity = Math.max(0, Math.min(1, t * 1.6)).toFixed(3)
  }

  /** Deja la escena en su posición de salida. Se llama antes de cualquier
      espera, para que no llegue a verse montada ni un fotograma. */
  const aparcar = () => {
    posarPiso(0)
    desfile.forEach((w) => posarObjeto(w, 0))
    pistas.style.opacity = '0'
  }

  async function entrar() {
    await animar(PISO_MS, EASE.outCubic, posarPiso)
    piso.removeAttribute('transform')
    piso.style.opacity = ''

    await Promise.all(desfile.map(async (w, i) => {
      await dormir(i * OBJETO_PASO_MS)
      await animar(OBJETO_MS, EASE.outBack, (t) => posarObjeto(w, t))
      w.removeAttribute('transform')
      w.style.opacity = ''
    }))

    await animar(PISTAS_MS, EASE.outCubic, (t) => { pistas.style.opacity = t.toFixed(3) })
    pistas.style.opacity = ''

    for (let i = 0; i < capasIniciales.length; i++) {
      const g = capasIniciales[i]
      colocar(g, alturaDe(i) - 240)
      $('jvInterior').appendChild(g)
      torre.push(g)
      await mover(g, alturaDe(i), CAPA_MS, EASE.outBack)
    }
  }

  ;(async function ciclo() {
    aparcar()
    // El telón de la portada tapa la escena unos segundos: sin esta espera
    // la entrada se representaría entera detrás de él y nadie la vería. El
    // tope es por si `intro:done` no llegara nunca.
    await Promise.race([esperar, dormir(8000)])
    await enPantalla()
    await entrar()

    for (;;) {
      await enPantalla()
      await agregarCapa(siguiente())
      await dormir(PAUSA_MS)
    }
  })()
}
