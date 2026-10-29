---
layout: post
permalink: /actualizando-a-una-version-superior-de-windows-server-en-una-maquina-virtual-de-azure-copy
title:  Actualizando a una versión superior de Windows Server en una máquina virtual de Azure
description: Actualiza Windows Server en una máquina virtual de Azure. Prepara el disco de actualización y sigue el proceso del laboratorio a Windows Server 2019.
date:   2023-07-10 11:00:00 +0300
image:  '/images/100723/windows-server-logo.webp'
seo_title: "Actualizar Windows Server en una máquina virtual de Azure"
focus_keyphrase: actualizar Windows Server en Azure
keywords: [actualización de máquina virtual, upgrade de Windows Server, disco de actualización en Azure]
image_alt: Windows Server, sistema del laboratorio de actualización en Azure
image_width: 1740
image_height: 920
tags:   [Azure, Windows Server]
topic: cloud
last_modified_at: 2026-10-29 09:06:00 +0100
editorial_review:
  date: 2026-10-29
  note: "Revisión documental de requisitos, medios de actualización y verificaciones. Se conserva el laboratorio de Windows Server 2016 a 2019 y sus capturas de 2023. No se ha repetido la actualización de una máquina virtual."
  sources:
    - title: "Microsoft Learn: actualización local de Windows Server en Azure"
      url: https://learn.microsoft.com/en-us/azure/virtual-machines/windows-in-place-upgrade
    - title: "Microsoft Learn: opciones de actualización de Windows Server"
      url: https://learn.microsoft.com/en-us/windows-server/get-started/upgrade-overview
---

Si en algún momento te has planteado actualizar la versión de **Windows Server** en una máquina virtual de **Azure**, probablemente hayas optado por levantar una máquina desde cero con la nueva versión y migrar después roles, datos, direcciones IP, DNS, etc.

En **Azure** no es posible asociar una ISO a una unidad DVD/CD-ROM en una máquina virtual, pero existe una alternativa más directa: un disco administrado de actualización. Te la muestro paso a paso.


{% include article-toc.html %}

## Objetivo

Documentar la actualización del servidor de ficheros del laboratorio desde Windows Server 2016 a 2019, manteniendo sus datos y comprobando los servicios después.

> Las capturas son del laboratorio de 2023. Microsoft documenta también destinos posteriores, incluido Windows Server 2025. La ruta depende del origen y del destino: revisa las [opciones vigentes para Azure](https://learn.microsoft.com/en-us/azure/virtual-machines/windows-in-place-upgrade). Este procedimiento no se ha repetido durante la revisión documental.

## Arquitectura y contenido

El escenario sobre el que voy a trabajar tiene la siguiente infraestructura, un grupo de recursos *upgradeWS*, con una red virtual *upgradeWS-vnet (10.1.0.0/24)*, dos máquinas virtuales, una *vmDomainSRV* es un controlador de dominio con **Windows Server 2019 Datacenter** y *vmFileSRV* tiene el rol de servidor de ficheros con **Windows Server 2016 Datacenter**. Actualizaré *vmFileSRV* a **Windows Server 2019 Datacenter**.

![Escenario del laboratorio]({{ '/images/100723/infraestructure-upgrade-windows-server-azure.svg' | relative_url }}){: width="727" height="437" loading="lazy" decoding="async"}

## Requisitos

- Valida la ruta de actualización y las aplicaciones con la herramienta de evaluación que enlaza Microsoft.
- Revisa espacio libre, licencia por volumen/KMS, discos administrados y compatibilidad de idioma; el medio de Azure se ofrece en `en-US`.
- Prepara copias recuperables y snapshots de los discos de sistema y datos, además de una ventana de mantenimiento.
- Si debes pausar protecciones que interfieran con la instalación, planifica cómo restablecerlas después.

El snapshot es una vía de recuperación; no sustituye un plan de restauración comprobado. Antes de elegir una actualización local, revisa también las limitaciones actuales de Azure Update Manager, Hotpatch y las actualizaciones automáticas de invitado descritas por Microsoft.

## Creando el disco de actualización

Para poder iniciar el proceso de actualización, mediante un script de **PowerShell** crearemos un disco de actualización que vendrá preparado con una imagen de **Windows Server** configurada para realizar la actualización del sistema operativo. Este disco de actualización debe estar conectado a la máquina virtual y se puede utilizar para actualizar las máquinas virtuales que sean necesarias, pero, de una en una. Este script también puede ser ejecutado desde **Azure Cloud Shell (PowerShell)**.

| resourceGroup | Nombre del grupo de recursos donde se creará el disco administrado de actualización. Si no existe, se crea el grupo de recursos con nombre.                                                                                                                                |
|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ubicación     | Región de Azure en la que se crea el disco administrado de actualización. Debe ser la misma región que la máquina virtual que se va a actualizar.                                                                                                                          |
| zona          | Zona de Azure en la región seleccionada donde se creará el disco administrado de actualización. Debe estar en la misma zona que la máquina virtual que se va a actualizar. En el caso de las máquinas virtuales regionales (no zonales), el parámetro de zona debe ser "". |
| diskName      | Nombre del disco administrado que contendrá el disco de actualización                                                                                                                                                                                                      |
| sku           | Versión del disco de actualización de Windows Server. En este laboratorio se usa `server2019Upgrade`. Consulta los SKU vigentes para otros destinos en Microsoft Learn.                                                                                                                                                    |


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
$diskName = "WindowsServer2019UpgradeDisk"

# Target version for this Windows Server 2016 to 2019 lab
$sku = "server2019Upgrade"


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

{% include responsive-image.html src="/images/100723/outputs-azure-cloud-shell.webp" alt="Salida Azure Cloud Shell" width=2648 height=1790 zoom=true %}

El disco ha sido creado, como podemos observar con una capacidad de 10GB, suficiente para contener los archivos para la actualización a **Windows Server 2019 Datacenter**:

{% include responsive-image.html src="/images/100723/azure-disk-upgrade-windows-server-2019-datacenter.webp" alt="Disco de datos para la actualización a Windows Server 2019 Datacenter" width=2648 height=920 zoom=true %}

Una vez adjuntado el disco a la máquina virtual podemos ver que contiene una carpeta con la versión de **Windows Server** a la cual vamos actualizar y los archivos para la actualización:

{% include responsive-image.html src="/images/100723/files-upgrade-to-windows-server-2019-datacenter.webp" alt="Archivos para la actualización a Windows Server 2019 Datacenter" width=2250 height=1270 zoom=true %}

## Ejecutando upgrade a Windows Server 2019 Datacenter

Para comenzar el proceso de actualización, abre una consola de **PowerShell** en la máquina que quieres actualizar y sitúate en el directorio donde se encuentran los archivos de actualización. En mi caso es *F:\Windows Server 2019*. Ejecuta el siguiente comando:

```powershell
.\setup.exe /auto upgrade /dynamicupdate disable
```

Se abrirá el asistente de instalación de **Windows Server 2019**. Selecciona la edición a la que quieres actualizar:

{% include responsive-image.html src="/images/100723/windows-server-2019-setup.webp" alt="Asistente de instalación Windows Server 2019" width=1400 height=1110 zoom=true %}

Comenzará el proceso de actualización:

{% include responsive-image.html src="/images/100723/installing-windows-server-2019.webp" alt="Actualizando a Windows Server 2019" width=2196 height=716 zoom=true %}

Durante el proceso de instalación la máquina se reiniciará y se perderá la conexión RDP. Puedes seguir el progreso desde los **diagnósticos de arranque** en el portal de Azure:

{% include responsive-image.html src="/images/100723/bootdiagnostics-windows-server-2019-setup.webp" alt="Diagnósticos de arranque actualización a Windows Server 2019" width=1932 height=1578 zoom=true %}

En la ejecución original, la máquina virtual volvió a estar disponible con Windows Server 2019 y conservó los datos, el rol de ficheros y la unión al dominio. Comprueba estos resultados en tu entorno; completar el asistente no garantiza la compatibilidad de cada aplicación.

{% include responsive-image.html src="/images/100723/findstr.webp" alt="Comprobando el dominio de la máquina virtual" width=1958 height=1026 zoom=true %}

## Verificación final

Comprueba la versión dentro del sistema invitado, no solo en las propiedades de la imagen de Azure:

```powershell
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber
```

Revisa activación, registros de eventos, conectividad de dominio y acceso a los recursos compartidos desde un cliente. Confirma que las aplicaciones funcionan y que las protecciones pausadas están activas. Retira el disco de instalación cuando hayas terminado las comprobaciones y aplica tu política de retención a las copias de recuperación.

## Conclusión

Este laboratorio muestra la actualización de un servidor de ficheros de Windows Server 2016 a 2019. La decisión de actualizar en el sitio o migrar debe considerar la compatibilidad de las aplicaciones, las funciones de administración de Azure que utilices y la recuperación disponible.

¿Has tenido que actualizar Windows Server en Azure? Cuéntame tu experiencia en los comentarios.
