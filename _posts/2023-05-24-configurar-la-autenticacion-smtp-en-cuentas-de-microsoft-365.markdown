---
layout: post
title:  Configurar la autenticación SMTP en cuentas de Microsoft 365
description: Configurar SMTP AUTH en Microsoft 365 y Exchange Online con PowerShell. Deshabilita la autenticación global y habilítala solo en las cuentas necesarias.
date:   2023-05-24 15:01:35 +0300
image:  '/images/activar-desactivar-smtp.webp'
seo_title: "SMTP AUTH en Microsoft 365: configuración por cuenta"
focus_keyphrase: autenticación SMTP en Microsoft 365
keywords: [SMTP AUTH, Exchange Online, configurar SMTP con PowerShell]
image_alt: Ilustración de activación y desactivación de SMTP en Microsoft 365
image_width: 1075
image_height: 768
tags:   [Microsoft 365, Exchange Online]
topic: cloud
last_modified_at: 2026-10-29 09:06:00 +0100
editorial_review:
  date: 2026-10-29
  note: "Revisión documental de SMTP AUTH, OAuth y configuración por buzón. Los comandos se han contrastado con Microsoft Learn; no se ha realizado una prueba de envío en un tenant."
  sources:
    - title: "Microsoft Learn: habilitar o deshabilitar SMTP AUTH"
      url: https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission
    - title: "Microsoft Learn: autenticación SMTP con OAuth"
      url: https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth
    - title: "Microsoft Learn: módulo Exchange Online PowerShell"
      url: https://learn.microsoft.com/en-us/powershell/exchange/exchange-online-powershell-v2
    - title: "Exchange Team: calendario de retirada de autenticación básica SMTP AUTH"
      url: https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835
---

**SMTP** permite enviar correo. En Exchange Online, SMTP AUTH suele utilizar el puerto TCP 587 y puede autenticarse mediante OAuth; activar el protocolo no obliga a utilizar usuario y contraseña.

{% include article-toc.html %}

## Objetivo

Mantener SMTP AUTH deshabilitado en la organización y habilitarlo únicamente en el buzón que lo necesite, después de revisar las dependencias existentes.

## Requisitos y conexión a Exchange Online {#requisitos-para-activar-o-desactivar-smtp-y-conexión-a-exchange-online-mediante-powershell}

Necesitas un buzón de Exchange Online, permisos administrativos para modificar su configuración y una aplicación compatible con el método de autenticación elegido. Revisa los requisitos de PowerShell del [módulo ExchangeOnlineManagement](https://learn.microsoft.com/en-us/powershell/exchange/exchange-online-powershell-v2).

> **Antes de empezar:** SMTP AUTH y autenticación básica son conceptos distintos. La aplicación debe configurar OAuth por separado. Los valores predeterminados de seguridad y las políticas de autenticación pueden bloquear el acceso aunque el buzón permita SMTP AUTH. Revisa la política del tenant antes de cambiarla.

Instala el módulo para tu usuario, sin fijar la versión antigua del laboratorio:

```powershell
Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser
Import-Module ExchangeOnlineManagement
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com
```

Sustituye `admin@contoso.com` por tu cuenta autorizada. No es necesario cambiar globalmente la política de ejecución de scripts como paso rutinario.

## Deshabilitar autenticación SMTP globalmente

Consulta primero el estado actual y las aplicaciones que dependen de él. Tras evaluar el impacto, deshabilita el protocolo a nivel de organización:

```powershell
Get-TransportConfig | Format-List SmtpClientAuthenticationDisabled
Set-TransportConfig -SmtpClientAuthenticationDisabled $true
```

## Habilitar autenticación SMTP en cuentas específicas

En este ejemplo el buzón es `usuario@contoso.com`. Consulta su configuración y habilita la excepción:

```powershell
Get-CASMailbox -Identity usuario@contoso.com | Format-List SmtpClientAuthenticationDisabled
Set-CASMailbox -Identity usuario@contoso.com -SmtpClientAuthenticationDisabled $false
```

`$false` permite SMTP AUTH, `$true` lo bloquea y `$null` hace que el buzón herede la configuración de la organización.

Para retirar la excepción y volver a heredar la política global:

```powershell
Set-CASMailbox -Identity usuario@contoso.com -SmtpClientAuthenticationDisabled $null
```

## Verificación final

Comprueba ambos ámbitos después del cambio:

```powershell
Get-TransportConfig | Format-List SmtpClientAuthenticationDisabled
Get-CASMailbox -Identity usuario@contoso.com | Format-List SmtpClientAuthenticationDisabled
```

Para este escenario, el resultado esperado es `True` en la organización y `False` en el buzón autorizado. Esto comprueba la configuración, pero no el envío: haz una prueba desde la aplicación con OAuth y revisa sus registros si falla. La [documentación de OAuth para SMTP](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth) detalla el registro de la aplicación, los permisos y el uso del token.

## Conclusión

Limita la excepción al buzón necesario y documenta qué aplicación la utiliza. Si el cliente solo admite autenticación básica, revisa su migración y el [calendario oficial de retirada](https://techcommunity.microsoft.com/blog/exchange/updated-exchange-online-smtp-auth-basic-authentication-deprecation-timeline/4489835) antes de plantear esta configuración como solución.
