terraform {
  required_version = "= 1.14.6"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
  backend "azurerm" {
    use_oidc         = true
    use_azuread_auth = true
  }
}

provider "azurerm" {
  features {}
  resource_provider_registrations = "none"
}

variable "resource_group_name" {
  type    = string
  default = "rg-terraform-demo"
}

variable "location" {
  type    = string
  default = "westeurope"
}

resource "azurerm_resource_group" "demo" {
  name     = var.resource_group_name
  location = var.location
}
