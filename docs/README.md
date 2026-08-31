# Documentación del sitio

Guías de operación de [jvcloud.cl](https://jvcloud.cl). Cada archivo se lee solo;
este índice existe para saber a cuál ir.

| Guía | Para qué |
| --- | --- |
| [01 · GitHub](01-github.md) | Crear el repositorio, dar acceso, activar Pages y dejar el despliegue automático andando. Empieza por aquí. |
| [02 · Despliegue](02-despliegue.md) | Cómo publica el sitio, cómo lanzarlo a mano, qué hacer cuando falla y cómo volver atrás. |
| [03 · Dominio y DNS](03-dominio-dns.md) | Registros en NIC Chile, dominio propio en GitHub, HTTPS y el archivo `CNAME`. |
| [04 · Configuración](04-configuracion.md) | `public/config.json`, variables `VITE_*` y qué se puede cambiar sin recompilar. |
| [05 · Desarrollo](05-desarrollo.md) | Levantar el proyecto, estructura, agregar páginas y proyectos, criterios de diseño. |

## Los cinco datos que hay que tener a mano

| Qué | Valor |
| --- | --- |
| Repositorio | `git@github.com:jvcloud-consultores/jvcloud-website.git` |
| Rama que publica | `main` |
| Hosting | GitHub Pages, vía GitHub Actions |
| Dominio | `jvcloud.cl` (registrado en NIC Chile) |
| Node | 24.14.0, fijado en [`.nvmrc`](../.nvmrc) |

## Cómo está armado, en un párrafo

Es un sitio estático multipágina hecho con Vite y JavaScript sin framework. Cada
página es un `index.html` independiente y la navegación son enlaces normales: no
hay router y nada depende de que el JavaScript cargue. En cada push a `main`,
GitHub Actions compila el sitio a `dist/` y publica ese resultado en GitHub
Pages, que lo sirve bajo el dominio propio. No hay servidor, ni base de datos, ni
nada que administrar entre un despliegue y el siguiente.
