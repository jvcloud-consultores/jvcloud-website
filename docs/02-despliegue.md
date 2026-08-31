# 02 · Despliegue

Cómo llega el sitio a producción, qué hacer cuando algo falla y cómo volver
atrás.

---

## El flujo, completo

```
git push a main
      │
      ▼
GitHub Actions ── .github/workflows/deploy.yml
      │
      ├─ job "build"
      │    checkout → Node 24 (según .nvmrc) → npm ci → npm run build
      │    con VITE_SITE_NAME desde las Variables del repo
      │    → sube dist/ como artefacto de Pages
      │
      └─ job "deploy"
           publica el artefacto en el entorno github-pages
      │
      ▼
https://jvcloud.cl
```

Tarda entre uno y tres minutos. El único disparador automático es un push a
`main`; ninguna otra rama despliega.

## Lanzarlo a mano

El workflow declara `workflow_dispatch`, así que se puede ejecutar sin cambiar
código —útil después de tocar una variable del repositorio, que por sí sola no
dispara nada:

Repositorio → **Actions** → *Deploy a GitHub Pages* → **Run workflow** → rama
`main`.

O desde la terminal:

```bash
gh workflow run "Deploy a GitHub Pages" --ref main
gh run watch
```

## Qué hace cada paso

El archivo es [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

| Paso | Acción | Detalle |
| --- | --- | --- |
| Checkout | `actions/checkout@v4` | Baja el repositorio |
| Configurar Node | `actions/setup-node@v4` | Lee `.nvmrc` para usar la misma versión que en local, y cachea npm |
| Instalar | `npm ci` | Instala exactamente lo que fija `package-lock.json`, sin resolver versiones de nuevo |
| Build | `npm run build` | Compila a `dist/` con las variables `VITE_*` |
| Artefacto | `actions/upload-pages-artifact@v3` | Empaqueta `dist/` |
| Deploy | `actions/deploy-pages@v4` | Publica en el entorno `github-pages` |

Dos decisiones que conviene no deshacer:

- **`concurrency: pages` con `cancel-in-progress: false`.** Un despliegue a la
  vez, y el que ya está corriendo se deja terminar. Cancelar a medio publicar
  puede dejar el sitio en un estado intermedio.
- **`npm ci` y no `npm install`.** `ci` respeta el lockfile al pie de la letra;
  `install` puede actualizar dependencias en silencio y hacer que el build del
  runner no sea el mismo que probaste en tu equipo.

---

## Cuando falla

Repositorio → **Actions** → el run en rojo → abre el paso que falló. Casi
siempre es uno de estos cuatro.

### El build no compila

El error sale en el paso *Build*. Reprodúcelo en local, que es más rápido que
iterar por commits:

```bash
npm ci        # igual que el runner: borra node_modules y usa el lockfile
npm run build
```

Si en tu equipo compila y en el runner no, el sospechoso es la versión de Node.
Compara `node --version` con lo que dice [`.nvmrc`](../.nvmrc).

### `npm ci` falla por el lockfile

Pasa cuando alguien editó `package.json` sin actualizar `package-lock.json`.
Se arregla regenerándolo y versionándolo:

```bash
npm install
git add package-lock.json
git commit -m "Actualiza el lockfile"
```

### El deploy falla con error de permisos

Revisa que Pages siga en **Source: GitHub Actions** y que la organización no haya
restringido los permisos de Actions. Ver [01 · GitHub](01-github.md), pasos 3 y 4.

### El sitio publica pero se ve sin estilos o con 404

Casi siempre es una ruta escrita a mano que no existe en el build. Verifica
localmente con el servidor de preview, que sirve `dist/` igual que producción:

```bash
npm run build
npm run preview     # http://localhost:4173
```

Es la única forma fiable de comprobar rutas como `/portafolio/` antes de
empujar: el servidor de desarrollo es más permisivo que Pages.

---

## Volver atrás

No hay botón de rollback en Pages: se publica siempre el último build. Para
volver a un estado anterior, revierte el commit y deja que el flujo normal
publique de nuevo.

```bash
git revert <sha-del-commit-malo>
git push origin main
```

`revert` crea un commit nuevo que deshace los cambios, sin reescribir la
historia. Prefiérelo a `reset --hard` sobre `main`: si la rama está protegida el
push forzado ni siquiera pasará, y si no lo está, borrarías historia que otros ya
tienen.

Para un incidente que hay que cortar ya, es más rápido revertir el merge completo
que buscar el commit exacto.

---

## El entorno `github-pages`

En **Settings** → **Environments** aparece un único entorno, `github-pages`, con
**1 protection rule**. No hay que crearlo ni configurarlo: GitHub lo genera solo
al poner Pages en *Source: GitHub Actions*, y el workflow lo nombra en el job
`deploy`.

La regla de protección que trae por defecto es una **deployment branch policy**:
solo la rama por defecto —`main`— puede desplegar en ese entorno. Es la razón por
la que un push a cualquier otra rama no publica, aunque alguien copie el workflow.

Ese entorno además guarda el historial de publicaciones: al entrar se ve qué
commit está en línea y cuándo se desplegó. Es el lugar más directo para responder
"¿qué versión está publicada ahora mismo?".

> **No lo borres** (el tacho a la derecha en esa pantalla). Sin el entorno, el job
> `deploy` falla y el sitio se queda en la última versión publicada.

---

## Dónde mirar el estado

| Qué | Dónde |
| --- | --- |
| Últimos despliegues | Repositorio → **Actions** |
| Estado del sitio | Repositorio → **Settings** → **Pages** |
| Historial de publicaciones | Repositorio → **Environments** → `github-pages` |
| Desde la terminal | `gh run list`, `gh run view <id> --log-failed` |
