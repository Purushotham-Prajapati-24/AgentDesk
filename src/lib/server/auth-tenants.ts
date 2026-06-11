import type { Models } from "node-appwrite";

export type TenantDocument = Models.Document & {
  name?: unknown;
  plan?: unknown;
  credits?: unknown;
  balance?: unknown;
};

export type TenantRole = "admin" | "agent";

export function mapTenantDocument(tenant: TenantDocument, role: TenantRole) {
  return {
    $id: tenant.$id,
    name: stringValue(tenant.name, "Workspace"),
    plan: stringValue(tenant.plan, "free"),
    balance: numberValue(tenant.credits ?? tenant.balance),
    role,
  };
}

export function tenantRoleForUser(tenant: TenantDocument, userId: string): TenantRole {
  return tenantAllowsUser(tenant, userId, "update") || tenantAllowsUser(tenant, userId, "delete") ? "admin" : "agent";
}

export function normalizeTenantRole(value: unknown): TenantRole | null {
  return value === "admin" || value === "agent" ? value : null;
}

export function tenantAllowsUser(tenant: TenantDocument, userId: string, action: "read" | "update" | "delete") {
  return Array.isArray(tenant.$permissions) && tenant.$permissions.includes(`${action}("user:${userId}")`);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
