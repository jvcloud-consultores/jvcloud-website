# 01 · Configurar el sitio en GitHub

Todo lo que hay que dejar hecho una sola vez para que el sitio se publique solo.
Si el repositorio ya existe y el sitio ya está en línea, esta guía sirve como
lista de verificación o para reconstruirlo desde cero.

---

## Antes de empezar

- Una cuenta de GitHub con permiso sobre la organización `jvcloud-consultores`.
- Git configurado en el equipo.
- Node 24 instalado (ver [05 · Desarrollo](05-desarrollo.md)).

### Acceso por SSH

El repositorio usa SSH, no HTTPS. Si nunca configuraste una llave en este equipo:

```bash
ssh-keygen -t ed25519 -C "tu.correo@jvcloud.cl"
cat ~/.ssh/id_ed25519.pub
```

Copia esa clave pública en GitHub → **Settings** → **SSH and GPG keys** →
**New SSH key**. Verifica que quedó bien:

```bash
ssh -T git@github.com
# Hi <usuario>! You've successfully authenticated...
```

---

## 1. Crear el repositorio

En GitHub → **New repository**, dentro de la organización
`jvcloud-consultores`:

| Campo | Valor |
| --- | --- |
| Nombre | `jvcloud-website` |
| Visibilidad | **Private** (el sitio se publica igual; Pages funciona con repos privados en planes de pago, ver la nota) |
| Inicializar con README | **No** — el proyecto ya trae uno |

> **Sobre público o privado.** GitHub Pages publica desde repositorios privados
> solo en planes Pro, Team o Enterprise. Con una organización en plan gratuito,
> el repositorio tiene que ser **público** para que el sitio salga al aire. El
> código de un sitio estático es visible de todas formas desde el navegador de
> cualquier visitante, así que hacerlo público no expone nada nuevo —siempre que
> no haya secretos en el repositorio, que es la regla de
> [04 · Configuración](04-configuracion.md).

## 2. Primer push

Desde la carpeta del proyecto:

```bash
git init -b main                 # solo si el repo local aún no existe
git add .
git commit -m "Sitio inicial de JVCloud"
git remote add origin git@github.com:jvcloud-consultores/jvcloud-website.git
git push -u origin main
```

Si el remoto ya está configurado —lo normal— basta con:

```bash
git push origin main
```

## 3. Activar GitHub Pages

Repositorio → **Settings** → **Pages** → **Build and deployment**:

- **Source: GitHub Actions**

Eso es todo lo que hay que tocar en esa pantalla por ahora.

> **No elijas "Deploy from a branch".** No existe una rama `gh-pages` en este
> proyecto y no debe crearse: el sitio se publica desde el artefacto que genera
> el workflow. Si alguien cambia esta opción, el despliegue deja de funcionar
> aunque las Actions sigan pasando en verde.

## 4. Permitir que las Actions publiquen

El workflow ya declara los permisos que necesita, pero la organización puede
tenerlos restringidos por política:

Repositorio → **Settings** → **Actions** → **General**:

| Opción | Valor |
| --- | --- |
| Actions permissions | Permitir acciones de GitHub y de terceros verificados |
| Workflow permissions | **Read repository contents and packages permissions** basta: el workflow pide `pages: write` e `id-token: write` por su cuenta |

## 5. Crear las variables del build

El sitio incrusta dos valores públicos durante la compilación, así que tienen
que existir en el runner de Actions.

Repositorio → **Settings** → **Secrets and variables** → **Actions** → pestaña
**Variables** → **New repository variable**:

| Nombre | Valor |
| --- | --- |
| `VITE_SITE_NAME` | `JVCloud Consultores` |
| `VITE_API_URL` | `https://api.jvcloud.cl` |

> **Variables, no Secrets.** Todo lo que empieza con `VITE_` termina en texto
> plano dentro del sitio compilado, que es público por definición. Guardarlos
> como secretos daría una falsa sensación de protección sin protección real. Ver
> [04 · Configuración](04-configuracion.md).

Si no las creas, el build igual pasa: las variables llegan vacías y el sitio usa
los valores por defecto de `src/lib/config.js`. No es un error visible, y por eso
conviene revisarlo ahora y no cuando alguien note el dato faltante.

## 6. Dominio propio

Los registros DNS y el dominio en GitHub tienen su propia guía:
[03 · Dominio y DNS](03-dominio-dns.md).

## 7. Comprobar que quedó andando

1. Repositorio → pestaña **Actions**: el workflow *Deploy a GitHub Pages* debe
   aparecer en verde, con sus dos etapas (*Build* y *Deploy*).
2. Repositorio → **Settings** → **Pages**: arriba debe decir *Your site is live at…*.
3. Abre <https://jvcloud.cl> y navega a `/about/`, `/portafolio/` y `/contacto/`.
   Que las rutas internas carguen directo es la prueba de que el build
   multipágina quedó bien.

---

## Proteger la rama `main` (recomendado)

Como cada push a `main` publica en producción, conviene que nadie —incluido uno
mismo un viernes— empuje sin querer.

Repositorio → **Settings** → **Rules** → **Rulesets** → **New branch ruleset**:

| Regla | Valor |
| --- | --- |
| Target | `main` |
| Require a pull request before merging | Sí |
| Require status checks to pass | `Build` |
| Block force pushes | Sí |

Con esto el flujo pasa a ser: rama nueva → pull request → merge → despliegue.

## Dar acceso al equipo

Repositorio → **Settings** → **Collaborators and teams**:

| Rol | Qué puede hacer |
| --- | --- |
| **Write** | Empujar ramas y abrir pull requests. Es el rol para quien edite contenido. |
| **Maintain** | Además, administrar Settings del repositorio salvo lo destructivo. |
| **Admin** | Todo, incluido borrar el repositorio. Que sean pocos. |

---

## Verificar desde la terminal

Con la [CLI de GitHub](https://cli.github.com/) autenticada (`gh auth login`) se
puede revisar la configuración sin entrar al navegador:

```bash
gh repo view jvcloud-consultores/jvcloud-website          # estado general
gh api repos/jvcloud-consultores/jvcloud-website/pages    # config de Pages
gh variable list                                          # variables del build
gh run list --limit 5                                     # últimos despliegues
gh run watch                                              # seguir el que corre ahora
```
