---
layout: post
title:  Probando GitHub Copilot para cuentas individuales en Visual Studio Code
description: Primeras pruebas de GitHub Copilot en Visual Studio Code con Terraform. Sugerencias de recursos de Azure, variables y conclusiones de uso.
date:   2023-07-27 11:00:00 +0300
image:  '/images/270723/copilot-github.webp'
seo_title: "GitHub Copilot en VS Code: pruebas con Terraform"
focus_keyphrase: GitHub Copilot con Terraform
keywords: [Copilot en Visual Studio Code, asistente de programación, infraestructura en Azure]
image_alt: GitHub Copilot, asistente de programación probado con Terraform
image_width: 1200
image_height: 630
tags:   [GitHub, Copilot, Terraform]
topic: automatizacion
last_modified_at: 2026-10-29 09:06:00 +0100
editorial_review:
  date: 2026-10-29
  note: "Experiencia personal de julio de 2023. Se ha retirado la comparativa comercial obsoleta y añadido contexto sobre las sugerencias de código. Las capturas y el ejemplo generado se conservan como material histórico; no representan una prueba de la versión actual de Copilot."
  sources:
    - title: "GitHub Docs: planes actuales de Copilot"
      url: https://docs.github.com/en/copilot/get-started/plans
    - title: "HashiCorp: terraform validate"
      url: https://developer.hashicorp.com/terraform/cli/commands/validate
---

Al final me he decidido y he dado el paso a probar esta herramienta de IA. Últimamente trabajo mucho con **Terraform** —una herramienta de infraestructura como código (IaC) que permite definir y desplegar recursos en la nube de forma declarativa— y tengo curiosidad de saber cómo funciona Copilot y cómo me puede ayudar en mi día a día. Esta experiencia corresponde a julio de 2023, cuando probé la modalidad para cuentas individuales.

{% include article-toc.html %}

## Objetivo y contexto

Explorar las sugerencias de GitHub Copilot en Visual Studio Code mientras escribía Terraform para Azure. Para aquella prueba utilicé VS Code, la extensión de Copilot y una cuenta con acceso al servicio.

> Los planes y funciones han cambiado desde 2023. Consulta los [planes actuales de GitHub Copilot](https://docs.github.com/en/copilot/get-started/plans) para decidir qué modalidad necesitas. Las capturas y las impresiones de este artículo describen mi primera prueba.

## Primeros pasos: configurando el bloque terraform

Tengo mi entorno preparado, he instalado la extensión **GitHub Copilot** en VS Code y conectado con [github.com](https://github.com). He creado un archivo *main.tf*, he comenzado a escribir y ha comenzado la acción.

Lo primero que he querido configurar es el bloque *terraform* para configurar *required_version*. Tras escribirlo, automáticamente me lo ha sugerido. Las sugerencias las muestra con un tono grisáceo; basta con tabular para aceptarlas o seguir escribiendo para que de forma automática cambien adaptándose al código que estamos configurando.

{% include responsive-image.html src="/images/270723/github-copilot-terraform-00.webp" alt="GitHub Copilot sugiere required_version en el bloque terraform de VS Code" width=1504 height=692 zoom=true %}

## Sugerencias en cadena

Aquí comienza lo bueno: al presionar Enter dos veces para comenzar a escribir el siguiente bloque de código, ya me está sugiriendo la creación del bloque *provider*. En este caso me lo configura con *aws* pero yo lo edito para que sea *azurerm*.

Vuelvo a repetir, presiono enter dos veces y me sugiere la creación de un grupo de recursos, con el nombre y la localización definidas.

{% include responsive-image.html src="/images/270723/github-copilot-terraform-01.webp" alt="Sugerencia de Copilot para crear un grupo de recursos de Azure con Terraform" width=1474 height=644 zoom=true %}

Si observamos no me ha sugerido el bloque *required_providers* ni *backend* dentro del bloque de *terraform*, el cual resuelvo presionando enter dos veces después de *required_version* y automáticamente me sugiere ambos bloques.

{% include responsive-image.html src="/images/270723/github-copilot-terraform-02.webp" alt="Copilot completa required_providers y el backend de Terraform" width=1888 height=1110 zoom=true %}

Aplicando este método, **Copilot** me sugirió los siguientes recursos. Conservo el código generado en 2023 para mostrar cómo respondía: incluye versiones antiguas y valores que requieren corrección, y no constituye una configuración lista para desplegar.

```hcl
terraform {
    required_version = ">= 0.12"

    required_providers {
        azurerm = {
            source  = "hashicorp/azurerm"
            version = "=2.0.0"
        }
    }

    backend "azurerm" {
        resource_group_name  = "rg-terraform-azure"
        storage_account_name = "terraformazurestorage"
        container_name       = "tfstate"
        key                  = "terraform.tfstate"
    }
}

provider "azurerm" {
    version = "=2.0.0"
    features {}
}

resource "azurerm_resource_group" "rg" {
    name     = "rg-terraform-azure"
    location = "West Europe"
}

resource "azurerm_virtual_network" "vnet" {
    name                = "vnet-terraform-azure"
    address_space       = ["10.0.0.0/16"]
    location            = azurerm_resource_group.rg.location
    resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet" {
    name                 = "subnet-terraform-azure"
    resource_group_name  = azurerm_resource_group.rg.name
    virtual_network_name = azurerm_virtual_network.vnet.name
    address_prefix       = "10.10.1.10/24"
}

resource "azurerm_network_security_group" "nsg" {
    name                = "nsg-terraform-azure"
    location            = azurerm_resource_group.rg.location
    resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_network_security_rule" "nsg_rule" {
    name                        = "nsg-rule-terraform-azure"
    priority                    = 100
    direction                   = "Inbound"
    access                      = "Allow"
    protocol                    = "Tcp"
    source_port_range           = "*"
    destination_port_range      = "80"
    source_address_prefix       = "*"
    destination_address_prefix  = "*"
    resource_group_name         = azurerm_resource_group.rg.name
    network_security_group_name = azurerm_network_security_group.nsg.name
}

resource "azurerm_public_ip" "public_ip" {
    name                = "public-ip-terraform-azure"
    location            = azurerm_resource_group.rg.location
    resource_group_name = azurerm_resource_group.rg.name
    allocation_method   = "Dynamic"
}

resource "azurerm_network_interface" "nic" {
    name                = "nic-terraform-azure"
    location            = azurerm_resource_group.rg.location
    resource_group_name = azurerm_resource_group.rg.name

    ip_configuration {
        name                          = "ipconfig-terraform-azure"
        subnet_id                     = azurerm_subnet.subnet.id
        private_ip_address_allocation = "Dynamic"
        public_ip_address_id          = azurerm_public_ip.public_ip.id
    }
}

resource "azurerm_virtual_machine" "vm" {
    name                  = "vm-terraform-azure"
    location              = azurerm_resource_group.rg.location
    resource_group_name   = azurerm_resource_group.rg.name
    network_interface_ids = [azurerm_network_interface.nic.id]
    vm_size               = "Standard_DS1_v2"

    storage_image_reference {
        publisher = "Canonical"
        offer     = "UbuntuServer"
        sku       = "16.04-LTS"
        version   = "latest"
    }

    storage_os_disk {
        name              = "osdisk-terraform-azure"
        caching           = "ReadWrite"
        create_option     = "FromImage"
        managed_disk_type = "Standard_LRS"
    }

    os_profile {
        computer_name  = "vm-terraform-azure"
        admin_username = "azureuser"
    }

    os_profile_linux_config {
        disable_password_authentication = true
        ssh_keys {
            path     = "/home/azureuser/.ssh/authorized_keys"
            key_data = file("~/.ssh/id_rsa.pub")
        }
    }
}
```

Cada bloque que genera lo hace de manera inteligente, asocia unos recursos con otros, por ejemplo, el grupo de recursos de cada recurso (valga la redundancia) que me está sugiriendo lo está asociando al grupo de recursos que se ha configurado, lo mismo ocurre con la localización, todos van asociado a localización definida en el grupo de recursos, *West Europe*.

Está claro que no tiene por qué ser 100% funcional el código que nos está generando, ya que tendremos que modificar los nombres y aplicar las configuraciones deseadas. Aun así, nos está ahorrando escribir una cantidad considerable de código. Hasta ahora todo el código sugerido por **Copilot** no contiene variables.

## ¿Qué ocurre si defino el nombre de los recursos como variables?

Si configuro *name* y *location* del grupo de recursos como variables, el siguiente bloque que me sugiere para la red virtual *name* es una variable pero *address_space* no. 

{% include responsive-image.html src="/images/270723/github-copilot-terraform-03.webp" alt="Copilot propone una red virtual a partir de variables de nombre y ubicación" width=1960 height=1306 zoom=true %}

Entonces voy a tomar la sugerencia como buena, pero voy a editar *address_space* para indicarle que es una variable y voy a ver a continuación si en el bloque que me sugiere de subnet *address_prefixes* lo configura como variable:

{% include responsive-image.html src="/images/270723/github-copilot-terraform-04.webp" alt="Sugerencia de subnet con address_prefixes definido mediante una variable" width=1904 height=550 zoom=true %}

Y así es, ¡qué maravilla!

 > Copilot adapta sus sugerencias al estilo y convenciones que vas adoptando a lo largo del archivo.

Voy a trabajar ahora con el archivo variables.tf y ver si es capaz de declarar todas las variables que son necesarias. El siguiente código es mi fichero *main.tf*.

```hcl
terraform {
    required_version = ">= 0.12"

    required_providers {
        azurerm = {
            source  = "hashicorp/azurerm"
            version = "=2.0.0"
        }
    }

    backend "azurerm" {
        resource_group_name  = "rg-terraform-azure"
        storage_account_name = "terraformazurestorage"
        container_name       = "tfstate"
        key                  = "terraform.tfstate"
    }
}

provider "azurerm" {
    version = "=2.0.0"
    features {}
}

resource "azurerm_resource_group" "rg" {
    name     = var.name_rg
    location = var.location
}

resource "azurerm_virtual_network" "vnet" {
    name                = var.name_vnet
    address_space       = var.address_space_vnet
    location            = azurerm_resource_group.rg.location
    resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet" {
    name                 = var.name_subnet
    resource_group_name  = azurerm_resource_group.rg.name
    virtual_network_name = azurerm_virtual_network.vnet.name
    address_prefixes     = var.address_prefixes_subnet
}

resource "azurerm_network_security_group" "nsg" {
    name                = var.name_nsg
    location            = azurerm_resource_group.rg.location
    resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_network_security_rule" "nsg_rule" {
    name                        = var.name_nsg_rule
    priority                    = var.priority_nsg_rule
    direction                   = var.direction_nsg_rule
    access                      = var.access_nsg_rule
    protocol                    = var.protocol_nsg_rule
    source_port_range           = var.source_port_range_nsg_rule
    destination_port_range      = var.destination_port_range_nsg_rule
    source_address_prefix       = var.source_address_prefix_nsg_rule
    destination_address_prefix  = var.destination_address_prefix_nsg_rule
    resource_group_name         = azurerm_resource_group.rg.name
    network_security_group_name = azurerm_network_security_group.nsg.name
}
```

En el fichero *variables.tf* comienzo escribiendo *variable* y automáticamente me sugiere la primera variable necesaria que es para *rg_name*, a partir de aquí va surgiendo cada una de las variables necesarias de forma ordenada, tan solo hay que aplicar los nombres y espacios de direcciones necesarios.

{% include responsive-image.html src="/images/270723/github-copilot-terraform-05.webp" alt="Copilot declara las variables de Terraform en el archivo variables.tf" width=1948 height=1580 zoom=true %}

## Cómo comprobar las sugerencias

Antes de aceptar código generado, contrástalo con la documentación del proveedor y revisa las relaciones entre los recursos. En un proyecto de pruebas con sus dependencias inicializadas, ejecuta `terraform fmt -check` y `terraform validate`. Después inspecciona el plan con las variables y permisos del entorno. La validación estática no comprueba por sí sola que el despliegue vaya a funcionar.

## Conclusión

Hasta aquí mis primeras pruebas con GitHub Copilot. La primera impresión ha sido clara: **no quiero dejar de usarlo**.

Es una herramienta que acelera la productividad de forma notable, especialmente para tareas repetitivas como definir recursos de infraestructura en Azure. Aun así, es fundamental conocer la tecnología que se está usando: Copilot sugiere, pero tú revisas, adaptas y corriges.

¿Lo has probado ya? Cuéntame tu experiencia en los comentarios.
