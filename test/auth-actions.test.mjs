import assert from "node:assert/strict";
import { test } from "node:test";
import { mapTenantDocument } from "../src/lib/server/auth-tenants.ts";

test("auth tenant mapper preserves role from account prefs", () => {
  const tenant = mapTenantDocument(
    {
      $id: "tenant_1",
      name: "Acme",
      plan: "pro",
      credits: 42,
    },
    "admin",
  );

  assert.deepEqual(tenant, {
    $id: "tenant_1",
    name: "Acme",
    plan: "pro",
    balance: 42,
    role: "admin",
  });
});
