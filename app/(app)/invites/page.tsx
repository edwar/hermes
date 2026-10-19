import { InvitesClient } from "./invites-client"

export default async function InvitesPage() {
  // El acceso lo decide el layout del módulo (requireModule): aquí no se repite la comprobación de rol.
  return <InvitesClient />
}
