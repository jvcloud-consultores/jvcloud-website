# jvcloud-website

Sitio web estático de **JVCloud Consultores** — <https://jvcloud.cl>

Vite + JavaScript sin framework, multipágina (sin router), publicado
automáticamente en GitHub Pages con dominio propio en cada push a `main`.

## Empezar

```bash
nvm use          # Node 24, según .nvmrc
npm install
npm run dev      # http://localhost:5173
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila el sitio a `dist/` |
| `npm run preview` | Sirve `dist/` para revisar el build antes de empujar |

## Documentación

Está toda en [`docs/`](docs/):

| Guía | Para qué |
| --- | --- |
| [01 · GitHub](docs/01-github.md) | Crear el repositorio, activar Pages y dejar el despliegue andando |
| [02 · Despliegue](docs/02-despliegue.md) | Cómo publica, cómo lanzarlo a mano, qué hacer si falla |
| [03 · Dominio y DNS](docs/03-dominio-dns.md) | Registros DNS, dominio propio y HTTPS |
| [04 · Configuración](docs/04-configuracion.md) | `config.json`, variables `VITE_*` y qué se cambia sin recompilar |
| [05 · Desarrollo](docs/05-desarrollo.md) | Estructura, agregar páginas y proyectos, criterios de diseño |

> Un push a `main` publica en producción. Antes de empujar: `npm run build && npm run preview`.

## Licencia

© JVCloud Consultores. Todos los derechos reservados.
