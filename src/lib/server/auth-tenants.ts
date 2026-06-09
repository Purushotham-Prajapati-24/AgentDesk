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

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
