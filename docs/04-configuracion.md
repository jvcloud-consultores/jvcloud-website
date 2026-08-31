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
| `formulario.*` | A dónde envía el formulario de contacto y su verificación anti-bots. Ver abajo |
| `analytics.*` | Medición de uso (Microsoft Clarity). Ver abajo |
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

### Formulario de contacto

```json
"formulario": {
  "endpoint": "https://form-endpoint.jvcloud-consultores.workers.dev/f/jvcloud",
  "turnstile": {
    "enabled": true,
    "siteKey": "0x4AAAAAAEinhOtwxs0khmGW",
    "action": "jvcloud",
    "theme": "light"
  }
}
```

| Clave | Qué hace |
| --- | --- |
| `endpoint` | A dónde se hace el POST. Es el Worker del proyecto `cloudflare-configs`, ruta `/f/jvcloud`: valida, limita a 5 envíos por minuto y por IP, filtra bots y avisa por Telegram |
| `turnstile.enabled` | El interruptor del desafío anti-bots. Apagado, el script de Cloudflare ni se pide |
| `turnstile.siteKey` | Clave **pública** del widget (Dashboard → Turnstile). Viaja en el HTML: no es un secreto. El secret vive sólo en el Worker |
| `turnstile.action` | Tiene que calzar exacto con la `accion` declarada para este formulario en el Worker |
| `turnstile.theme` | `light`, porque estas páginas son blancas siempre. Con `auto` el widget seguiría al sistema del visitante |

**Sin `endpoint` el formulario no queda muerto:** cae al `mailto:` de siempre,
con nombre, correo, empresa y mensaje ya redactados. Lo mismo si el valor no es
una URL `https` válida — se ignora con una advertencia en consola, para que una
errata no mande los datos del visitante a cualquier parte.

Lo que ve quien envía: el botón se pone a girar y dice "Enviando…", la
confirmación reemplaza al botón y además salta un aviso flotante al centro
abajo, que es donde está mirando. Los errores del Worker se traducen a
castellano en `ERRORES_ENVIO`, dentro de
[`src/contacto.js`](../src/contacto.js); la tabla de códigos está en el README
de `cloudflare-configs`.

> **El orden importa para encender Turnstile.** Primero el sitio manda el token
> (esto), y **después** se pone `turnstile: true` en `src/formularios.js` del
> Worker, con el secret ya cargado. Al revés, el formulario rechaza todo con
> 403. Mientras el Worker lo tenga apagado, el token viaja y se descarta: no
> molesta.

Para probar contra el Worker en local, apunta el endpoint a `wrangler dev`
(`http` sólo se acepta en localhost):

```json
"endpoint": "http://127.0.0.1:8787/f/jvcloud"
```

> **En local, el widget no carga.** El de jvcloud.cl no tiene `localhost` entre
> sus hostnames autorizados, así que en `npm run dev` y en `npm run preview`
> responde el error `400020` y el formulario avisa de inmediato ("No pudimos
> cargar la verificación anti-bots…") en vez de dejar enviar. Para probar
> envíos en el equipo: o agregas `localhost` al widget en el dashboard de
> Turnstile, o pones `formulario.turnstile.enabled: false` mientras
> desarrollas.

El campo trampa (`sitio-web`, oculto en el HTML) viaja tal cual: es el Worker
quien decide qué hacer con él. Su `name` tiene que ser igual al `honeypot`
declarado allá.

#### Largo de los campos

El Worker **recorta en silencio** lo que pase de su límite (`valor.slice`), así
que el formulario frena antes con un `maxlength` del mismo tamaño. Si no, el
mensaje llegaría cortado a la mitad sin que nadie se enterara.

| Campo | Máximo |
| --- | --- |
| `nombre` | 100 |
| `email` | 100 |
| `empresa` | 100 |
| `mensaje` | 1000 |

Los números viven en dos lados y tienen que calzar: `LARGO_MAXIMO` en
`src/formularios.js` del Worker y los `maxlength` de
[`contacto/index.html`](../contacto/index.html). **Al cambiarlos allá, cambiarlos
acá.** El contador bajo el mensaje no repite el número: lo lee del `maxlength`
del propio campo y se pone rojo en el último 10%, para que el tope no llegue
como una tecla que dejó de responder.

### Medición de uso (Microsoft Clarity)

Mapas de calor y grabaciones de sesión. Apagada por defecto:

```json
"analytics": {
  "clarity": {
    "enabled": false,
    "projectId": "",
    "onlyInProduction": true,
    "respectDoNotTrack": true
  }
}
```

| Clave | Qué hace |
| --- | --- |
| `enabled` | El interruptor. En `false` no se le pide nada a Clarity |
| `projectId` | El id del proyecto, en [clarity.microsoft.com](https://clarity.microsoft.com) → Settings → Overview. Es público: viaja en la URL del script |
| `onlyInProduction` | `true` no mide en `npm run dev` ni en `preview`: las visitas de quien programa ensucian las grabaciones |
| `respectDoNotTrack` | `true` no carga nada si el navegador manda *Do Not Track* o *Global Privacy Control* |

Para encenderla: crear el proyecto en Clarity, copiar el id, ponerlo en
`projectId` y dejar `enabled: true`. No hace falta recompilar: es `config.json`.

El módulo es [`src/lib/medicion.js`](../src/lib/medicion.js) y **no** se llama
`analytics.js` a propósito: esa ruta la bloquea EasyPrivacy —encendida por
defecto en uBlock Origin—, y en desarrollo eso cortaría el import y con él todo
lo que cuelga de `main.js`.

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
```

Hoy es la única que usa el sitio. Todo lo demás —incluido el destino del
formulario— vive en `config.json`, justamente para no tener que recompilar.

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
| A dónde se envía el formulario | `public/config.json` → `formulario.endpoint` |
| Apagar la verificación anti-bots | `public/config.json` → `formulario.turnstile.enabled` |
| Encender o apagar la medición | `public/config.json` → `analytics.clarity` |
| El menú | [`src/components/nav.js`](../src/components/nav.js), array `LINKS` |
| El footer | [`src/components/footer.js`](../src/components/footer.js) |
| Textos de una página | Su `index.html` |
| Proyectos del portafolio | [`portafolio/index.html`](../portafolio/index.html) |
| El dominio | Tres lugares — ver [03 · Dominio y DNS](03-dominio-dns.md) |
