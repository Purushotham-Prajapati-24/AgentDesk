import { createAdminClient } from "./appwrite";
import { tenantAllowsUser, type TenantDocument } from "./auth-tenants";

export async function getAuthorizedTenantDocument(userId: string, tenantId: string) {
  const { databases } = await createAdminClient();
  const tenant = (await databases.getDocument(databaseId(), tenantsCollectionId(), tenantId)) as TenantDocument;
  if (!tenantAllowsUser(tenant, userId, "read")) {
    throw new Error("You do not have access to this tenant.");
  }

  return tenant;
}

function databaseId() {
  return process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "agentdesk";
}

function tenantsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID || process.env.APPWRITE_TENANTS_COLLECTION_ID || "tenants";
}
