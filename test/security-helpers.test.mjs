import assert from "node:assert/strict";
import { test } from "node:test";

const appOrigin = await import("../src/lib/server/app-origin.ts");
const handoffToken = await import("../src/lib/server/handoff-token.ts");

test("resolveAppOrigin uses configured app origin instead of request headers", () => {
  const origin = appOrigin.resolveAppOrigin(
    new Headers({
      host: "evil.example",
      "x-forwarded-proto": "https",
    }),
    {
      NEXT_PUBLIC_APP_URL: "https://agentdesk.example/app",
      NODE_ENV: "production",
    },
  );

  assert.equal(origin, "https://agentdesk.example");
});

test("resolveAppOrigin rejects unconfigured production origins", () => {
  assert.throws(
    () => appOrigin.resolveAppOrigin(new Headers({ host: "evil.example" }), { NODE_ENV: "production" }),
    /NEXT_PUBLIC_APP_URL/,
  );
});

test("resolveAppOrigin permits local development host fallback", () => {
  const origin = appOrigin.resolveAppOrigin(new Headers({ host: "localhost:3000" }), { NODE_ENV: "development" });
  assert.equal(origin, "http://localhost:3000");
});

test("handoff tokens are scoped to tenant, session, and role", () => {
  process.env.HANDOFF_TOKEN_SECRET = "unit_test_secret";
  const token = handoffToken.createHandoffToken({
    tenant_id: "tenant_1",
    session_id: "session_1",
    role: "agent",
    sub: "user_1",
  });

  assert.equal(handoffToken.verifyHandoffToken(token, { tenant_id: "tenant_1", session_id: "session_1", role: "agent" }), true);
  assert.equal(handoffToken.verifyHandoffToken(token, { tenant_id: "tenant_1", session_id: "session_1", role: "server" }), false);
  assert.equal(handoffToken.verifyHandoffToken(token, { tenant_id: "tenant_2", session_id: "session_1", role: "agent" }), false);
});
