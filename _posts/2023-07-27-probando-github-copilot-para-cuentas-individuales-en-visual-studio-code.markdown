---
layout: post
title:  Probando GitHub Copilot para cuentas individuales en Visual Studio Code
description: Primeras impresiones usando Copilot para cuentas individuales con código de Terraform.
date:   2023-07-27 11:00:00 +0300
image:  '/images/270723/copilot-github.webp'
tags:   [GitHub, Copilot, Terraform]
---

Al final me he decidido y he dado el paso a probar esta herramienta de IA. Últimamente trabajo mucho con **Terraform** y tengo curiosidad de saber cómo funciona y cómo me puede ayudar en mi día a día. GitHub ofrece dos versiones de **Copilot**, una para cuentas individuales y otra para empresas. Para cuentas individuales ofrecen una prueba de 30 días: [https://github.com/features/copilot](https://github.com/features/copilot)

  | Copilot for Individuals | Copilot for Business |
|-------------------------|------------------------|
| Plugs right into your editor | Everything included in Copilot for Individuals, plus... |
| Turns natural language prompts into code | Simple license management |
| Offers multi-line function suggestions | Organization-wide policy management |
| Speeds up test generation | Industry-leading privacy |
| Filters out common vulnerable coding patterns | Corporate proxy support |
| Blocks suggestions matching public code | Copilot Chat beta |

Tengo mi entorno preparado, he instalado la extensión **GitHub Copilot** en VS Code y conectado con [github.com](github.com). He creado un archivo *main.tf*, he comenzado a escribir y ha comenzado la acción. 

Lo primero que he querido configurar es el bloque *terraform* para configurar *required_version*. Tras escribirlo, automáticamente me lo ha sugerido. Las sugerencias las muestra con un tono grisaceo, basta con tabular para aceptarla o seguir escribiendo para que de forma automática estas cambien adaptándose al código que estamos configurando.

![](/images/270723/github-copilot-terraform-00.webp)

Aquí comienza lo bueno, al presionar enter dos veces para comenzar a escribir el siguiente bloque de código ya me está sugiriendo la creación del bloque *provider*. En este caso me lo configura con *aws* pero yo lo edito para que sea *azurerm*.

Vuelvo a repetir, presiono enter dos veces y me sugiere la creación de un grupo de recursos, con el nombre y la localización definidas.

![](/images/270723/github-copilot-terraform-01.webp)

Si observamos no me ha sugerido el bloque *required_providers* ni *backend* dentro del bloque de *terraform*, el cual resuelvo presionando enter dos veces después de *required_version* y automáticamente me sugiere ambos bloques.

![](/images/270723/github-copilot-terraform-02.webp)

Siguiendo aplicando este metodo, **Copilot** me ha sugerido los siguientes recursos que muestro a continuación.

```
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

Esta claro que no tiene porque ser 100% funcional el código que nos está generando porque tendremos que modificar los nombres y aplicar las configuraciones deseadas, pero, nos está ahorrando tener que redactar bastante código. Hasta ahora todo el código que nos ha sugerido **Copilot** no contiene variables.

### ¿Qué ocurre si defino el nombre de los recursos como variables?

Si configuro *name* y *location* del grupo de recursos como variables, el siguiente bloque que me sugiere para la red virtual *name* es una variable pero *address_space* no. 

![](/images/270723/github-copilot-terraform-03.webp)

Entonces voy a tomar la sugerencia como buena, pero voy a editar *address_space* para indicarle que es una variable y voy a ver a continuación si en el bloque que me sugiere de subnet *address_prefixes* lo configura como variable:

![](/images/270723/github-copilot-terraform-04.webp)

Y así es, ¡qué maravilla!

 > Copilot aprende la forma en que vamos escribiendo el código.

Voy a trabajar ahora con el archivo variables.tf y ver si es capaz de declarar todas las variables que son necesarias. El siguiente código es mi fichero *main.tf*.

```
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

![](/images/270723/github-copilot-terraform-05.webp)

Hasta aquí mis primeras pruebas con Copilot, la primera impresión ha sido ¡no quiero dejar de usarlo! ya sea para configurar mis módulos o configurar infraestructura en Azure. Es una herramienta que le da un vuelco a la productividad porque ahorras mucho tiempo 'picando código', pero siempre es necesario saber de la tecnología que vas a usar para adaptar el código a las necesidades del proyecto que vas a ejecutar y corregir posibles errores.