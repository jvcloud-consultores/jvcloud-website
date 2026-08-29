# jvcloud-website

Sitio web estático de **JVCloud Consultores** — <https://jvcloud.cl>

Vite + JavaScript vanilla, multipágina (sin framework y sin router), publicado
automáticamente en GitHub Pages con dominio propio en cada push a `main`.

---

## Requisitos

- **Node 24** (la versión exacta está en [`.nvmrc`](.nvmrc): `24.14.0`)
- npm 11 o superior (viene con Node 24)

Con [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install    # lee .nvmrc
nvm use
```

## Clonar e instalar

```bash
git clone git@github.com:jvcloud-consultores/jvcloud-website.git
cd jvcloud-website
nvm use
npm install
```

## Comandos

| Comando           | Qué hace                                                        |
| ----------------- | --------------------------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con recarga en caliente (`localhost:5173`) |
| `npm run build`   | Compila el sitio a `dist/`                                       |
| `npm run preview` | Sirve `dist/` localmente para revisar el build (`localhost:4173`) |

> `npm run preview` es la forma correcta de verificar rutas como `/blog/` antes
> de desplegar: reproduce cómo se sirven las páginas en producción.

---

## Estructura

```
jvcloud-website/
├── .github/workflows/deploy.yml   # CI/CD a GitHub Pages
├── public/                        # se copia tal cual a dist/, sin procesar
│   ├── CNAME                      # dominio personalizado: jvcloud.cl
│   ├── config.json                # configuración editable sin recompilar
│   ├── favicon.ico
│   ├── robots.txt
│   └── images/
├── src/
│   ├── main.js                    # punto de entrada común a todas las páginas
│   ├── styles/main.css            # única hoja de estilos
│   ├── components/
│   │   ├── nav.js                 # header/nav compartido (marca el link activo)
│   │   └── footer.js              # footer compartido
│   ├── lib/config.js              # carga /config.json + expone import.meta.env
│   └── assets/                    # imágenes procesadas por Vite (import desde JS)
├── index.html                     # /
├── about/index.html               # /about/
├── blog/index.html                # /blog/
├── blog/primer-post/index.html    # /blog/primer-post/
├── contacto/index.html            # /contacto/
├── vite.config.js
├── package.json
├── .nvmrc
├── .env / .env.example
└── README.md
```

### Cómo funciona

Cada página es un HTML completo e independiente. La navegación entre páginas usa
enlaces normales (`<a href="/blog/">`): no hay router en JavaScript, así que cada
URL carga por sí sola y funciona aunque el JS falle.

Todos los HTML incluyen:

```html
<header id="nav"></header>
...
<footer id="footer"></footer>
<script type="module" src="/src/main.js"></script>
```

`src/main.js` carga el CSS, lee la configuración y rellena el `#nav` y el
`#footer` con los componentes compartidos. Editar el menú es tocar
[`src/components/nav.js`](src/components/nav.js), no cinco archivos HTML.

---

## Agregar una página nueva

1. Crea la carpeta con su `index.html`:

   ```bash
   mkdir -p servicios
   cp about/index.html servicios/index.html   # como plantilla
   ```

2. Edita `<title>`, la meta `description`, el `<link rel="canonical">` y el contenido.
3. Si quieres que aparezca en el menú, agrega una entrada en el array `LINKS` de
   [`src/components/nav.js`](src/components/nav.js) (y en
   [`src/components/footer.js`](src/components/footer.js) si corresponde).

**No hay que tocar `vite.config.js`.** La configuración detecta las páginas con un
glob sobre `**/index.html` y arma `rollupOptions.input` sola. El build imprime las
páginas encontradas:

```
[jvcloud] páginas detectadas: about, blog, blog/primer-post, contacto, index
```

## Agregar un post al blog

1. Crea `blog/mi-articulo/index.html` (copia `blog/primer-post/index.html` como base).
2. Actualiza título, fecha (`<time datetime="...">`), meta y contenido.
3. Agrega un `<li>` en la lista de [`blog/index.html`](blog/index.html) apuntando a
   `/blog/mi-articulo/`.

La URL final es `https://jvcloud.cl/blog/mi-articulo/`.

---

## Configuración

Hay dos mecanismos y conviene no confundirlos.

### 1. `public/config.json` — se cambia **sin recompilar**

Se sirve tal cual y `src/lib/config.js` lo lee con `fetch('/config.json')` al
arrancar. Sirve para nombre del sitio, datos de contacto, redes y banderas de
funcionalidad.

Desde el HTML se puede usar sin escribir JavaScript:

```html
<span data-config="contact.email"></span>

<a data-config="contact.email"
   data-config-attr="href"
   data-config-prefix="mailto:">Escríbenos</a>

<section data-config-if="features.showBlog">…</section>
```

Desde JavaScript:

```js
import { getConfig, get } from './lib/config.js'

get('contact.email')       // 'contacto@jvcloud.cl'
getConfig().features       // { showBlog: true, showContactForm: true }
```

Si `config.json` falla o no existe, el sitio sigue funcionando con los valores por
defecto definidos en `src/lib/config.js`.

### 2. Variables de entorno `VITE_*` — se incrustan **en el build**

Solo las variables con prefijo `VITE_` llegan al navegador, y se leen con
`import.meta.env`:

```js
import.meta.env.VITE_SITE_NAME
import.meta.env.VITE_API_URL
```

En local, copia el ejemplo y ajusta:

```bash
cp .env.example .env.local   # .env.local está en .gitignore
```

> ⚠️ **Nunca pongas secretos en variables `VITE_*`.** Todo lo que lleva ese prefijo
> queda en texto plano dentro de `dist/`, y `dist/` es público. Tokens, contraseñas y
> API keys privadas van en el backend, nunca aquí.

### Definir las variables en GitHub

Como se incrustan durante el build, deben existir en el runner de Actions:

1. Ve al repositorio → **Settings** → **Secrets and variables** → **Actions**.
2. Pestaña **Variables** → **New repository variable**.
3. Crea:
   - `VITE_SITE_NAME` = `JVCloud Consultores`
   - `VITE_API_URL` = `https://api.jvcloud.cl`

El workflow las inyecta en el paso de build:

```yaml
env:
  VITE_API_URL: ${{ vars.VITE_API_URL }}
  VITE_SITE_NAME: ${{ vars.VITE_SITE_NAME }}
```

Usa **Variables**, no **Secrets**: son valores públicos y los secrets no aportan
protección real aquí, porque igual terminan visibles en el bundle.

---

## Despliegue

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) corre en cada push a
`main` (y a mano desde Actions → *Run workflow*):

1. **build** — `checkout@v4`, `setup-node@v4` (usa `.nvmrc` y caché de npm),
   `npm ci`, `npm run build` con las variables `VITE_*`, y sube `dist/` con
   `upload-pages-artifact@v3`.
2. **deploy** — `deploy-pages@v4` publica el artefacto en el entorno `github-pages`.

### Activar GitHub Pages

Repositorio → **Settings** → **Pages** → **Build and deployment** →
**Source: GitHub Actions**.

No selecciones "Deploy from a branch": no existe rama `gh-pages`, el sitio se publica
desde el artefacto que genera el workflow.

---

## DNS y dominio propio (jvcloud.cl)

### 1. Registros en el proveedor DNS

Registros **A** para el dominio raíz (`@`), apuntando a las IPs de GitHub Pages:

| Tipo | Nombre | Valor             |
| ---- | ------ | ----------------- |
| A    | `@`    | `185.199.108.153` |
| A    | `@`    | `185.199.109.153` |
| A    | `@`    | `185.199.110.153` |
| A    | `@`    | `185.199.111.153` |

Registro **CNAME** para el subdominio `www`:

| Tipo  | Nombre | Valor                          |
| ----- | ------ | ------------------------------ |
| CNAME | `www`  | `jvcloud-consultores.github.io` |

> El valor del CNAME termina en punto en algunos paneles: `jvcloud-consultores.github.io.`

Verificar la propagación:

```bash
dig +short jvcloud.cl A
dig +short www.jvcloud.cl CNAME
```

### 2. Custom domain en GitHub

Repositorio → **Settings** → **Pages** → **Custom domain** → escribe `jvcloud.cl`
→ **Save**. GitHub valida el DNS (puede tardar unos minutos).

### 3. HTTPS

Cuando la validación termine, marca **Enforce HTTPS** en la misma pantalla. El
certificado de Let's Encrypt se emite solo; si la casilla aparece deshabilitada,
espera a que el DNS termine de propagar y vuelve a entrar.

### 4. El archivo CNAME

[`public/CNAME`](public/CNAME) contiene exactamente `jvcloud.cl` y se copia a `dist/`
en cada build. **No lo borres**: sin él, GitHub Pages pierde el dominio personalizado
en el siguiente despliegue.

---

## Primer push

```bash
git init -b main
git add .
git commit -m "Sitio inicial de JVCloud"
git remote add origin git@github.com:jvcloud-consultores/jvcloud-website.git
git push -u origin main
```

Después: activa Pages con *Source: GitHub Actions*, crea las variables
`VITE_SITE_NAME` y `VITE_API_URL`, configura el DNS y pon el dominio en
*Settings → Pages → Custom domain*.

---

## Licencia

© JVCloud Consultores. Todos los derechos reservados.
