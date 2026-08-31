# 04 · Configuración

El sitio tiene dos mecanismos de configuración con propósitos distintos. La
diferencia importa: uno se cambia sin recompilar y el otro no.

| | `public/config.json` | Variables `VITE_*` |
| --- | --- | --- |
| Cuándo se lee | En el navegador, al cargar la página | En el build, se incrusta en el código |
| Para cambiarlo | Editar el archivo y publicar | Cambiar la variable y **recompilar** |
| Qué va ahí | Contenido: contacto, redes, textos, banderas | Parámetros del entorno de build |
| Secretos | Nunca | Nunca |

En la práctica, **casi todo lo que vas a querer cambiar está en
`config.json`.**

---

## `public/config.json`

Se sirve tal cual —está en `public/`, que Vite copia sin procesar— y
[`src/lib/config.js`](../src/lib/config.js) lo lee con `fetch('/config.json')` al
arrancar. Si el archivo falla, falta o trae JSON inválido, el sitio sigue
funcionando con los valores por defecto definidos en ese mismo módulo.

### Claves

| Clave | Qué controla |
| --- | --- |
| `siteName` | Nombre de la marca, usado en el nav, el footer y el widget |
| `tagline` | Bajada corta de la marca |
| `description` | Descripción larga; se inyecta donde haya `data-config="description"` |
| `domain` | Dominio del sitio |
| `contact.name` | Persona de contacto |
| `contact.email` | Correo oficial |
| `contact.phone` | Teléfono **en formato legible**: `+56 9 6860 4006` |
| `contact.city` | Ciudad, para la página de contacto |
| `contact.hours` | Horario de atención |
| `contact.telegram` | `true` agrega el enlace de Telegram con el mismo número; `false` lo quita |
| `whatsapp.*` | Widget flotante de WhatsApp. Ver abajo |
| `social.linkedin`, `social.github` | URLs de las redes. Vacías, no se pinta el enlace |
| `features.showContactForm` | Muestra u oculta el formulario de contacto |
| `herramientas` | Lista de nombres de la sección "Herramientas" y de la escena del stack. Es la única fuente: vacía, la sección no se pinta |
| `announcement.*` | Barra de aviso sobre el menú. Ver abajo |
| `intro.repeat` | Cada cuánto se ve el telón de entrada. Ver abajo |

### Enlaces que se derivan solos

No los escribas: se calculan a partir de `contact.phone`. Basta con cambiar el
número en un solo lugar.

| Clave derivada | De dónde sale |
| --- | --- |
| `contact.phoneHref` | `tel:+56968604006` |
| `contact.telegramHref` | `https://t.me/+56968604006` |
| `contact.whatsappHref` | El enlace `wa.me` del primer contacto |

### Widget de WhatsApp

```json
"whatsapp": {
  "enabled": true,
  "title": "JVCloud Consultores",
  "status": "En línea",
  "messages": ["Hola 👋 bienvenido a JVCloud Consultores", "¿Cómo podemos ayudarte?"],
  "message": "Hola, los contacto desde el sitio de JVCloud.",
  "badge": 1,
  "pulse": true,
  "label": "Escríbenos por WhatsApp",
  "agents": [
    { "label": "Josue Olivares", "role": "Consultor", "phone": "+56 9 6860 4006" }
  ]
}
```

| Clave | Qué hace |
| --- | --- |
| `enabled` | `false` apaga el widget completo, botón y panel |
| `messages` | Burbujas que aparecen en el panel al abrirlo |
| `message` | Texto con el que se abre la conversación de WhatsApp |
| `badge` | Numerito rojo sobre el botón. `''` o `0` lo quitan |
| `pulse` | La onda animada alrededor del botón |
| `agents` | Personas del panel. Vacía, se usa el teléfono de `contact` |

### Barra de aviso

```json
"announcement": {
  "enabled": true,
  "text": "Cuéntanos qué necesitas y te respondemos con una estimación acotada.",
  "cta": { "label": "Cotiza aquí", "href": "/contacto/" }
}
```

`enabled: false` o `text: ""` la apagan.

### Telón de entrada

`intro.repeat` decide cada cuánto se ve la animación del logotipo en la portada:

| Valor | Cuándo se muestra |
| --- | --- |
| `"always"` | En cada carga de la portada |
| `"session"` | Una vez por pestaña (valor por defecto) |
| `"once"` | Una vez por navegador, hasta que se borren los datos del sitio |
| `"daily"` | Una vez, y no vuelve hasta pasado un día |

Un valor que no esté en esa lista se ignora con una advertencia en consola y se
usa `"session"`.

> **Un cambio se nota en la carga siguiente, no en la que lo lee.** El telón se
> monta antes del primer pintado y `config.json` llega por `fetch()`, más tarde.
> La decisión de saltarlo se toma con la marca que dejó la carga anterior, y lo
> que hace `intro.repeat` es decidir dónde se escribe esa marca. Para probar sin
> esperar, abre una pestaña nueva o borra la marca a mano:
>
> ```js
> sessionStorage.removeItem('jvcloud:intro-visto')
> localStorage.removeItem('jvcloud:intro-visto')
> ```

### Usarlo desde el HTML, sin escribir JavaScript

```html
<!-- Inyecta el valor como texto -->
<span data-config="contact.email"></span>

<!-- Lo pone en un atributo, con un prefijo opcional -->
<a data-config="contact.email"
   data-config-attr="href"
   data-config-prefix="mailto:">Escríbenos</a>

<!-- Muestra el bloque solo si la clave tiene valor -->
<section data-config-if="features.showContactForm">…</section>
```

### Usarlo desde JavaScript

```js
import { getConfig, get } from './lib/config.js'

get('contact.email')                  // 'josue.olivares@jvcloud.cl'
get('intro.repeat', 'session')        // con valor por defecto
getConfig().features                  // { showContactForm: true }
```

---

## Variables `VITE_*`

Solo las variables con prefijo `VITE_` llegan al navegador. Se leen con
`import.meta.env`:

```js
import.meta.env.VITE_SITE_NAME
import.meta.env.VITE_API_URL
```

### En local

```bash
cp .env.example .env.local     # .env.local está en .gitignore
```

El proyecto versiona `.env` con los valores públicos por defecto;
`.env.local` es para tus ajustes personales y no se sube.

### En GitHub

Como se incrustan durante el build, tienen que existir en el runner. Se crean
como **Variables** del repositorio —no como Secrets— y el workflow las inyecta.
El procedimiento está en [01 · GitHub](01-github.md), paso 5.

> ### ⚠️ Nunca pongas secretos aquí
>
> Todo lo que lleva el prefijo `VITE_` queda **en texto plano dentro de
> `dist/`**, y `dist/` es exactamente lo que se publica y cualquiera puede
> descargar. Tokens, contraseñas y API keys privadas van en un backend, nunca en
> este repositorio. Guardarlas como *Secrets* de GitHub tampoco ayuda: el secreto
> se resuelve durante el build y termina igual dentro del bundle.

---

## Qué toco para cambiar cada cosa

| Quiero cambiar | Dónde |
| --- | --- |
| Teléfono, correo, horario | `public/config.json` → `contact` |
| Texto de la barra de aviso | `public/config.json` → `announcement` |
| Lista de herramientas | `public/config.json` → `herramientas` |
| Apagar el widget de WhatsApp | `public/config.json` → `whatsapp.enabled` |
| El menú | [`src/components/nav.js`](../src/components/nav.js), array `LINKS` |
| El footer | [`src/components/footer.js`](../src/components/footer.js) |
| Textos de una página | Su `index.html` |
| Proyectos del portafolio | [`portafolio/index.html`](../portafolio/index.html) |
| El dominio | Tres lugares — ver [03 · Dominio y DNS](03-dominio-dns.md) |
