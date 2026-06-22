import { createAdminClient, createSessionClient } from "./appwrite";
import { tenantAllowsUser, type TenantDocument } from "./auth-tenants";
export type { TenantDocument };
import { cache } from "react";

/**
 * Authorizes a user for a tenant. Per-document permissions are preferred, while
 * prefs.tenant_id remains as a legacy fallback until older tenants are migrated.
 *
 * Wrapped in React cache() so within a single render pass / server-component
 * tree, repeated calls with the same (userId, tenantId) pair hit Appwrite
 * exactly once.
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

/**
 * Cached account resolver.  Within a single request, getCurrentAccount() fires
 * account.get() at most once even if called by multiple server actions or by
 * getCurrentUser() + getCurrentTenant() together.
 *
 * React cache() dedupes by the function's argument list.  Since this function
 * takes zero arguments, it dedupes all calls within the same render pass
 * regardless of call site — which is correct because the session cookie
 * determines the account and is immutable for the lifetime of a request.
 */
export const getCurrentAccount = cache(async function getCurrentAccount() {
  const { account } = await createSessionClient();
  return account.get();
});

/**
 * Validates the current user's access to a tenant.  Uses the shared
 * getAuthorizedTenantDocument (React-cached) so it dedupes across all action
 * files within the same render pass.
 *
 * This replaces the 4 local copy-pasted definitions in bot-actions.ts,
 * webchat-actions.ts, and credits.ts.
 */
export async function assertTenantAccess(tenantId: string): Promise<TenantDocument> {
  if (!isSafeId(tenantId)) {
    throw new Error("Invalid tenant scope.");
  }

  const user = await getCurrentAccount();
  return getAuthorizedTenantDocument(user.$id, tenantId);
}

function databaseId() {
  return process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "agentdesk";
}

function tenantsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID || process.env.APPWRITE_TENANTS_COLLECTION_ID || "tenants";
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,160}$/.test(value);
}
