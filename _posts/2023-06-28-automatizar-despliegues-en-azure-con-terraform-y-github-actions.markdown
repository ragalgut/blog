---
layout: post
title:  Automatizar despliegues en Azure con Terraform y GitHub Actions
description: En este post voy a mostrar como automatizar el despliegue de infraestructura en Azure con Terraform y un workflow de GitHub Actions.
date:   2023-06-28 11:00:00 +0300
image:  '/images/github-actions-workflow-terraform.webp'
tags:   [Terraform, Azure, GitHub, OpenID]
---

La mejor forma de hacer despliegues con **Terraform** es automatizar todo el proceso que va desde *terraform init* a *terraform apply*, con un proceso previo de aprobación antes de aplicar los cambios y una conexión a **Azure** haciendo uso de identidades federadas para **OpenID** con el objetivo de no almacenar credenciales en **GitHub**.

En este artículo os muestro como automatizar despliegues de infraestructura en **Azure** con **módulos de Terraform** usando un workflow de **GitHub Actions**, descargando los módulos a través de **SSH** y realizando la conexión con identidades federada para **OpenID**.

### Tabla de contenidos
1. [Arquitectura y contenido](#arquitectura-y-contenido)
2. [Configurar backend en Azure](#configurar-backend-en-azure)
3. [Configurar identidades federadas para OpenID](#configurar-identidades-federadas-para-openid)
4. [Configurar clave pública y privada](#configurar-clave-pública-y-privada)
5. [Crear entornos en GitHub](#crear-entornos-en-github)
6. [Agregar secretos en GitHub](#agregar-secretos-en-github)
7. [Puesta en marcha del workflow](#puesta-en-marcha-del-workflow)

## Arquitectura y contenido

![Arquitectura](/images/280623/diagrama.svg)

Los recursos que vamos a crear en **Azure** para poner en marcha este escenario son un grupo de recursos *lab-rg*, una cuenta de almacenamiento *labaztfbackend* y un contenedor privado *tbackend*. En el contenedor *tbackend* es donde va a estar almacenado el archivo de estado *terraform.tfstate* con la infraestructura de **Azure** gestionada por **Terraform**. En **Azure AD** también hay que crear un registro de aplicación *tf-sp-terraform*, configurar dos identidades federadas *plan* y *apply* para **OpenID Connect** y dar permisos de colaborador al registro de aplicación *tf-sp-terraform* sobre la suscripción para que pueda crear, eliminar o administrar los recursos de **Azure**.

Con un workflow de **GitHub Actions** vamos automatizar el despliegue de un grupo de recursos llamado *rg-test00* con las etiquetas *test5* y *test6*.

El siguiente repositorio [az-tf-deployment-oidc](https://github.com/ragalgut/az-tf-deployment-oidc) es la plantilla que vamos a usar para trabajar este escenario. Para usar la plantilla: *Use this template* > *Create a new repository*.

![Usar plantilla de GitHub](/images/280623/usar-template.webp)

En el raiz del repositorio se encuentran los ficheros *main.tf* y *terraform.tfvars* donde está el código de **Terraform** del proyecto que vamos a desplegar, en este caso un grupo de recursos con un [módulo de Terraform](https://github.com/ragalgut/az-tf-module-resource-group).

- [Código archivo main.tf](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/main.tf)
- [Código archivo terraform.tfvars](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/terraform.tfvars)

La ejecución del workflow se realiza desde el apartado *Actions* en **GitHub**.

- [Código del workflow](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml)


## Configurar backend en Azure

Tenemos que crear en **Azure** un backend donde estará alojado el archivo de estado *terraform.tfstate* con la infraestructura de **Azure** gestionada por **Terraform**.

Hay que crear una cuenta de almacenamiento y un contenedor privado. Para este escenario creo una cuenta de almacenamiento llamada *labaztfbackend* y un contenedor *tbackend*.

![Azure Storage Account](/images/280623/cuenta-de-almacenamiento-azure.webp)

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

Para la creación de una identidad federada para **OpenID** hay que crear un registro de aplicación en **Azure AD**. Para este escenario creo uno llamado *tf-sp-terraform* con acceso '*Solo cuentas de este directorio organizativo (solo de Default Directory: inquilino único)*'.

![Azure App Registration](/images/280623/registro-de-aplicacion.webp)

Posteriormente creamos dos identidades federadas del tipo entorno, yo las he llamado *plan* y *apply*. En el workflow hay dos jobs configurados, uno encargado de realizar *Terraform Plan* y otro encargado de realizar *Terraform Apply*, cada uno de estos jobs tienen configurado un entorno en **GitHub**, también llamados *plan* y *apply*, este último configurado con un proceso previo de aprovación para que podamos verificar el plan y poder aprobar o rechazar los cambios. La identidad federada que crearemos en **Azure** será de tipo entorno para que los jobs validen correctamente con **Azure**.

Para crear una identidad federada accedemos al registro de aplicación creado anteriormente > *Certificados y secretos* > *Credenciales federadas* > *Agregar credencial*.

![Credenciales federadas para OpenID](/images/280623/credenciales-federadas-plan-apply-azure-openid.webp)

El escenario que tenemos que seleccionar es *Acciones de GitHub que implementan recursos de Azure*, la *Organización* es nuestro usuario de **github.com**, en el caso de **GitHub Enterprise** es el nombre de la organización, en *Repositorio* el nombre de nuestro repositorio, *Tipo de entidad* seleccionamos *Entorno* y por último indicamos el nombre de la identidad.

El *Identificador de sujeto* y *Api token* que se muestra en la configuración es la que usa **github.com**. Para **GitHub Enterprise** hay que consultar con el administrador cual es el identificador y el api token y configurarlo en la identidad federada en **Azure**. 

> Cuando se ejecuta el workflow y da un fallo en la etapa de conexión con OpenID se puede ver en los logs cual es el identificador y api token que espera encontrar.

![Crear credencial](/images/280623/crear-credencial.webp)

Por último tenemos que **dar permisos de colaborador al registro de aplicación creado, en mi caso *tf-sp-terraform* sobre la suscripción que queremos administrar con Terraform**.

## Crear entornos en GitHub

Para crear los dos entornos en **GitHub** vamos en nuestro repositorio a *Settings* > *Environments*.

![Entornos GitHub](/images/280623/github-environments-plan-apply.webp)

Creamos un nuevo entorno desde *New environment* y le damos un nombre, para este escenario lo he llamado *plan*.

![Nuevo entorno GitHub](/images/280623/new-environment-github.webp)

> Hay que tener en cuenta que el nombre del entorno de **GitHub** debe coincidir con el nombre del entorno configurado en la identidad federada para que pueda hacer conexión, además en este escenario se espera que los nombres sean *plan* y *apply* porque están configurados en cada job en el código del workflow. Referencia: [plan](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml#L23), [apply](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml#L92).

El entorno *apply* debe tener marcada la opción *Required reviewers* y agregar un reviewer para el proceso de aprobación del job *Terraform Apply*, podemos ser nosotros mismos.

![Required reviewers environment GitHub](/images/280623/required-reviewers-environment-apply.webp)


## Configurar clave pública y privada

Para que *terraform init* pueda clonar el repositorio del módulo por **SSH** tenemos que generar un par de claves, la privada estará encriptada como variable en un secreto de **GitHub** y la pública estará unida en nuestro perfil de usuario. Este proceso lo detallo más adelante.

```
ssh-keygen -t rsa
```


## Agregar secretos en GitHub

En el workflow hay configurado una serie de variables que **GitHub** espera obtener la información del repositorio de secretos, por lo tanto, tenemos que crearlos.

Referencia: [varibales en el workflow](https://github.com/ragalgut/az-tf-deployment-oidc/blob/main/.github/workflows/tf-plan-apply.yml#L13-L16)

Para crear los secretos, tenemos que ir desde nuestro repositorio a *Settings* > *Secrets and variables* > *Actions* > *New repository secret*.

![Secrets GitHub](/images/280623/secrets-github.webp)

A continuación en la siguiente tabla proporciono la información que debeís agregar en cada campo:

| Name                   | Secret                                                                                                |
|------------------------|-------------------------------------------------------------------------------------------------------|
| AZURE_CLIENT_ID        | El ID del registro de aplicación creado (cliente)                                                     |
| AZURE_SUBSCRIPTION_ID  | ID de la suscripción a gestionar con Terraform                                                        |
| AZURE_TENANT_ID        | ID del tenant de Azure. Este ID también se puede obtener de la información del registro de aplicación |
| GIT_SSH_COMMAND        | ssh -o StrictHostKeyChecking=no -i $HOME/.ssh/id_rsa                                                  |
| SSH_KEY_GITHUB_ACTIONS | Clave privada del par de claves generados anteriormente                                               |

> Al copiar la clave privada debemos tener en cuenta que debe incluir las líneas completas *BEGIN OPENSSH PRIVATE KEY* y *END OPENSSH PRIVATE KEY*. Además debe haber una línea en blanco al final del todo.

Por último hay que configurar la clave pública en nuestra cuenta de usuario en *Settings* > *SSH and GPG keys* > *New SSH key*.

> La clave pública debe tener el formato indicado y una línea en blanco al final.

## Puesta en marcha del workflow

Para poner en marcha el workflow y ejecutar el despliegue en **Azure** tenemos que ir a *Actions* > *Terraform Plan/Apply*:

![Ejecutar workflow GitHub Actions](/images/280623/ejecutar-workflow-github-actions.webp)

Comenzará la ejecución del workflow, ejecutará cada job y sus diferentes etapas siempre que no exista un error en una de ellas. Si accedemos al workflow que está en ejecución podemos ver más detalles del job que se está ejecutando y los que están en espera.

![Ejecutar workflow GitHub Actions](/images/280623/ejecutar-workflow-github-actions02.webp)

Aquí podemos ver ambos jobs *Terraform Plan* y *Terraform Apply*. Las lineas azules de los jobs hacen referencia a las etapas ejecutadas. Para tener más detalles de las etapas que se están ejecutando accedemos al job *Terraform Plan*.

![Ejecutar workflow GitHub Actions](/images/280623/ejecutar-workflow-github-actions03.webp)

Aquí podemos ver las etapas que están en proceso, completadas o con error. Si desplegamos *Terraform Plan* podemos tener el detalle de los recursos que se van a desplegar en **Azure**.

![Ejecutar workflow GitHub Actions](/images/280623/ejecutar-workflow-github-actions04.webp)

Aquí podemos ver que se va a desplegar un grupo de recursos con el nombre *rg-test00* con dos etiquetas *test5* y *test6*. El siguiente paso es aprobar o rechazar este despliegue, para ello vamos al job *Terraform Apply* que está pendiente de aprobación.

![Ejecutar workflow GitHub Actions](/images/280623/ejecutar-workflow-github-actions05.webp)

Para aprobar o rechazar tenemos que hacer clic en *Review pending deployments* y marcamos la acción que queramos llevar a cabo, en este escenario voy aprobar el despliegue.

![Ejecutar workflow GitHub Actions](/images/280623/ejecutar-workflow-github-actions07.webp)

Una vez finalizadas las etapas podemos ver que los recursos se han desplegado correctamente en **Azure**.

![Ejecutar workflow GitHub Actions](/images/280623/ejecutar-workflow-github-actions08.webp)