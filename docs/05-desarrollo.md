# 05 · Desarrollo

Cómo levantar el proyecto, cómo está organizado y cómo agregarle cosas.

---

## Requisitos

- **Node 24** — la versión exacta está en [`.nvmrc`](../.nvmrc)
- npm 11 o superior (viene con Node 24)

Con [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install    # lee .nvmrc
nvm use
```

## Instalar

```bash
git clone git@github.com:jvcloud-consultores/jvcloud-website.git
cd jvcloud-website
nvm use
npm install
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente (`localhost:5173`) |
| `npm run build` | Compila el sitio a `dist/` |
| `npm run preview` | Sirve `dist/` para revisar el build (`localhost:4173`) |

> **Antes de empujar, `npm run preview`.** Es la única forma fiable de verificar
> rutas como `/portafolio/`: reproduce cómo se sirven las páginas en producción,
> donde el servidor de desarrollo es más permisivo.

---

## Estructura

```
jvcloud-website/
├── .github/workflows/deploy.yml   # CI/CD a GitHub Pages
├── docs/                          # esta documentación
├── public/                        # se copia tal cual a dist/, sin procesar
│   ├── CNAME                      # dominio propio: jvcloud.cl
│   ├── config.json                # configuración editable sin recompilar
│   ├── favicon.ico
│   ├── robots.txt
│   └── images/
├── src/
│   ├── main.js                    # entrada común a todas las páginas
│   ├── home.js  about.js  portafolio.js  contacto.js   # entrada por página
│   ├── components/
│   │   ├── nav.js                 # menú compartido (marca el enlace activo)
│   │   ├── footer.js              # pie compartido
│   │   ├── aviso.js               # barra de aviso sobre el menú
│   │   ├── intro.js               # telón de entrada de la portada
│   │   ├── whatsapp.js            # widget flotante
│   │   ├── cinta.js  red.js  stack.js                  # piezas de la portada
│   ├── lib/
│   │   ├── config.js              # carga /config.json + import.meta.env
│   │   ├── turnstile.js           # widget anti-bots del formulario (config.json)
│   │   ├── medicion.js            # Microsoft Clarity, encendido desde config.json
│   │   └── apariciones.js         # animaciones al asomar (.h-reveal)
│   ├── styles/
│   │   ├── main.css               # base
│   │   ├── jv.css                 # tokens y piezas del diseño (prefijo h-)
│   │   ├── home.css  about.css  portafolio.css  contacto.css  intro.css
│   └── assets/                    # imágenes procesadas por Vite
├── index.html                     # /
├── about/index.html               # /about/
├── portafolio/index.html          # /portafolio/
├── contacto/index.html            # /contacto/
├── vite.config.js
└── .env / .env.example
```

### Cómo funciona

Cada página es un HTML completo e independiente. La navegación son enlaces
normales (`<a href="/about/">`): no hay router en JavaScript, así que cada URL
carga por sí sola y el sitio funciona aunque el JS falle.

**El CSS se enlaza desde el `<head>`, no se importa desde el JS.** Cada página
declara sus hojas en orden —`main.css` de base, `jv.css` con los tokens del
diseño y la suya propia al final— para que bloqueen el primer pintado.
Importadas desde un módulo, en `npm run dev` llegarían con el bundle y la página
asomaría sin estilos un instante en cada navegación. Vite las reescribe a los
assets compilados durante el build, así que el orden del HTML es el que manda en
producción.

Todas las páginas incluyen los contenedores compartidos, que el JS rellena:

```html
<div id="aviso"></div>
<header id="nav"></header>
...
<footer id="footer"></footer>
```

Editar el menú es tocar [`src/components/nav.js`](../src/components/nav.js), no
cinco archivos HTML.

---

## Agregar una página

1. Crea la carpeta con su `index.html`, usando otra como plantilla:

   ```bash
   mkdir -p servicios
   cp about/index.html servicios/index.html
   ```

2. Edita el `<title>`, la meta `description`, el `<link rel="canonical">`, las
   metas de Open Graph y el contenido.
3. Si la página necesita estilos propios, crea `src/styles/servicios.css` y
   enlázala en el `<head>`, al final de las tres.
4. Para que aparezca en el menú, agrega una entrada al array `LINKS` de
   [`src/components/nav.js`](../src/components/nav.js) —y en
   [`footer.js`](../src/components/footer.js) si corresponde.

**No hay que tocar `vite.config.js`.** La configuración detecta las páginas con
un glob sobre `**/index.html` y arma `rollupOptions.input` sola. El build imprime
lo que encontró:

```
[jvcloud] páginas detectadas: about, contacto, index, portafolio
```

## Agregar un proyecto al portafolio

Los proyectos viven todos en [`portafolio/index.html`](../portafolio/index.html).
Copia un `<li class="p-proyecto">` y cambia el contenido:

```html
<li class="p-proyecto h-reveal">
  <div class="p-proyecto__ficha">
    <!-- Rubro: qué representa. Material Symbols Rounded: "nombre_del_simbolo" -->
    <svg class="p-proyecto__icono" viewBox="0 -960 960 960" aria-hidden="true" focusable="false"><path d="…"/></svg>
    <p class="h-num" aria-hidden="true">07</p>
    <p class="h-label">Rubro</p>
  </div>
  <div class="p-proyecto__cuerpo">
    <h2>Título del proyecto</h2>
    <p class="p-proyecto__desc">Qué se construyó y qué resuelve.</p>
  </div>
</li>
```

La ficha admite además `<p class="p-proyecto__fecha">` (año y duración), y el
cuerpo un `<ul class="h-tags">` con el stack y un
`<p class="p-proyecto__resultado">` con el resultado. Están fuera de las fichas
actuales porque no hay datos que poner ahí; el CSS ya los soporta y se agregan
sin tocar estilos.

Si un proyecto llega a merecer página propia, crea
`portafolio/mi-proyecto/index.html` y envuelve el bloque en un enlace. Vite la
detecta sola y la URL queda en `https://jvcloud.cl/portafolio/mi-proyecto/`.

---

## Criterios de diseño

Vale la pena conocerlos antes de agregar piezas, para que lo nuevo no desentone.

### Íconos

Todos vienen de **Material Symbols Rounded**, en **contorno y peso 200**, en el
azul de marca. Van incrustados como SVG y no con la fuente de iconos de Google:
para un puñado de piezas, una petición más y un parpadeo mientras carga la fuente
no compensan.

El peso 200 es el mismo trazo fino de la tipografía —los títulos van en 200 y
300— y el que hace juego con los filetes de un píxel que separan las secciones.

Para bajar uno nuevo, con el nombre del símbolo del
[catálogo de Google](https://fonts.google.com/icons):

```bash
curl -s "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/<simbolo>/wght200/24px.svg"
```

Copia el atributo `d` del `<path>` al HTML y anota el nombre del símbolo en un
comentario al lado, como hacen los que ya están.

> **Ojo con los símbolos sin contorno.** Algunos, como `pets`, están
> dibujados con formas macizas y Google devuelve el mismo trazo con relleno y sin
> él. Si uno se ve sólido entre los demás, no es la variante: hay que cambiar de
> símbolo.

### Animaciones al asomar

Los bloques con la clase `h-reveal` reciben `is-visible` cuando entran en
pantalla ([`src/lib/apariciones.js`](../src/lib/apariciones.js)). Los estilos
cuelgan de ahí:

```css
.mi-pieza { opacity: 0; transform: scale(.82); transition: …; }
.h-reveal.is-visible .mi-pieza { opacity: 1; transform: none; }
```

Toda animación necesita su excepción para `prefers-reduced-motion: reduce`, y
tiene que anular también el `transition-delay`: la regla global recorta la
duración, no la espera, y sin eso la pieza se queda invisible ese rato igual.

### Convención de clases

| Prefijo | Dónde |
| --- | --- |
| `h-` | Piezas compartidas del diseño, en `jv.css` (`h-num`, `h-label`, `h-tags`, `h-reveal`) |
| `p-` | Exclusivas del portafolio |
| `a-` | Exclusivas de "Acerca de" |
| `nav-`, `intro__` | Componentes con su propia hoja |

---

## Antes de empujar

```bash
npm run build     # que compile
npm run preview   # y que se vea bien en http://localhost:4173
```

Un push a `main` publica en producción. Si la rama está protegida, el flujo es
rama nueva → pull request → merge. Ver [02 · Despliegue](02-despliegue.md).
