---
layout: post
title:  Creando un sitio web estático con Jekyll y GitHub
description: Crea un sitio web estático con Jekyll y publícalo en GitHub Pages. Guía de instalación, repositorio, despliegue y configuración de un dominio propio.
date:   2023-06-05 15:01:35 +0300
image:  '/images/jekyll-github.webp'
seo_title: "Crear un sitio web con Jekyll y GitHub Pages"
focus_keyphrase: sitio web con Jekyll y GitHub Pages
keywords: [blog estático, publicar con Jekyll, alojamiento en GitHub Pages]
image_alt: Jekyll y GitHub para crear y publicar un sitio web estático
image_width: 1774
image_height: 1180
tags:   [Jekyll, GitHub]
topic: desarrollo-web
last_modified_at: 2026-10-29 09:06:00 +0100
editorial_review:
  date: 2026-10-29
  note: "Instalación y publicación contrastadas con las fuentes oficiales. Las capturas de Windows corresponden a 2023; esa instalación no se ha repetido. La compilación actual de este blog sí se ha comprobado localmente con Ruby 3.3."
  sources:
    - title: "Jekyll: instalación en Windows"
      url: https://jekyllrb.com/docs/installation/windows/
    - title: "GitHub Docs: configurar la publicación de Pages"
      url: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
    - title: "GitHub Docs: gestionar un dominio personalizado"
      url: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
---

En este artículo voy a mostrar paso a paso cómo crear un sitio web estático con **Jekyll** desde un equipo con **Windows 11** y cómo alojarlo en un repositorio de **GitHub**. No me voy a extender mucho en el uso de **Jekyll**, para ello he adjuntado unos enlaces de interés a la documentación oficial; me centraré en la creación del sitio y el correspondiente despliegue en **GitHub**.


{% include article-toc.html %}

## Objetivo

Crear un sitio estático, comprobarlo en local y publicarlo mediante GitHub Pages con un dominio propio opcional.

> Las capturas de instalación corresponden a Windows 11 en 2023. Las versiones que aparecen en ellas son una referencia del laboratorio. Para un proyecto existente, utiliza la versión de Ruby indicada por el proyecto y sus dependencias bloqueadas.

## Arquitectura, cómo trabajar con Jekyll y GitHub

   ![Diagrama de trabajo local con Jekyll y publicación en GitHub Pages]({{ '/images/arquitectura-jekyll-github-pages.svg' | relative_url }}){: width="730" height="171" loading="lazy" decoding="async"}

   **Jekyll** permite ejecutar nuestro sitio estático en un servidor local *http://localhost:4000*. Esto nos permite revisar los cambios que aplicamos en el repositorio local en nuestro equipo antes de aplicar un commit o un push al repositorio público.

   Por lo tanto el repositorio local lo trato como entorno de desarrollo y el público como producción.

   Una vez realizado un push al repositorio público se ejecuta automáticamente un workflow de **GitHub Actions** que despliega el sitio de **Jekyll** en **GitHub Pages**.

## Prerrequisitos

Necesitas una cuenta de GitHub, Git instalado y Ruby con sus herramientas de compilación. En Windows, sigue la [instalación oficial de Jekyll mediante RubyInstaller](https://jekyllrb.com/docs/installation/windows/), seleccionando una versión Ruby+Devkit compatible con el proyecto desde [RubyInstaller](https://rubyinstaller.org/downloads/). Windows requiere los ajustes descritos en esa documentación.

Durante la instalación nos aseguramos tener marcadas las siguientes dos opciones:

- Add Ruby executables to your PATH.
- Associate .rb and .rbw files with this Ruby installation.

{% include responsive-image.html src="/images/install-ruby-devkit1.webp" alt="Instalación Ruby+Devkit" width=698 height=570 zoom=true %}

En las capturas originales seleccioné estos componentes; las versiones disponibles ahora pueden ser distintas:

- Ruby-3.2.2 base files.
- Ruby RI and HTML documentation.
- MSYS2 development toolchain 2023-04-01.

{% include responsive-image.html src="/images/install-ruby-devkit2.webp" alt="Instalación Ruby+Devkit" width=698 height=571 zoom=true %}

Tras finalizar la instalación dejamos marcado "*Run ridk install*" para que arranque la instalación de *MSYS2 y las herramientas de desarrollo*.

{% include responsive-image.html src="/images/install-ruby-devkit3.webp" alt="Instalación Ruby+Devkit" width=696 height=569 zoom=true %}

Por último tenemos que instalar el componente *3 - MSYS2 and MINGW development toochain*.

{% include responsive-image.html src="/images/install-ruby-devkit4.webp" alt="Instalación Ruby+Devkit" width=1101 height=636 zoom=true %}


## Instalar Jekyll

Los comandos que facilito a continuación se ejecutan **desde una consola CMD**.

Lo primero que tenemos que hacer es **instalar Jekyll**:

```
gem install jekyll bundler
```
El siguiente comando sirve para comprobar la **versión de Jekyll** instalada:

```
jekyll -v
```
Para **crear** un nuevo blog o **sitio estático** ejecutamos el siguiente comando:

```
jekyll new myblog
```
Para **arrancar el servidor local de Jekyll** y visualizar el blog accedemos a la carpeta myblog, instalamos las dependencias y ejecutamos:

```
cd myblog
bundle install
```
```
bundle exec jekyll serve
```

Abrimos en el navegador la siguiente URL *http://localhost:4000* y podremos visualizar el blog.

{% include responsive-image.html src="/images/myblog.webp" alt="Visualizar sitio estático desde servidor local de Jekyll" width=972 height=928 zoom=true %}

## Enlaces de interés Jekyll

Para que puedas ampliar conocimientos sobre el uso de **Jekyll** te facilito una serie de recursos de la documentación oficial que te ayudarán a entender la estructura de directorios, creación de contenido, plugins y temas, entre otros.

### Contenido

1. [Pages](https://jekyllrb.com/docs/pages/)
2. [Post](https://jekyllrb.com/docs/posts/)
3. [Front Matter](https://jekyllrb.com/docs/front-matter/)
4. [Collections](https://jekyllrb.com/docs/collections/)
5. [Data Files](https://jekyllrb.com/docs/datafiles/)
6. [Assets](https://jekyllrb.com/docs/assets/)
7. [Static Files](https://jekyllrb.com/docs/static-files/)
8. [Plugins](https://jekyllrb.com/docs/plugins/)

### Estructura del sitio

1. [Structure](https://jekyllrb.com/docs/structure/)
2. [Liquid](https://jekyllrb.com/docs/liquid/)
3. [Variables](https://jekyllrb.com/docs/variables/)
4. [Includes](https://jekyllrb.com/docs/includes/)
5. [Layouts](https://jekyllrb.com/docs/layouts/)
6. [Permalinks](https://jekyllrb.com/docs/permalinks/)
7. [Themes](https://jekyllrb.com/docs/themes/)
8. [Pagination](https://jekyllrb.com/docs/pagination/)

## Publicar sitio en GitHub

Para publicar nuestro sitio estático en **GitHub** seguimos los siguientes pasos:

1. **Crear un repositorio en GitHub**.

   {% include responsive-image.html src="/images/create-new-public-repository-github.webp" alt="Crear repositorio público en GitHub" width=1019 height=752 zoom=true %}

2. **Clonamos nuestro repositorio** en un directorio local de nuestro equipo. Yo hago uso de [Visual Studio Code](https://code.visualstudio.com/), pero también existen otras herramientas que facilitan la gestión de repositorios de **GitHub** como [GitHub Desktop](https://desktop.github.com/).

3. **Copiamos el contenido** de nuestro sitio al repositorio clonado.

4. **Hacemos commit de todos los cambios** y posteriormente un **push** para que se suba el contenido al repositorio público.

   {% include responsive-image.html src="/images/push-myblog-jekyll.webp" alt="Contenido del sitio en repositorio público" width=1282 height=791 zoom=true %}

## Desplegar sitio en GitHub Pages   

Una vez tenemos nuestro sitio público en **GitHub** tenemos que configurar **GitHub Pages** para que muestre el sitio web en un dominio de **GitHub**. Para ello vamos a *Settings > Pages* desde el repositorio público.

{% include responsive-image.html src="/images/settings-github-pages.webp" alt="Configurar GitHub Pages" width=1503 height=826 zoom=true %}

En *source* seleccionamos **GitHub Actions**.

{% include responsive-image.html src="/images/source-github-pages.webp" alt="Configurar GitHub Pages" width=987 height=677 zoom=true %}

Seleccionamos configurar **Jekyll**.

{% include responsive-image.html src="/images/configure-jekyll-github-pages.webp" alt="Desplegar Jekyll en GitHub Pages" width=986 height=652 zoom=true %}

Por último hacemos *commit* para aplicar el workflow que **GitHub Actions** nos facilita para el despliegue del sitio de **Jekyll** en **GitHub Pages**.

{% include responsive-image.html src="/images/commit-actions-github-pages.webp" alt="Desplegar Jekyll en GitHub Pages" width=1422 height=72 zoom=true %}

## Configurar un dominio personalizado

   Un sitio de usuario utiliza `https://[usuarioGitHub].github.io/`; un sitio de proyecto suele añadir `/[repositorio]/`. Configura `url` y `baseurl` de Jekyll según el destino.

   Antes de tocar el DNS, verifica la propiedad del dominio y añádelo en *Settings > Pages > Custom domain*. Después configura los registros de tu proveedor, siguiendo la [documentación oficial de dominios personalizados](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). Para un dominio raíz, los registros del ejemplo son:

   Crear los siguientes **registros A**:

   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   Crear los siguientes **registros AAAA**:

   ```
   2606:50c0:8000::153
   2606:50c0:8001::153
   2606:50c0:8002::153
   2606:50c0:8003::153
   ```

   Crear un **registro CNAME** en la que el subdominio sea **www** y el destino **[usuarioGitHub].github.io**.

   {% include responsive-image.html src="/images/config-dns-zone-github-pages.webp" alt="Configurar zona DNS en proveedor de dominio" width=743 height=573 zoom=true %}

   Comprueba el dominio que has guardado en *Settings > Pages* y activa *Enforce HTTPS* cuando esté disponible.

   {% include responsive-image.html src="/images/custom-domain-github-pages.webp" alt="Configurar dominio personalizado GitHub Pages" width=979 height=595 zoom=true %}

   Tras validar el dominio personalizado el sitio web estará en marcha.
   
   {% include responsive-image.html src="/images/github-pages-live.webp" alt="Sitio validado y publicado" width=992 height=234 zoom=true %}

## Verificación final

Antes de publicar, ejecuta `bundle exec jekyll build` y corrige los errores. En local revisa navegación, imágenes y enlaces con el `baseurl` real. Tras el despliegue, comprueba que GitHub Actions termina correctamente, que la URL pública carga por HTTPS y que las rutas internas funcionan sin pasar por la portada.

## Conclusión

En este artículo has visto cómo levantar un blog con **Jekyll** desde cero, publicarlo en **GitHub** y desplegarlo automáticamente en **GitHub Pages**, incluyendo la configuración de un dominio personalizado.

GitHub Pages permite alojar sitios estáticos de repositorios públicos con GitHub Free. Revisa los límites y las condiciones del plan que uses; registrar un dominio propio tiene su coste independiente.

Si tienes alguna duda sobre alguno de los pasos o quieres compartir cómo has personalizado tu propio sitio, déjame un comentario.
