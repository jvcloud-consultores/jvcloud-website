/**
 * Cinta de herramientas (portada).
 *
 * Reparte los nombres en tres filas que se desplazan solas, cada una a su
 * ritmo y en sentido contrario a la anterior. El reparto es intercalado y no
 * por bloques: así cada fila mezcla lenguajes, nubes y herramientas en vez de
 * quedar una fila entera de bases de datos.
 *
 * Cada fila lleva su contenido dos veces. La copia es lo único que hace que
 * el bucle no tenga costura —al desplazar media cinta, la segunda mitad cae
 * justo donde estaba la primera— y va con aria-hidden para que un lector de
 * pantalla no lea la lista dos veces.
 *
 * Es una mejora sobre lo que ya hay: si este módulo no llega a ejecutarse, en
 * la página se queda la lista corrida que dejó src/home.js, que se lee igual
 * de bien.
 */
const FILAS = 3

// Distintas a propósito, y sin múltiplos entre sí: con la misma duración las
// tres filas se ven enganchadas, como un bloque que se arrastra.
const DURACIONES = ['52s', '67s', '58s']

/** Una pasada de la cinta. La copia no aporta contenido, solo continuidad. */
function tira(nombres, copia = false) {
  const ul = document.createElement('ul')
  ul.className = 'h-cinta__tira'
  if (copia) ul.setAttribute('aria-hidden', 'true')
  ul.append(...nombres.map((nombre) => {
    const li = document.createElement('li')
    li.textContent = nombre
    return li
  }))
  return ul
}

/**
 * Sustituye la lista por la cinta.
 * @param {HTMLElement} lista el <ul> con los nombres escritos
 * @param {string[]} nombres la lista ya resuelta (config o respaldo)
 */
export function renderCinta(lista, nombres) {
  // Con muy pocos nombres una fila no alcanza a llenar el ancho y se vería el
  // hueco dando vueltas: en ese caso se queda la lista tal cual.
  if (!lista || nombres.length < FILAS * 4) return

  const cinta = document.createElement('div')
  cinta.className = 'h-cinta'

  for (let f = 0; f < FILAS; f++) {
    const fila = document.createElement('div')
    fila.className = f % 2 ? 'h-cinta__fila h-cinta__fila--rev' : 'h-cinta__fila'
    fila.style.setProperty('--dur', DURACIONES[f])

    const suyos = nombres.filter((_, i) => i % FILAS === f)
    fila.append(tira(suyos), tira(suyos, true))
    cinta.appendChild(fila)
  }

  lista.replaceWith(cinta)
}
