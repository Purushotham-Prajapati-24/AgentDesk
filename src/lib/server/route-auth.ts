import { createSessionClient } from "./appwrite";
import { getAuthorizedTenantDocument } from "./tenant-access";

export async function requireAuthenticatedUser() {
  const { account } = await createSessionClient();
  return account.get();
}

export async function requireAuthenticatedTenant(tenantId: string) {
  const user = await requireAuthenticatedUser();
  await getAuthorizedTenantDocument(user.$id, tenantId);
  return user;
}
