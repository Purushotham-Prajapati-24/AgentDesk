process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { Databases, Account, Users } from "node-appwrite";

// Mock the Appwrite client methods on the prototype before importing tenant-access
const mockGetDocument = mock.fn(async () => {
  return { $id: "tenant_1", $permissions: ['read("user:alice")', 'update("user:alice")'] };
});

const mockAccountGet = mock.fn(async () => {
  return { $id: "alice" };
});

const mockUserGet = mock.fn(async () => {
  return { $id: "alice", prefs: { tenant_id: "legacy_tenant" } };
});

mock.method(Databases.prototype, "getDocument", mockGetDocument);
mock.method(Account.prototype, "get", mockAccountGet);
mock.method(Users.prototype, "get", mockUserGet);

// Import the tenant access assert helpers
const { assertTenantAccess } = await import("../src/lib/server/tenant-access.ts");

test("assertTenantAccess allows read access if user has read permission", async () => {
  mockGetDocument.mock.mockImplementationOnce(async () => {
    return { $id: "tenant_1", $permissions: ['read("user:alice")'] };
  });

  const tenant = await assertTenantAccess("tenant_1", "read");
  assert.equal(tenant.$id, "tenant_1");
});

test("assertTenantAccess denies write access if user only has read permission", async () => {
  mockGetDocument.mock.mockImplementationOnce(async () => {
    return { $id: "tenant_1", $permissions: ['read("user:alice")'] };
  });

  await assert.rejects(
    async () => {
      await assertTenantAccess("tenant_1", "update");
    },
    /You do not have access to this tenant./
  );
});

test("assertTenantAccess allows write access if user has update permission", async () => {
  mockGetDocument.mock.mockImplementationOnce(async () => {
    return { $id: "tenant_1", $permissions: ['update("user:alice")'] };
  });

  const tenant = await assertTenantAccess("tenant_1", "update");
  assert.equal(tenant.$id, "tenant_1");
});

test("assertTenantAccess allows read access for legacy prefs fallback", async () => {
  mockGetDocument.mock.mockImplementationOnce(async () => {
    return { $id: "legacy_tenant", $permissions: [] };
  });

  const tenant = await assertTenantAccess("legacy_tenant", "read");
  assert.equal(tenant.$id, "legacy_tenant");
});

test("assertTenantAccess allows delete access for legacy prefs fallback", async () => {
  mockGetDocument.mock.mockImplementationOnce(async () => {
    return { $id: "legacy_tenant", $permissions: [] };
  });

  const tenant = await assertTenantAccess("legacy_tenant", "delete");
  assert.equal(tenant.$id, "legacy_tenant");
});

test("assertTenantAccess defaults to read permission", async () => {
  mockGetDocument.mock.mockImplementationOnce(async () => {
    return { $id: "tenant_1", $permissions: ['read("user:alice")'] };
  });

  const tenant = await assertTenantAccess("tenant_1");
  assert.equal(tenant.$id, "tenant_1");
});
