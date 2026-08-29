import { defineConfig } from 'vite'
import { globSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

// Carpetas que nunca contienen páginas del sitio.
const IGNORED = ['node_modules', 'dist', 'public', '.git']

/**
 * Detecta automáticamente todas las páginas del sitio buscando cualquier
 * `index.html` del proyecto. Agregar una página nueva es solo crear una
 * carpeta con su `index.html`: no hay que tocar esta configuración.
 *
 *   index.html                   -> input "index"
 *   about/index.html             -> input "about"
 *   blog/primer-post/index.html  -> input "blog/primer-post"
 */
function detectarPaginas() {
  const archivos = globSync('**/index.html', {
    cwd: root,
    exclude: (nombre) => IGNORED.includes(nombre),
  })

  const input = {}
  for (const archivo of archivos.sort()) {
    const ruta = archivo.split('\\').join('/')
    const nombre = ruta === 'index.html' ? 'index' : ruta.replace(/\/index\.html$/, '')
    input[nombre] = resolve(root, ruta)
  }

  if (Object.keys(input).length === 0) {
    throw new Error('No se encontró ningún index.html: el sitio no tiene páginas.')
  }

  return input
}

export default defineConfig(() => {
  const paginas = detectarPaginas()
  console.log(`[jvcloud] páginas detectadas: ${Object.keys(paginas).join(', ')}`)

  return {
    // Dominio propio (jvcloud.cl), no una subruta de github.io.
    base: '/',
    appType: 'mpa',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: paginas,
      },
    },
    server: {
      port: 5173,
      open: true,
    },
    preview: {
      port: 4173,
    },
  }
})
