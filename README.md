# ragalgut.me

Blog personal de Rafael Galante Gutiérrez, construido con Jekyll. Comparte artículos y proyectos sobre arquitectura cloud, Azure, Terraform, automatización y desarrollo web.

## Desarrollo local

Requiere Ruby 3.3, Bundler y las dependencias de `Gemfile.lock`.

```sh
bundle install
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

Abre http://127.0.0.1:4000/. Los cambios en `_config.yml` y los plugins requieren reiniciar el servidor. Analytics y comentarios solo se cargan en producción; los comentarios, además, requieren pulsar su botón. Las páginas de herramientas no cargan analítica y limitan sus recursos a este mismo sitio.

## Estructura

- `_layouts/` y `_includes/`: estructura compartida, tarjetas, navegación y metadatos.
- `_sass/` y `assets/css/main.scss`: estilos editoriales, compilados en un único archivo CSS.
- `assets/js/`: interacciones nativas del navegador, archivo de artículos y generador.
- `_pages/`: archivo, temas, perfil y herramienta.
- `_data/topics.yml`: las tres familias editoriales y sus descripciones.
- `_projects/`: fichas de proyectos, con su propia colección y URLs.
- `_data/clients.yml` y `_data/tools.yml`: marcas del bloque de clientes y catálogo de herramientas.
- `_data/certifications.yml`: credenciales de Acerca de y la destacada en la cabecera de inicio.
- `_plugins/related-posts.rb`: selección de artículos por tecnologías compartidas, tema y fecha.
- `_posts/` e `images/`: artículos y medios.
- `scripts/` y `tests/`: auditoría del sitio generado y pruebas del generador.
- `assets/examples/`: ejemplos descargables que acompañan a los artículos; no se ejecutan como workflows de este blog.

La portada muestra los seis artículos más recientes. `/articulos/` permite buscar y combinar tema principal, tecnología y año, ordenar por fecha y paginar de doce en doce. `/tags/` es un directorio breve con recuentos y accesos al archivo. Las tecnologías y años se obtienen automáticamente de los artículos. Sin JavaScript, todo el archivo sigue disponible. Los enlaces antiguos con `?tema=Azure` siguen funcionando y se normalizan a `?tecnologia=Azure`.

`_site/` es el resultado de la compilación y no se versiona. GitHub Actions construye y valida el sitio antes de publicarlo en GitHub Pages. El despliegue utiliza la rama `main`.

Los mapas de depuración de los estilos solo se generan en desarrollo.

## Publicar un artículo

Crea un archivo `_posts/AAAA-MM-DD-titulo.markdown`. Ejemplo de metadatos:

```yaml
---
layout: post
title: Desplegar infraestructura en Azure con Terraform
seo_title: Terraform en Azure: guía de despliegue
description: Una descripción concreta de lo que encontrará el lector en esta guía.
date: 2026-10-29 10:00:00 +0100
permalink: /desplegar-infraestructura-azure-terraform
focus_keyphrase: desplegar infraestructura en Azure con Terraform
keywords: [infraestructura como código, automatización en Azure]
image: /images/mi-portada.webp
image_alt: Descripción de lo que muestra la portada
image_width: 1200
image_height: 630
tags: [Azure, Terraform]
topic: automatizacion
---
```

El título visible es el H1. Usa H2 para las secciones y H3 para sus apartados. `seo_title` es opcional y permite un título más conciso para buscadores; `description` debe ser única y describir el contenido real. La frase clave debe aparecer con naturalidad en el título, introducción y apartados relevantes. `keywords` recoge variantes o términos relacionados para los datos estructurados; no se genera una etiqueta `meta keywords`.

No cambies una URL publicada sin preparar su redirección. Si renombras el archivo, conserva el `permalink` anterior. Añade `last_modified_at` solo cuando actualices sustancialmente el contenido, con la fecha real.

Cada artículo debe tener un único `topic`: `cloud`, `automatizacion` o `desarrollo-web`. Usa `tags` para las tecnologías concretas. Los temas principales aparecen en las tarjetas, los filtros, la búsqueda y los datos estructurados. La auditoría detecta artículos sin tema válido.

En una guía incluye objetivo, requisitos, pasos y verificación final. Para un índice desplegable, añade `{% include article-toc.html %}` antes de las secciones: Kramdown genera los enlaces de H2 y H3 al compilar, sin JavaScript. Los relatos de experiencias pueden adaptar esta estructura y explicar su contexto.

Una revisión documental se registra con su alcance real, conservando la fecha de publicación y las capturas históricas cuando aportan contexto. No equivale a volver a ejecutar un procedimiento. Ejemplo:

```yaml
editorial_review:
  date: 2026-10-29
  note: Revisión documental de requisitos y comandos; sin ejecución en Azure.
  sources:
    - title: Documentación oficial de la plataforma
      url: https://learn.microsoft.com/
```

El contacto profesional de Acerca de y del pie utiliza el enlace de LinkedIn definido en `_config.yml`.

Las certificaciones se mantienen en `_data/certifications.yml`, con su nombre, imagen y enlace público de verificación. La entrada con `featured_home: true` aparece también junto al retrato de la portada; incluye `short_name` y `year` para ese bloque. Al renovar el MCT, actualiza esa misma entrada y su insignia.

Usa imágenes WebP o SVG, con texto alternativo descriptivo. Indica sus dimensiones reales para reservar espacio durante la carga. En Markdown, coloca los atributos justo después de la imagen:

```liquid
![Descripción útil de la captura]({{ '/images/captura.webp' | relative_url }}){: width="1200" height="700" loading="lazy" decoding="async"}
```

Usa `relative_url` para los recursos locales. Las canónicas y los datos sociales se generan con el dominio de producción; las vistas filtradas del archivo comparten su canónica. El feed Atom y el sitemap se generan automáticamente. La página 404 queda fuera del sitemap y lleva `noindex`.

## Validación

```sh
JEKYLL_ENV=production bundle exec jekyll build
python3 scripts/audit_site.py _site
node --test tests/password-core.test.mjs
```

Las pruebas de JavaScript requieren Node.js 22 o superior. La auditoría revisa títulos y descripciones únicos, una canónica y un H1 por página, jerarquía de encabezados, identificadores, alt y dimensiones de imágenes, enlaces y anclas internos, JSON-LD, índice de búsqueda, sitemap y feed. No sustituye la revisión editorial ni la comprobación de servicios externos.

Para comprobar una publicación en un subdirectorio:

```sh
JEKYLL_ENV=production bundle exec jekyll build --baseurl /prueba --destination /tmp/ragalgut-prueba
python3 scripts/audit_site.py /tmp/ragalgut-prueba --baseurl /prueba
```

La revisión visual debe cubrir pantallas pequeñas y grandes, temas claro y oscuro, navegación con teclado, búsqueda y filtros. Las instrucciones técnicas de los artículos conservan su contexto y fecha de publicación; revísalas cuando cambien las plataformas descritas.

## Imágenes adaptables

Los originales se conservan en `images/`. Para generar o actualizar sus variantes WebP, utiliza Python con Pillow y soporte WebP:

```sh
python3 scripts/prepare_images.py
```

El script prepara `images/responsive/` y `_data/images.json`, retira variantes que ya no correspondan a originales y evita ampliar imágenes pequeñas. Las variantes se guardan junto al código; el servidor y GitHub Actions no necesitan Pillow para compilar.

Para usar las variantes en un artículo:

```liquid
{% include responsive-image.html src='/images/captura.webp' alt='Descripción útil' width=1200 height=700 zoom=true %}
```

La ampliación utiliza el original. En tarjetas, retratos y portadas se indican los tamaños reales de presentación mediante `sizes`. La auditoría comprueba también todos los candidatos de `srcset`.

## Añadir un proyecto o cliente

Crea `_projects/nombre-del-proyecto.md` con título, descripción, cliente, sector, trabajo realizado, tecnologías, URL pública, imagen y resumen. Utiliza la ficha de Moima como referencia. La colección genera la página de detalle; el listado y la selección de inicio se actualizan automáticamente según `order`.

Explica en el contenido el punto de partida, los objetivos, las decisiones de diseño y tu participación. `seo_title` permite concretar el título de búsqueda. El campo opcional `deliverables` genera el bloque «El resultado»: cada elemento contiene `title` y `description` y describe una parte real de la entrega.

El campo opcional `gallery` añade capturas ampliables de escritorio y móvil. Cada entrada indica `image`, `alt`, `label`, `width`, `height` y la `url` de la página capturada; `format: mobile` utiliza el marco vertical. Conserva las capturas reales en `images/projects/` y vuelve a preparar las variantes con `scripts/prepare_images.py`.

Añade a `_data/clients.yml` únicamente marcas reales que puedas mostrar, con el logo original y sus dimensiones. El bloque aparece al final de inicio y del listado de proyectos.

El catálogo de herramientas está en `_data/tools.yml`; cada herramienta enlaza su página y su módulo de interacción. Por ahora solo incluye el generador de contraseñas.

## Imagen para compartir la portada

`images/social/ragalgut.png` es la tarjeta de 1200 × 630 píxeles utilizada por los metadatos de la portada. Su diseño editable está en `scripts/social-card.html`, excluido del sitio publicado. Para actualizarla, copia ese HTML temporalmente al destino del servidor local, ábrelo desde ese servidor y captura el área de 1200 × 630 píxeles. La imagen de perfil debe haber terminado de cargar. Exporta la captura como PNG a la misma ruta y vuelve a ejecutar `scripts/prepare_images.py`. Las tarjetas sociales conservan su resolución original y no generan variantes para la página.

## Pruebas adicionales

```sh
bundle exec ruby tests/related-posts_test.rb
terraform fmt -check assets/examples/terraform-azure-oidc/main.tf
actionlint -shellcheck= assets/examples/terraform-azure-oidc/workflow.yml
```

La validación del ejemplo de Terraform se realiza en una carpeta temporal con `terraform init -backend=false` y `terraform validate`. La autenticación OIDC y el despliegue necesitan una suscripción de pruebas; no forman parte de la compilación del blog.
