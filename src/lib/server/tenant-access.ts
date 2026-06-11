import { createAdminClient } from "./appwrite";
import { tenantAllowsUser, type TenantDocument } from "./auth-tenants";
import { cache } from "react";

/**
 * Authorizes a user for a tenant. Per-document permissions are preferred, while
 * prefs.tenant_id remains as a legacy fallback until older tenants are migrated.
 */
export const getAuthorizedTenantDocument = cache(async function getAuthorizedTenantDocument(userId: string, tenantId: string) {
  const { databases, users } = await createAdminClient();
  const tenant = (await databases.getDocument(databaseId(), tenantsCollectionId(), tenantId)) as TenantDocument;
  if (!tenantAllowsUser(tenant, userId, "read")) {
    const user = await users.get(userId);
    const prefs = user.prefs as { tenant_id?: unknown };
    if (prefs.tenant_id === tenantId) {
      return tenant;
    }

    throw new Error("You do not have access to this tenant.");
  }

  return tenant;
});

function databaseId() {
  return process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "agentdesk";
}

function tenantsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID || process.env.APPWRITE_TENANTS_COLLECTION_ID || "tenants";
}
