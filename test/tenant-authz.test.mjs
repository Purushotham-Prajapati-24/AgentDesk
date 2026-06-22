/**
 * Cross-tenant authorization tests.
 *
 * Bot and webchat server actions use the Appwrite admin client, which bypasses
 * document-level permissions.  The sole defense preventing a user from mutating
 * another tenant's data is assertTenantAccess(tenantId), which delegates to
 * tenantAllowsUser.  These tests pin that core check so a refactor cannot
 * accidentally weaken cross-tenant isolation.
 *
 * We test tenantAllowsUser directly because it is a pure function of
 * (tenant document, userId, action) — the same logic assertTenantAccess runs
 * after resolving the current user.  End-to-end coverage of the full
 * assertTenantAccess chain lives in integration tests that require Appwrite.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

const { tenantAllowsUser, tenantRoleForUser } = await import("../src/lib/server/auth-tenants.ts");

/** Build a tenant document with explicit per-user permissions. */
function tenantWithPermissions(permissions = []) {
  return { $id: "tenant_A", $permissions: permissions, name: "Tenant A" };
}

test("tenantAllowsUser: member with read permission is allowed to read", () => {
  const tenant = tenantWithPermissions(['read("user:alice")']);
  assert.equal(tenantAllowsUser(tenant, "alice", "read"), true);
});

test("tenantAllowsUser: non-member user is denied read access", () => {
  const tenant = tenantWithPermissions(['read("user:alice")']);
  assert.equal(tenantAllowsUser(tenant, "eve", "read"), false);
});

test("tenantAllowsUser: read permission does not grant update", () => {
  const tenant = tenantWithPermissions(['read("user:alice")']);
  assert.equal(tenantAllowsUser(tenant, "alice", "update"), false);
});

test("tenantAllowsUser: update permission does not grant delete", () => {
  const tenant = tenantWithPermissions(['read("user:alice")', 'update("user:alice")']);
  assert.equal(tenantAllowsUser(tenant, "alice", "delete"), false);
});

test("tenantAllowsUser: tenant with role permissions grants correct actions", () => {
  const tenant = tenantWithPermissions([
    'read("user:alice")',
    'update("user:alice")',
    'delete("user:alice")',
  ]);
  assert.equal(tenantAllowsUser(tenant, "alice", "read"), true);
  assert.equal(tenantAllowsUser(tenant, "alice", "update"), true);
  assert.equal(tenantAllowsUser(tenant, "alice", "delete"), true);
});

test("tenantAllowsUser: empty permissions deny everyone", () => {
  const tenant = tenantWithPermissions([]);
  assert.equal(tenantAllowsUser(tenant, "alice", "read"), false);
  assert.equal(tenantAllowsUser(tenant, "alice", "update"), false);
  assert.equal(tenantAllowsUser(tenant, "alice", "delete"), false);
});

test("tenantAllowsUser: missing $permissions array denies everyone", () => {
  const tenant = { $id: "tenant_A" };
  assert.equal(tenantAllowsUser(tenant, "alice", "read"), false);
});

test("cross-tenant isolation: alice cannot act on tenant_B where only bob is a member", () => {
  const tenantA = tenantWithPermissions(['read("user:alice")', 'update("user:alice")', 'delete("user:alice")']);
  const tenantB = tenantWithPermissions(['read("user:bob")', 'update("user:bob")', 'delete("user:bob")']);

  // Alice has full access to tenant A
  assert.equal(tenantAllowsUser(tenantA, "alice", "delete"), true);

  // Alice has NO access to tenant B — this is the cross-tenant isolation invariant
  assert.equal(tenantAllowsUser(tenantB, "alice", "read"), false);
  assert.equal(tenantAllowsUser(tenantB, "alice", "update"), false);
  assert.equal(tenantAllowsUser(tenantB, "alice", "delete"), false);
});

test("tenantRoleForUser: returns admin for users with update/delete, agent otherwise", () => {
  const adminTenant = tenantWithPermissions([
    'read("user:alice")',
    'update("user:alice")',
    'delete("user:alice")',
  ]);
  const agentTenant = tenantWithPermissions(['read("user:bob")']);
  const outsiderTenant = tenantWithPermissions(['read("user:alice")']);

  assert.equal(tenantRoleForUser(adminTenant, "alice"), "admin");
  assert.equal(tenantRoleForUser(agentTenant, "bob"), "agent");
  assert.equal(tenantRoleForUser(outsiderTenant, "eve"), "agent");
});
