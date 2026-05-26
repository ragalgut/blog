---
layout: post
title:  Configurar la autenticación SMTP en cuentas de Microsoft 365
description: Te explico cómo habilitar la autenticación SMTP AUTH en cuentas específicas de Microsoft 365, minimizando el riesgo de seguridad.
date:   2023-05-24 15:01:35 +0300
image:  '/images/activar-desactivar-smtp.webp'
tags:   [Microsoft 365, Exchange Online]
---

**SMTP** es un protocolo usado para el envío y recepción de correos presente en aplicaciones, servidores de correo, impresoras multifuncionales, formularios web, clientes **POP3** e **IMAP4**, etc. El puerto que utiliza es **TCP 587**.

Las cuentas de **Microsoft 365** con licencia para **Exchange Online** permiten habilitar la autenticación **SMTP (AUTH SMTP)**, pero solo se recomienda en cuentas que lo requieran, ya que por defecto usan una autenticación más moderna y segura.

## Tabla de contenidos
1. [Requisitos y conexión a Exchange Online](#requisitos-para-activar-o-deshabilitar-smtp-y-conexión-a-exchange-online-mediante-powershell)
2. [Deshabilitar autenticación SMTP globalmente](#deshabilitar-autenticación-smtp-globalmente)
3. [Habilitar autenticación SMTP en cuentas específicas](#habilitar-autenticación-smtp-en-cuentas-específicas)

> Si tienes habilitados los valores predeterminados de seguridad en el tenant de tu empresa, AUTH SMTP está deshabilitado por defecto en todas las cuentas de Microsoft 365.

## Requisitos para activar o desactivar SMTP y conexión a Exchange Online mediante PowerShell

1. Tener habilitada la ejecución de scripts.

   ```
   Set-ExecutionPolicy RemoteSigned
   ```

2. Tener instalado el módulo de **PowerShell Exchange Online**.

   ```
   Install-Module -Name ExchangeOnlineManagement -RequiredVersion 3.1.0
   ```
3. Cargamos el módulo ejecutando el siguiente comando.

   ```
   Import-Module ExchangeOnlineManagement
   ```
4. Para establecer una conexión como administrador con **Exchange Online** ejecutamos el siguiente comando, donde *admin@contoso.com* es la cuenta de administrador.

   ```
   Connect-ExchangeOnline -UserPrincipalName admin@contoso.com
   ```


## Deshabilitar autenticación SMTP globalmente

Para deshabilitar **SMTP** globalmente en la empresa, ejecutamos el siguiente comando.

```
Set-TransportConfig -SmtpClientAuthenticationDisabled $true
```

Para comprobar que se ha deshabilitado la autenticación **SMTP**, ejecutamos el siguiente comando y verificamos que el valor de la propiedad *SmtpClientAuthenticationDisabled* sea *True*.

```
Get-TransportConfig | Format-List SmtpClientAuthenticationDisabled
```

## Habilitar autenticación SMTP en cuentas específicas

Para comprobar la configuración actual de una cuenta de usuario ejecutamos el siguiente comando, donde *usuario@contoso.com* es la cuenta a revisar.

```
Get-CASMailbox -Identity Usuario@contoso.com | Format-List SmtpClientAuthenticationDisabled
```

Si el resultado aparece en blanco o como *$True*, ejecutamos el siguiente comando para habilitar la autenticación **SMTP**.


```
Set-CASMailbox -Identity sean@contoso.com -SmtpClientAuthenticationDisabled $false 
```


**Referencia:** [Microsoft Learn](https://learn.microsoft.com/es-es/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission)

## Conclusión

La autenticación SMTP AUTH en Microsoft 365 es necesaria en ciertos escenarios —impresoras, aplicaciones legacy, formularios web— pero debe activarse de forma quirurgíca, solo en los buzones que la requieran.

Los puntos clave a recordar:
- Deshabilita SMTP globalmente a nivel de tenant como punto de partida.
- Habilita SMTP únicamente en los buzones que lo necesiten con `Set-CASMailbox`.
- Si tu tenant usa valores predeterminados de seguridad, AUTH SMTP ya estará bloqueado por defecto.

¿Tienes alguna duda sobre la configuración en tu entorno? Déjame un comentario.
