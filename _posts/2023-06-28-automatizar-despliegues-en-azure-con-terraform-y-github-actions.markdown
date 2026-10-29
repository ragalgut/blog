---
layout: post
title:  Automatizar despliegues en Azure con Terraform y GitHub Actions
description: Laboratorio de Terraform en Azure con GitHub Actions y OpenID. Arquitectura, backend, plan y apply, con revisión de los límites del workflow original.
date:   2023-06-28 11:00:00 +0300
image:  '/images/github-actions-workflow-terraform.webp'
seo_title: "Terraform en Azure con GitHub Actions y OpenID"
focus_keyphrase: Terraform en Azure con GitHub Actions
keywords: [infraestructura como código, automatización de Azure, despliegues con OpenID]
image_alt: Flujo de GitHub Actions para desplegar infraestructura de Terraform en Azure
image_width: 1024
image_height: 600
tags:   [Terraform, Azure, GitHub, OpenID]
topic: automatizacion
last_modified_at: 2026-10-29 10:06:00 +0100
editorial_review:
  date: 2026-10-29
  note: "El laboratorio original de 2023 conserva sus capturas. Se añade un ejemplo revisado con terraform fmt, terraform validate y actionlint comprobados en local. La autenticación y el despliegue en Azure siguen pendientes de una prueba real."
  sources:
    - title: "GitHub Docs: OpenID Connect con Azure"
      url: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure
    - title: "GitHub Docs: referencia de claims OIDC"
      url: https://docs.github.com/en/actions/reference/security/oidc
    - title: "GitHub: retirada de las acciones de artefactos v3"
      url: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
    - title: "HashiCorp: backend azurerm"
      url: https://developer.hashicorp.com/terraform/language/backend/azurerm
    - title: "GitHub Docs: protecciones de entornos"
      url: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
    - title: "GitHub Docs: huellas de las claves SSH"
      url: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
    - title: "Código del workflow original revisado"
      url: https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml
---

En este laboratorio automatizo el proceso de *terraform init* a *terraform apply*, con aprobación previa y una conexión a **Azure** mediante **OpenID Connect**. OIDC evita almacenar un secreto de cliente de Azure; las claves SSH para descargar módulos son una credencial independiente.

En este artículo te muestro cómo automatizar despliegues de infraestructura en **Azure** con **módulos de Terraform** usando un workflow de **GitHub Actions**, descargando los módulos a través de **SSH** y realizando la conexión con identidades federadas para **OpenID**.


{% include article-toc.html %}

## Objetivo

Comprender la separación entre plan y aplicación, la autenticación federada y el estado remoto de Terraform a partir del laboratorio de 2023.

> **Estado del ejemplo:** el repositorio original sigue usando `actions/upload-artifact@v3` y `actions/download-artifact@v3`, retiradas en GitHub.com. El workflow necesita migrar a versiones admitidas antes de ejecutarse. Las capturas muestran la ejecución original; esta revisión no incluye un nuevo despliegue.

### Ejemplo revisado para GitHub.com

He preparado una alternativa descargable con acciones actuales, el mismo plan entre ambos jobs y autenticación OIDC para Azure y el estado remoto. Este ejemplo despliega un grupo de recursos directamente, por lo que elimina los pasos y secretos SSH del laboratorio original.

- [Configuración de Terraform main.tf]({{ '/assets/examples/terraform-azure-oidc/main.tf' | relative_url }})
- [Workflow de GitHub Actions]({{ '/assets/examples/terraform-azure-oidc/workflow.yml' | relative_url }})
- [Instrucciones y requisitos del ejemplo]({{ '/assets/examples/terraform-azure-oidc/LEEME.md' | relative_url }})

La validación local de este ejemplo no sustituye una prueba de autenticación y despliegue en Azure. El resto del artículo conserva el recorrido y las capturas originales de 2023.

## Requisitos

Necesitas acceso administrativo para configurar la identidad y sus permisos en Azure, un backend de estado y permisos para configurar el repositorio y sus entornos. Fija versiones compatibles de Terraform y proveedores; revisa también las versiones de las acciones del workflow. El job que solicite un token OIDC debe declarar `id-token: write` y el checkout necesita `contents: read`.

## Arquitectura y contenido

![Arquitectura de despliegue de Terraform en Azure mediante GitHub Actions y OpenID]({{ '/images/280623/diagrama.svg' | relative_url }}){: width="819" height="556" loading="lazy" decoding="async"}

Los recursos que vamos a crear en **Azure** para poner en marcha este escenario son un grupo de recursos *lab-rg*, una cuenta de almacenamiento *labaztfbackend* y un contenedor privado *tbackend*. En el contenedor *tbackend* es donde va a estar almacenado el archivo de estado *terraform.tfstate* con la infraestructura de **Azure** gestionada por **Terraform**. En **Microsoft Entra ID** (antes Azure AD) creo el registro de aplicación *tf-sp-terraform* y dos credenciales federadas para los entornos *plan* y *apply*. La identidad necesita permisos sobre los recursos que va a administrar. En el laboratorio crea grupos de recursos, por lo que ese permiso debe existir a nivel de suscripción; para otras cargas reduce el alcance al grupo de recursos o recurso necesario.

Con un workflow de **GitHub Actions** vamos a automatizar el despliegue de un grupo de recursos llamado *rg-test00* con las etiquetas *test5* y *test6*.

El siguiente repositorio [az-tf-deployment-oidc](https://github.com/ragalgut/az-tf-deployment-oidc) contiene la plantilla original de 2023, que debes adaptar según las observaciones de esta revisión. Para copiarla: *Use this template* > *Create a new repository*.

{% include responsive-image.html src="/images/280623/usar-template.webp" alt="Usar plantilla de GitHub" width=1908 height=592 zoom=true %}

En la raíz del repositorio se encuentran los ficheros *main.tf* y *terraform.tfvars* donde está el código de **Terraform** del proyecto que vamos a desplegar, en este caso un grupo de recursos con un [módulo de Terraform](https://github.com/ragalgut/az-tf-module-resource-group).

- [Código archivo main.tf](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/main.tf)
- [Código archivo terraform.tfvars](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/terraform.tfvars)

La ejecución del workflow se realiza desde el apartado *Actions* en **GitHub**.

- [Código del workflow](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml)


## Configurar backend en Azure

Tenemos que crear en **Azure** un backend donde estará alojado el archivo de estado *terraform.tfstate* con la infraestructura de **Azure** gestionada por **Terraform**.

Hay que crear una cuenta de almacenamiento y un contenedor privado. Para este escenario creo una cuenta de almacenamiento llamada *labaztfbackend* y un contenedor *tbackend*.

{% include responsive-image.html src="/images/280623/cuenta-de-almacenamiento-azure.webp" alt="Azure Storage Account" width=2240 height=1106 zoom=true %}

Posteriormente tendremos que editar el siguiente bloque de nuestro código *main.tf* y agregar el nombre del grupo de recursos, cuenta de almacenamiento y contenedor que hemos creado:

```terraform
backend "azurerm" {
    resource_group_name = "lab-rg"            # Nombre del grupo de recursos donde se encuentra la cuenta de almacenamiento
    storage_account_name = "labaztfbackend"   # Nombre de la cuenta de almacenamiento donde se va almacenar el fichero de estado
    container_name = "tbackend"               # Nombre del container donde se va almacenar el fichero de estado
    key = "terraform.tfstate"                 # Nombre del fichero de estado. El nombre estándar es terraform.tfstate
  }
```


Referencia: [https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/main.tf#L27-L32](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/main.tf#L27-L32)


## Configurar identidades federadas para OpenID

Para la creación de una identidad federada para **OpenID** hay que crear un registro de aplicación en **Microsoft Entra ID**. Para este escenario creo uno llamado *tf-sp-terraform* con acceso '*Solo cuentas de este directorio organizativo (solo de Default Directory: inquilino único)*'.

{% include responsive-image.html src="/images/280623/registro-de-aplicacion.webp" alt="Azure App Registration" width=2216 height=866 zoom=true %}

Posteriormente creamos dos identidades federadas de tipo entorno, llamadas *plan* y *apply*. En el workflow hay dos jobs configurados: uno encargado de ejecutar *Terraform Plan* y otro de ejecutar *Terraform Apply*. Cada job tiene configurado su entorno en **GitHub** (también llamados *plan* y *apply*), siendo el de *apply* el que incluye un proceso previo de aprobación para verificar el plan antes de aplicar los cambios. La identidad federada que crearemos en **Azure** será de tipo entorno para que los jobs validen correctamente con **Azure**.

Para crear una identidad federada accedemos al registro de aplicación creado anteriormente > *Certificados y secretos* > *Credenciales federadas* > *Agregar credencial*.

{% include responsive-image.html src="/images/280623/credenciales-federadas-plan-apply-azure-openid.webp" alt="Credenciales federadas para OpenID" width=2644 height=702 zoom=true %}

El escenario que tenemos que seleccionar es *Acciones de GitHub que implementan recursos de Azure*, la *Organización* es nuestro usuario de **github.com**, en el caso de **GitHub Enterprise** es el nombre de la organización, en *Repositorio* el nombre de nuestro repositorio, *Tipo de entidad* seleccionamos *Entorno* y por último indicamos el nombre de la identidad.

La confianza se configura con **emisor (`iss`), sujeto (`sub`) y audiencia (`aud`)**; no con un «API token». En GitHub.com el emisor es `https://token.actions.githubusercontent.com` y Azure recomienda la audiencia `api://AzureADTokenExchange`.

El sujeto debe coincidir exactamente con el que emite tu repositorio y entorno. El formato histórico era `repo:ORGANIZACION/REPOSITORIO:environment:plan` (o `apply`). GitHub ha introducido sujetos con identificadores inmutables para repositorios nuevos, renombrados o transferidos desde julio de 2026. Comprueba el formato de tu repositorio en la [referencia OIDC](https://docs.github.com/en/actions/reference/security/oidc) antes de copiar el sujeto de estas capturas. GitHub Enterprise Server tiene particularidades propias.

{% include responsive-image.html src="/images/280623/crear-credencial.webp" alt="Crear credencial" width=1900 height=1860 zoom=true %}

Asigna a la identidad los roles de administración adecuados al alcance del despliegue. El acceso al estado es independiente: si utilizas autenticación de Entra ID en el backend, configura `use_azuread_auth = true` y concede el acceso de datos necesario, como **Storage Blob Data Contributor** sobre el contenedor. Configura la autenticación OIDC del backend según la [referencia azurerm](https://developer.hashicorp.com/terraform/language/backend/azurerm).

## Crear entornos en GitHub

Para crear los dos entornos en **GitHub** vamos en nuestro repositorio a *Settings* > *Environments*.

{% include responsive-image.html src="/images/280623/github-environments-plan-apply.webp" alt="Entornos GitHub" width=2392 height=1032 zoom=true %}

Creamos un nuevo entorno desde *New environment* y le damos un nombre, para este escenario lo he llamado *plan*.

{% include responsive-image.html src="/images/280623/new-environment-github.webp" alt="Nuevo entorno GitHub" width=1916 height=1092 zoom=true %}

> Hay que tener en cuenta que el nombre del entorno de **GitHub** debe coincidir con el nombre del entorno configurado en la identidad federada para que pueda hacer conexión, además en este escenario se espera que los nombres sean *plan* y *apply* porque están configurados en cada job en el código del workflow. Referencia: [plan](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml#L23), [apply](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml#L92).

Configura *Required reviewers* en el entorno *apply* si tu plan y la visibilidad del repositorio lo permiten. Comprueba también las ramas permitidas y la opción que impide la autoaprobación: si está activa, quien inicia el despliegue no puede aprobarlo. Consulta las [protecciones de entornos](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

{% include responsive-image.html src="/images/280623/required-reviewers-environment-apply.webp" alt="Required reviewers environment GitHub" width=1982 height=1148 zoom=true %}


## Configurar clave pública y privada

Para que *terraform init* pueda clonar el repositorio del módulo por **SSH** tenemos que generar un par de claves, la privada estará encriptada como variable en un secreto de **GitHub** y la pública autorizará la lectura del módulo. Para un módulo privado, limita el acceso con una deploy key de solo lectura o una identidad equivalente. Para un módulo público puedes adaptar el origen a HTTPS y retirar los pasos y secretos SSH del workflow.

```
ssh-keygen -t rsa
```


## Agregar secretos en GitHub

En el workflow hay configurado una serie de variables que **GitHub** espera obtener la información del repositorio de secretos, por lo tanto, tenemos que crearlos.

Referencia: [variables en el workflow](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml#L13-L16)

Para crear los secretos, tenemos que ir desde nuestro repositorio a *Settings* > *Secrets and variables* > *Actions* > *New repository secret*.

{% include responsive-image.html src="/images/280623/secrets-github.webp" alt="Secrets GitHub" width=2314 height=1940 zoom=true %}

En la siguiente tabla encontrarás la información que debes agregar en cada secreto:

| Name                   | Secret                                                                                                |
|------------------------|-------------------------------------------------------------------------------------------------------|
| AZURE_CLIENT_ID        | El ID del registro de aplicación creado (cliente)                                                     |
| AZURE_SUBSCRIPTION_ID  | ID de la suscripción a gestionar con Terraform                                                        |
| AZURE_TENANT_ID        | ID del tenant de Azure. Este ID también se puede obtener de la información del registro de aplicación |
| GIT_SSH_COMMAND        | ssh -o StrictHostKeyChecking=yes                                                  |
| SSH_KEY_GITHUB_ACTIONS | Clave privada del par de claves generados anteriormente                                               |

> Al copiar la clave privada debemos tener en cuenta que debe incluir las líneas completas *BEGIN OPENSSH PRIVATE KEY* y *END OPENSSH PRIVATE KEY*. Además debe haber una línea en blanco al final del todo.

En el laboratorio original añadí la clave pública al perfil. Si usas una deploy key, configúrala en el repositorio del módulo con permiso de lectura. Antes de automatizar la conexión, prepara `known_hosts` y verifica las claves del servidor con las [huellas publicadas por GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints). No desactives la comprobación del servidor.

> La clave pública debe tener el formato indicado y una línea en blanco al final.

## Puesta en marcha del workflow

Para poner en marcha el workflow y ejecutar el despliegue en **Azure** tenemos que ir a *Actions* > *Terraform Plan/Apply*:

{% include responsive-image.html src="/images/280623/ejecutar-workflow-github-actions.webp" alt="Ejecutar workflow GitHub Actions" width=2646 height=914 zoom=true %}

Comenzará la ejecución del workflow, ejecutará cada job y sus diferentes etapas siempre que no exista un error en una de ellas. Si accedemos al workflow que está en ejecución podemos ver más detalles del job que se está ejecutando y los que están en espera.

{% include responsive-image.html src="/images/280623/ejecutar-workflow-github-actions02.webp" alt="Ejecutar workflow GitHub Actions" width=2646 height=998 zoom=true %}

Aquí podemos ver ambos jobs *Terraform Plan* y *Terraform Apply*. Las líneas azules de los jobs hacen referencia a las etapas ejecutadas. Para tener más detalles de las etapas que se están ejecutando accedemos al job *Terraform Plan*.

{% include responsive-image.html src="/images/280623/ejecutar-workflow-github-actions03.webp" alt="Ejecutar workflow GitHub Actions" width=2644 height=1202 zoom=true %}

Aquí podemos ver las etapas que están en proceso, completadas o con error. Si desplegamos *Terraform Plan* podemos tener el detalle de los recursos que se van a desplegar en **Azure**.

{% include responsive-image.html src="/images/280623/ejecutar-workflow-github-actions04.webp" alt="Ejecutar workflow GitHub Actions" width=2626 height=1528 zoom=true %}

Aquí podemos ver que se va a desplegar un grupo de recursos con el nombre *rg-test00* con dos etiquetas *test5* y *test6*. El siguiente paso es aprobar o rechazar este despliegue, para ello vamos al job *Terraform Apply* que está pendiente de aprobación.

{% include responsive-image.html src="/images/280623/ejecutar-workflow-github-actions05.webp" alt="Ejecutar workflow GitHub Actions" width=2620 height=1662 zoom=true %}

Para aprobar o rechazar tenemos que hacer clic en *Review pending deployments* y marcamos la acción que queramos llevar a cabo, en este escenario voy aprobar el despliegue.

{% include responsive-image.html src="/images/280623/ejecutar-workflow-github-actions07.webp" alt="Ejecutar workflow GitHub Actions" width=2642 height=1404 zoom=true %}

Una vez finalizadas las etapas podemos ver que los recursos se han desplegado correctamente en **Azure**.

{% include responsive-image.html src="/images/280623/ejecutar-workflow-github-actions08.webp" alt="Ejecutar workflow GitHub Actions" width=2632 height=1602 zoom=true %}

## Verificación final

Antes de un nuevo despliegue, verifica que las acciones utilizadas siguen admitidas y que los jobs `plan` y `apply` usan las mismas versiones y dependencias bloqueadas. Comprueba que el plan guardado se transfiere como artefacto y que `apply` aplica ese archivo después de la aprobación. El plan puede contener datos sensibles: limita el acceso y la retención del artefacto.

Después de aplicar en tu entorno de pruebas, revisa los recursos y ejecuta otro `terraform plan` para comprobar que no quedan cambios inesperados. No imprimas tokens OIDC, claves ni contenido sensible del estado en los registros.

## Conclusión

El laboratorio muestra un flujo de Terraform con autenticación federada en Azure y una aprobación previa al `apply`. Su arquitectura sigue siendo una referencia útil; el workflow original requiere las adaptaciones indicadas antes de reutilizarlo.

Los puntos clave de este escenario:
- **OpenID Connect** elimina la necesidad de gestionar secrets de larga duración en Azure.
- Los entornos de GitHub permiten añadir revisores obligatorios antes de desplegar.
- El backend en Azure Storage centraliza el estado; el versionado y la recuperación requieren configurar expresamente la protección del almacenamiento.

¿Tienes dudas sobre alguno de los pasos o has encontrado algún problema al configurarlo? Déjame un comentario.
