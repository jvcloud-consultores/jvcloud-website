# 03 · Dominio y DNS

El sitio se sirve en `jvcloud.cl`, un dominio `.cl` registrado en
[NIC Chile](https://www.nic.cl/). Esta guía cubre los registros DNS, el dominio
propio en GitHub y el certificado HTTPS.

---

## 1. Registros DNS

En el panel de tu proveedor DNS —NIC Chile directamente, o el servicio al que
hayas delegado los nameservers— deben existir estos registros.

### Dominio raíz (`jvcloud.cl`)

Cuatro registros **A**, uno por cada IP de GitHub Pages:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

Opcionalmente, los mismos cuatro en IPv6 (registros **AAAA**):

| Tipo | Nombre | Valor |
| --- | --- | --- |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

### Subdominio `www`

Un registro **CNAME**, nunca un A:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| CNAME | `www` | `jvcloud-consultores.github.io` |

> Algunos paneles exigen el punto final: `jvcloud-consultores.github.io.` — y
> otros lo agregan solos. Si el panel rechaza el valor, prueba con el punto.

Con esto, `www.jvcloud.cl` redirige al dominio raíz. GitHub Pages hace esa
redirección por su cuenta una vez configurado el dominio propio.

> Las IPs de GitHub Pages cambian muy de vez en cuando. La fuente autoritativa es
> la [documentación de GitHub sobre dominios
> propios](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site).
> Si el sitio deja de responder sin que nadie haya tocado nada, contrástalas.

## 2. Verificar la propagación

Antes de seguir, confirma que el DNS ya responde. Puede tardar desde minutos
hasta unas horas.

```bash
dig +short jvcloud.cl A
# 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153

dig +short www.jvcloud.cl CNAME
# jvcloud-consultores.github.io.
```

Si `dig` devuelve vacío, el registro todavía no propagó o quedó mal escrito. Para
saltarte la caché de tu resolvedor local, pregunta directo a un DNS público:

```bash
dig @1.1.1.1 +short jvcloud.cl A
```

## 3. Configurar el dominio en GitHub

Repositorio → **Settings** → **Pages** → **Custom domain** → escribe
`jvcloud.cl` → **Save**.

GitHub valida el DNS en ese momento. Si los registros aún no propagaron, mostrará
un error: espera y vuelve a guardar.

## 4. Activar HTTPS

Cuando la validación pase, marca **Enforce HTTPS** en esa misma pantalla. GitHub
emite un certificado de Let's Encrypt solo, y lo renueva solo.

Si la casilla aparece deshabilitada, es que el certificado todavía se está
emitiendo. Suele tomar unos minutos y a veces hasta una hora; no hay nada que
hacer más que esperar y recargar.

## 5. El archivo `CNAME`

[`public/CNAME`](../public/CNAME) contiene exactamente una línea: `jvcloud.cl`.
Todo lo que está en `public/` se copia tal cual a `dist/`, así que ese archivo
viaja en cada build.

> **No lo borres.** Guardar el dominio propio en Settings hace que GitHub escriba
> ese archivo en la rama de publicación, pero como aquí se publica desde un
> artefacto, el archivo tiene que venir en el build. Sin él, GitHub Pages pierde
> el dominio en el siguiente despliegue y el sitio vuelve a responder solo en
> `jvcloud-consultores.github.io`.

Si algún día cambia el dominio, hay que tocar tres lugares:

1. `public/CNAME`
2. Settings → Pages → Custom domain
3. Los `<link rel="canonical">` y las metas `og:url` de cada página

---

## Diagnóstico rápido

| Síntoma | Causa más probable |
| --- | --- |
| El dominio no resuelve | Registros A ausentes o mal escritos; DNS sin propagar |
| Resuelve pero da 404 | Pages no está publicando: revisa Actions y que Source siga en *GitHub Actions* |
| Advertencia de certificado | *Enforce HTTPS* sin marcar, o el certificado aún emitiéndose |
| Funcionaba y dejó de andar tras un deploy | Falta `public/CNAME` |
| `www` no redirige | Falta el CNAME de `www`, o quedó como registro A |

Para ver qué está respondiendo realmente:

```bash
curl -sI https://jvcloud.cl | head -5
curl -sI https://www.jvcloud.cl | head -5    # debe traer un 301 al dominio raíz
```
