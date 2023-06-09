---
layout: post
title:  Actualizando a una versión superior de Windows Server en una máquina virtual de Azure
description: Te enseño como actualizar a una versión superior de Windows Server sobre una propia máquina virtual de Azure.
date:   2023-07-10 11:00:00 +0300
image:  '/images/100723/windows-server-logo.webp'
tags:   [Azure, Windows Server]
---

Si en algún momento te has plantado actualizar la versión de **Windows Server** en una máquina virtual de **Azure**, probablemente hayas decidido pasar por levantar una máquina de cero con la nueva versión, posteriormente hacer una migración de roles, datos, cambios de IP, DNS, etc.

En **Azure** no es posible asociar una ISO a una unidad DVD/CD-ROM en una máquina virtual pero existe una alternativa que te voy a mostrar a continuación.

### Tabla de contenidos
1. [Arquitectura y contenido](#arquitectura-y-contenido)
2. [Requisitos](#requisitos)
3. [Creando el disco de actualización](#creando-el-disco-de-actualización)
4. [Ejecutando upgrade a Windows Server 2019 Datacenter](#ejecutando-upgrade-a-windows-server-2019-datacenter)

## Arquitectura y contenido

El escenario sobre el que voy a trabajar tiene la siguiente infraestructura, un grupo de recursos *upgradeWS*, con una red virtual *upgradeWS-vnet (10.1.0.0/24)*, dos máquinas virtuales, una *vmDomainSRV* es un controlador de dominio con **Windows Server 2019 Datacenter** y *vmFileSRV* tiene el rol de servidor de ficheros con **Windows Server 2016 Datacenter**. Actualizaré *vmFileSRV* a **Windows Server 2019 Datacenter**.

![Escenario del laboratorio](/images/100723/infraestructure-upgrade-windows-server-azure.svg)

## Requisitos

- Actualmente se admite la actualización a **Windows Server 2016**, **2019** y **2022**.
- La versión mínima funcional para la actualización es **Windows Server 2012**.
- Las versiones no admitidas para una actualización son **Windows Server 2008 R2 Standard** y **Datacenter**.
- El disco del sistema operativo debe tener suficiente espacio libre para la actualizacón, mínimo 32 GB.
- El software antivirus y firewall deben estar deshabilitados porque pueden interferir durante el proceso de actualización y producir errores.
- La máquina virtual debe estar configurada para la licencia por volumen de **Windows Server**.
- El disco de la máquina virtual debe ser administrador, de lo contrario se debe migrar a discos administrados.
- Realizar un snapshot de los discos de la máquina virtual antes de comenzar con el proceso de actualización para, en caso de error, volver al estado anterior de la máquina virtual.
- Seguir la ruta de actualizaciones admitidas:

  | Actualización desde / a | Windows Server 2012 R2 | Windows Server 2016 | Windows Server 2019 | Windows Server 2022 |
|-------------------------|------------------------|---------------------|---------------------|---------------------|
| Windows Server 2012     | Sí                     | Sí                  | -                   | -                   |
| Windows Server 2012 R2  | -                      | Sí                  | Sí                  | -                   |
| Windows Server 2016     | -                      | -                   | Sí                  | Sí                  |
| Windows Server 2019     | -                      | -                   | -                   | Sí                  |

## Creando el disco de actualización

Para poder iniciar el proceso de actualización, mediante un script de **PowerShell** crearemos un disco de actualización que vendrá preparado con una imagen de **Windows Server** configurada para realizar la actualización del sistema operativo. Este disco de actualización debe estar conectado a la máquina virtual y se puede utilizar para actualizar las máquinas virtuales que sean necesarias, pero, de una en una. Este script también puede ser ejecutado desde **Azure Cloud Shell (PowerShell)**.

| resourceGroup | Nombre del grupo de recursos donde se creará el disco administrado de actualización. Si no existe, se crea el grupo de recursos con nombre.                                                                                                                                |
|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ubicación     | Región de Azure en la que se crea el disco administrado de actualización. Debe ser la misma región que la máquina virtual que se va a actualizar.                                                                                                                          |
| zona          | Zona de Azure en la región seleccionada donde se creará el disco administrado de actualización. Debe estar en la misma zona que la máquina virtual que se va a actualizar. En el caso de las máquinas virtuales regionales (no zonales), el parámetro de zona debe ser "". |
| diskName      | Nombre del disco administrado que contendrá el disco de actualización                                                                                                                                                                                                      |
| sku           | Versión del disco de actualización de Windows Server. Debe ser ```server2016Upgrade```, ```server2019Upgrade``` o ```server2022Upgrade```                                                                                                                                                    |


**Script de PowerShell**

```powershell

#
# Customer specific parameters 

# Resource group of the source VM
$resourceGroup = "WindowsServerUpgrades"

# Location of the source VM
$location = "WestUS2"

# Zone of the source VM, if any
$zone = "" 

# Disk name for the that will be created
$diskName = "WindowsServer2022UpgradeDisk"

# Target version for the upgrade - must be either server2022Upgrade or server2019Upgrade
$sku = "server2022Upgrade"


# Common parameters

$publisher = "MicrosoftWindowsServer"
$offer = "WindowsServerUpgrade"
$managedDiskSKU = "Standard_LRS"

#
# Get the latest version of the special (hidden) VM Image from the Azure Marketplace

$versions = Get-AzVMImage -PublisherName $publisher -Location $location -Offer $offer -Skus $sku | sort-object -Descending {[version] $_.Version	}
$latestString = $versions[0].Version


# Get the special (hidden) VM Image from the Azure Marketplace by version - the image is used to create a disk to upgrade to the new version


$image = Get-AzVMImage -Location $location `
                       -PublisherName $publisher `
                       -Offer $offer `
                       -Skus $sku `
                       -Version $latestString

#
# Create Resource Group if it doesn't exist
#

if (-not (Get-AzResourceGroup -Name $resourceGroup -ErrorAction SilentlyContinue)) {
    New-AzResourceGroup -Name $resourceGroup -Location $location    
}

#
# Create Managed Disk from LUN 0
#

if ($zone){
    $diskConfig = New-AzDiskConfig -SkuName $managedDiskSKU `
                                   -CreateOption FromImage `
                                   -Zone $zone `
                                   -Location $location
} else {
    $diskConfig = New-AzDiskConfig -SkuName $managedDiskSKU `
                                   -CreateOption FromImage `
                                   -Location $location
} 

Set-AzDiskImageReference -Disk $diskConfig -Id $image.Id -Lun 0

New-AzDisk -ResourceGroupName $resourceGroup `
           -DiskName $diskName `
           -Disk $diskConfig

```

Tras ejecutar el script la consola de **Cloud Shell** me devuelve la siguiente salida:

![Salida Azure Cloud Shell](/images/100723/outputs-azure-cloud-shell.webp)

El disco ha sido creado, como podemos observar con una capacidad de 10GB, suficiente para contener los archivos para la actualización a **Windows Server 2019 Datacenter**:

![Disco de datos para la actualización a Windows Server 2019 Datacenter](/images/100723/azure-disk-upgrade-windows-server-2019-datacenter.webp)

Una vez adjuntado el disco a la máquina virtual podemos ver que contiene una carpeta con la versión de **Windows Server** a la cual vamos actualizar y los archivos para la actualización:

![Archivos para la actualización a Windows Server 2019 Datacenter](/images/100723/files-upgrade-to-windows-server-2019-datacenter.webp)

## Ejecutando upgrade a Windows Server 2019 Datacenter

Para comenzar el proceso de actualización tenemos que abrir una consola de **PowerShell** en la máquina que queremos ejecutar esta y situanos en el directorio donde se encuentran los archivos para la actualización del sistema operativo, en mi caso es *F:\Windows Server 2019* y ejecutar el siguiente comando:

```powershell
.\setup.exe /auto upgrade /dynamicupdate disable
```

Se abrirá el asistente de instalación de **Windows Server XXXX**, seleccionamos la edición a la que queremos actualizar:

![Asistente de instalación Windows Server 2019](/images/100723/windows-server-2019-setup.webp)

Comenzará el proceso de actualización:

![Actualizando a Windows Server 2019](/images/100723/installing-windows-server-2019.webp)

Si durante el proceso de instalación se reinicia la máquina perderemos la conexión y podremos visualizar el proceso de actualización desde los diagnósticos de arranque en **Azure**:

![Diagnósticos de arranque actualización a Windows Server 2019](/images/100723/bootdiagnostics-windows-server-2019-setup.webp)

Una vez finalizado el proceso de actualización y tengamos disponible nuestra máquina virtual, podremos observar que esta ya se encuentra actualizada con la nueva versión de **Windows Server**, mantiene toda la información y roles, además que seguirá unida al dominio.

![Comprobando el dominio de la máquina virtual](/images/100723/findstr.webp)

Si el proceso de actualización falla y la máquina entra en un estado de inactividad (no arranca), podremos restaurar el snapshot realizado antes del upgrade y repetir el proceso.