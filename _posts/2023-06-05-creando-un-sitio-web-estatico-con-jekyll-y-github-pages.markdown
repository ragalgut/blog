---
layout: post
title:  Creando un sitio web estático con Jekyll y GitHub
description: Te detallo como puedes crear un sitio web estático con Jekyll y alojarlo de forma gratuita en GitHub.
date:   2023-06-05 15:01:35 +0300
image:  '/images/jekyll-github.webp'
tags:   [Jekyll, GitHub, Windows 11]
---

En este artículo voy a mostrar paso a paso como crear un sitio web estático con **Jekyll** desde un equipo con **Windows 11** y como alojarlo en un repositorio de **GitHub**. No me voy a extender mucho en el uso de **Jekyll**, para ello he adjuntado unos enlaces de interés a la documentación oficial, me centraré en la creación del sitio y el correspondiente despliegue en **GitHub**.

## Tabla de contenidos
1. [Arquitectura, como trabajar con Jekyll y GitHub](#arquitectura-como-trabajar-con-jekyll-y-github)
2. [Prerequisitos](#prerequisitos)
3. [Instalar Jekyll](#instalar-jekyll)
4. [Enlaces de interés Jekyll](#enlaces-de-interés-jekyll)
5. [Publicar sitio en GitHub](#publicar-sitio-en-github)
6. [Desplegar sitio en GitHub Pages](#desplegar-sitio-en-github-pages)
7. [Configurar un dominio personalizado](#configurar-un-dominio-personalizado)

## Arquitectura, como trabajar con Jekyll y GitHub

   ![Sitio validado y publicado](/images/arquitectura-jekyll-github-pages.svg)

   **Jekyll** permite ejecutar nuestro sitio estático en un servidor local *http://localhost:4000*. Esto nos permite revisar los cambios que aplicamos en el repositorio local en nuestro equipo antes de aplicar un commit o un push al repositorio público.

   Por lo tanto el repositorio local lo trato como entorno de desarrollo y el público como producción.

   Una vez realizado un push al repositorio público se ejecuta automáticamente un workflow de **GitHub Actions** que despliega el sitio de **Jekyll** en **GitHub Pages**.

## Prerequisitos

Es necesario descargar e instala la última versión de **Ruby+Devkit** desde el siguiente [enlace](https://rubyinstaller.org/downloads/). Este conjunto de herramientas instala el lenguaje **Ruby** y un entorno de ejecución.

Durante la instalación nos aseguramos tener marcadas las siguientes dos opciones:

- Add Ruby executables to your PATH.
- Associate .rb and .rbw files with this Ruby installation.

![Instalación Ruby+Devkit](/images/install-ruby-devkit1.webp)

Y también los siguientes componentes para la instalación:

- Ruby-3.2.2 base files.
- Ruby RI and HTML documentation.
- MSYS2 development toolchain 2023-04-01.

![Instalación Ruby+Devkit](/images/install-ruby-devkit2.webp)

Tras finalizar la instalación dejamos marcado "*Run ridk install*" para que arranque la instalación de *MSYS2 y las herramientas de desarrollo*.

![Instalación Ruby+Devkit](/images/install-ruby-devkit3.webp)

Por último tenemos que instalar el componente *3 - MSYS2 and MINGW development toochain*.

![Instalación Ruby+Devkit](/images/install-ruby-devkit4.webp)


## Instalar Jekyll

Los comandos que facilito a continuación se ejecutan **desde una consola CMD**.

Lo primero que tenemos que hacer es **instalar Jekyll**:

```
gem install jekyll bundler
```
El siguiente comando sirve para comprobar la **versión de Jekyll** instalada:

```
jekyll -v command
```
Para **crear** un nuevo blog o **sitio estático** ejecutamos el siguiente comando:

```
jekyll new myblog
```
Para **arrancar el servidor local de Jekyll** y visualizar el blog accedemos a la carpeta myblog y ejecutamos:

```
cd myblog
```
```
bundle exec jekyll serve
```

Abrimos en el navegador la siguiente URL *http://localhost:4000* y podremos visualizar el blog.

![Visualizar sitio estático desde servidor local de Jekyll](/images/myblog.webp)

## Enlaces de interés Jekyll

Para que podáis ampliar conocimientos sobre el uso de **Jekyll** os facilito una serie de recursos de la documentación oficial que os ayudará a entender la estructura de directorios, creación de contenido, plugins y temas, entre otros.

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

   ![Crear repositorio público en GitHub](/images/create-new-public-repository-github.webp)

2. **Clonamos nuestro repositorio** en un directorio local de nuestro equipo. Yo hago uso de [Visual Studio Code](https://code.visualstudio.com/), pero también existen otras herramientas que facilitan la gestión de repositorios de **GitHub** como [GitHub Desktop](create-new-public-repository-github.png).

3. **Copiamos el contenido** de nuestro sitio al repositorio clonado.

4. **Hacemos commit de todos los cambios** y posteriormente un **push** para que se suba el contenido al repositorio público.

   ![Contenido del sitio en repositorio público](/images/push-myblog-jekyll.webp)

## Desplegar sitio en GitHub Pages   

Una vez tenemos nuestro sitio público en **GitHub** tenemos que configurar **GitHub Pages** para que muestre el sitio web en un dominio de **GitHub**. Para ello vamos a *Settings > Pages* desde el repositorio público.

![Configurar GitHub Pages](/images/settings-github-pages.webp)

En *source* seleccionamos **GitHub Actions**.

![Configurar GitHub Pages](/images/source-github-pages.webp)

Seleccionamos configurar **Jekyll**.

![Desplegar Jekyll en GitHub Pages](/images/configure-jekyll-github-pages.webp)

Por último hacemos *commit* para aplicar el workflow que **GitHub Actions** nos facilita para el despliegue del sitio de **Jekyll** en **GitHub Pages**.

![Desplegar Jekyll en GitHub Pages](/images/commit-actions-github-pages.webp)

## Configurar un dominio personalizado

   El dominio que viene por defecto para **GitHub Pages** tiene el siguiente formato [usuarioGitHub].github.io.
   Si queremos agregar nuestro propio dominio, en mi caso ragalgut.me, tenemos que agregar los siguientes registros en la configuración DNS de nuestro proveedor de dominio.

   Crear los siguientes **registros A**:

   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   Crear los siguientes **registros AAA**:

   ```
   72606:50c0:8000::153
   2606:50c0:8001::153
   2606:50c0:8002::153
   2606:50c0:8003::153
   ```

   Crear un **registro CNAME** en la que el subdominio sea **www** y el destino **[usuarioGitHub].github.io**.

   ![Configurar zona DNS en proveedor de dominio](/images/config-dns-zone-github-pages.webp)

   Configuramos el dominio personalizado en *Settings > Pages*.

   ![Configurar dominio personalizado GitHub Pages](/images/custom-domain-github-pages.webp)

   Tras validar el dominio personalizado el sitio web estará live.
   
   ![Sitio validado y publicado](/images/github-pages-live.webp)