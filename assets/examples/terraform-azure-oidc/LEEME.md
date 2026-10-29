# Ejemplo de Terraform y GitHub Actions con Azure OIDC

Este ejemplo está preparado para GitHub.com y utiliza autenticación federada tanto en el proveedor como en el backend de Azure Storage. No necesita descargar módulos por SSH ni guardar un secreto de cliente de Azure.

1. Crea un repositorio de pruebas con `main.tf` en la raíz y copia `workflow.yml` a `.github/workflows/terraform.yml`.
2. Con Terraform 1.14.6, ejecuta `terraform init -backend=false` y `terraform validate`. Conserva `.terraform.lock.hcl` en el repositorio. Ambos jobs inicializan con `-lockfile=readonly` para respetar esas versiones.
3. Prepara una cuenta de almacenamiento y un contenedor privado para el estado. La identidad federada necesita acceso a los datos del contenedor, por ejemplo `Storage Blob Data Contributor`, y permisos para crear el grupo de recursos del ejemplo. Este último permiso se asigna en la suscripción; limita su alcance y utiliza un entorno de pruebas.
4. Crea los entornos `plan` y `apply` en GitHub. Configura revisores obligatorios y ramas permitidas para `apply` según las funciones disponibles en tu plan.
5. Configura una credencial federada para cada entorno. Verifica el sujeto real de tu repositorio: los formatos con identificadores inmutables introducidos en 2026 pueden diferir del formato de las capturas originales. Para GitHub.com, comprueba el emisor `https://token.actions.githubusercontent.com` y la audiencia `api://AzureADTokenExchange`.
6. Define estas **variables de repositorio**, compartidas por ambos jobs:

   - `AZURE_CLIENT_ID`: identificador de la aplicación.
   - `AZURE_TENANT_ID`: identificador del directorio.
   - `AZURE_SUBSCRIPTION_ID`: suscripción de pruebas.
   - `TF_STATE_ACCOUNT`: cuenta de almacenamiento del backend.
   - `TF_STATE_CONTAINER`: contenedor privado del estado.
   - `TF_STATE_KEY`: nombre único del estado, por ejemplo `demo.tfstate`.

7. Revisa el nombre y la región del grupo de recursos en `main.tf` antes de ejecutar el workflow manualmente. No uses este ejemplo para administrar infraestructura existente sin revisar antes el estado y los permisos.
8. Inspecciona el plan en los registros. Cuando haya cambios, el job `apply` esperará la protección del entorno y aplicará el mismo plan guardado. Si no hay cambios, no se ejecutará.

El plan se conserva un día y puede contener datos sensibles. Controla quién accede al repositorio y sus artefactos. La concurrencia evita ejecuciones simultáneas de este workflow sobre el estado configurado; usa otro grupo si separas entornos en workflows independientes.

La revisión local cubre `terraform fmt -check`, `terraform validate` con el backend desactivado y el análisis del workflow con actionlint. La autenticación, las políticas de aprobación y el despliegue requieren una prueba real en la suscripción de destino.

Fuentes:

- https://developer.hashicorp.com/terraform/language/backend/azurerm
- https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure
- https://docs.github.com/en/actions/reference/security/oidc
