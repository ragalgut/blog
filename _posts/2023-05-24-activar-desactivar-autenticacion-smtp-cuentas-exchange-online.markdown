---
layout: post
title:  Configurar la autenticación SMTP en cuentas de Microsoft 365
description: Se recomienda habilitar la autenticación SMTP solo para las cuentas o buzones que lo requieran ya que es la opción menos segura.
date:   2023-05-24 15:01:35 +0300
image:  '/images/activar-desactivar-smtp.webp'
tags:   [Microsoft 365, Exchange Online]
---

SMTP es un protocolo usado para el envío y recepción de correos presente en aplicaciones, servidores de correos, impresoras multifuncionales, formularios webs, clientes POP3 e IMAP4, etc. El puerto que utiliza es TCP 587.

Las cuentas de Microsoft 365 que disponen de una licencia para Exchange Online permiten habilitar la autenticación SMTP (AUTH SMTP), pero, solo se recomienda hacerlo en cuentas que lo requieran porque por defecto hacen uso de una autenticación más moderna y segura.

> Si tiene habilitado los valores predeterminados de seguridad en el tenant de su empresa, AUTH SMTP está por defecto deshabilitado en todas las cuentas de Microsoft 365.

## Requisitos para activar o desactivar SMTP y conexión a Exchange Online mediante PowerShell

1. Tener habilitada la ejecución de scripts.

   ```
   Set-ExecutionPolicy RemoteSigned
   ```

2. Tener instalado el módulo de PowerShell Exchange Online.

   ```
   Install-Module -Name ExchangeOnlineManagement -RequiredVersion 3.1.0
   ```
3. Cargamos el módulo ejecutando el siguiente comando.

   ```
   Import-Module ExchangeOnlineManagement
   ```
4. Para establecer una conexión como administrador con Exchange Online ejecutamos el siguiente comando, donde admin@contoso.com es la cuenta de administrador.

   ```
   Connect-ExchangeOnline -UserPrincipalName admin@contoso.com
   ```


## Deshabilitar autenticación SMTP globalmente

Para deshabilitar SMTP globalmente en la empresa, ejecutamos el siguiente comando.

```
Set-TransportConfig -SmtpClientAuthenticationDisabled $true
```

Para comprobar que se ha deshabilitado la autenticación SMTP ejecutamos el siguiente comando y comprobamos que el valor de la propiedad SmtpClientAuthenticationDisablede sea True.

```
Get-TransportConfig | Format-List SmtpClientAuthenticationDisabled
```

## Habilitar autenticación SMTP en cuentas específicas

Para comprobar la configuración actual de la cuenta de usuario ejecutamos el siguientes comando, donde usuario@contoso.com introducimos la cuenta de usuario a revisar.

```
Get-CASMailbox -Identity Usuario@contoso.com | Format-List SmtpClientAuthenticationDisabled
```

Si nos carga el usuario con el valor en blanco o $True ejecutamos el siguiente comando para habilitar la autenticación SMTP.


```
Set-CASMailbox -Identity sean@contoso.com -SmtpClientAuthenticationDisabled $false 
```


**Referencia:** [Microsoft Learn](https://docs.microsoft.com/es-es/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission)