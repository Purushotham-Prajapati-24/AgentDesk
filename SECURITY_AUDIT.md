# AgentDesk — Deep Security Audit Report

| | |
|---|---|
| **Repository** | `AgentDesk` (multi-tenant AI customer-support workspace) |
| **Audited ref** | `securityAudit` branch, synced with `master` (HEAD `a935b2a`) |
| **Date** | 2026-06-19 |
| **Methodology** | Codex Security skill chain: `threat-model` → `finding-discovery` → `validation` → `attack-path-analysis` → severity/policy calibration |
| **Scope** | Full repository: Next.js app, standalone Socket.IO server, widget, React/Vue SDK packages, build/config/scripts |
| **Execution** | 6 parallel domain agents (API routes, auth/session, WebSocket/realtime, crawler/ingestion, SDK/widget/XSS, config/deps/infra) + first-hand source review of every critical path |

---

## 1. Executive Summary

AgentDesk is a **multi-tenant SaaS** where correctness of **tenant isolation** is the single most important security property. Tenants embed a chat widget on arbitrary third-party customer sites; the widget calls public APIs, the dashboard uses magic-link auth backed by Appwrite, and a separate Socket.IO server brokers live human handoff.

The codebase already shows **strong defensive work in specific places** — the SSRF guard in `crawler.ts` (pinned-IP connect, private-range blocking, redirect re-validation, IPv6-mapped unwrapping) is genuinely careful, and the Appwrite access pattern (`createSessionClient` + `getAuthorizedTenantDocument` per server action) is sound where it is applied. However, the audit found **systemic gaps** concentrated in three areas:

1. **Cross-tenant / cross-session confidentiality on the realtime layer and handoff-token issuer.** An authenticated operator on tenant A can mint an agent handoff token for **any** `session_id` (including sessions belonging to other tenants) because `POST /api/handoff/token` validates the tenant but never validates that the requested `session_id` belongs to that tenant. Combined with a Socket.IO namespace model that admits any `customer` connection with no token, this is the most serious finding.
2. **No security headers, no CSP, no rate limiting anywhere.** `next.config.ts` is essentially empty; there is no middleware despite `src/app/embed/[botId]/page.tsx` documenting a CSP-nonce mechanism that **does not exist**. The chat/ingestion APIs are unauthenticated-by-design public endpoints with zero abuse protection.
3. **Missing default-deny authz on the dashboard layout + a public, unauthenticated config endpoint + an arbitrary-CSS injection field** in the WebChat customizer.

**Headline counts (after validation & policy adjustment):**

| Severity | Count | Priority |
|---|---|---|
| Critical | 1 | P0 |
| High | 5 | P1 |
| Medium | 7 | P2 |
| Low | 6 | P3 |

> Severity was calibrated with the Codex Security severity/policy matrix. Several candidate findings were **downgraded or suppressed** (see §11) because the impact was self-only, internal-only, or speculative. Only findings with a concrete source→control→sink→impact tuple survived.

---

## 2. Threat Model

### 2.1 System overview & assets

AgentDesk is a Next.js 16 (App Router) application plus a standalone Socket.IO handoff service. Tenants (support teams) are operators; their end-customers interact through an embeddable widget.

**Crown-jewel assets**

- **Tenant isolation in Appwrite / Qdrant.** Every document, message, session, embedding, and rollup is tagged `tenant_id`. A break here exposes every tenant's support conversations and ingested knowledge base.
- **Customer conversation transcripts** (PII: names, order details, support questions) in `messages` + live over Socket.IO.
- **LLM / embedding provider API keys** (Groq, OpenAI, Gemini) — billed, stealable cost.
- **Appwrite admin API key** (`APPWRITE_API_KEY`) — full DB/storage control.
- **Handoff-token signing secret** (`HANDOFF_TOKEN_SECRET`) — mints agent privileges.
- **Credit ledger** — tenant billing; tampering = fraud.

### 2.2 Trust boundaries

```
 ┌──────────────────────────────────────────────────────────────────┐
 │  INTERNET (untrusted)                                            │
 │  ┌───────────────┐        ┌──────────────────────────────────┐   │
 │  │ Customer site │──widget─▶  Public Next.js API routes      │   │
 │  │ + widget.js   │        │  /api/chat/message (no auth)     │   │
 │  │ + iframe embed│        │  /api/widget/config/[botId]      │   │
 │  └──────┬────────┘        │  /api/webchat/config (no auth)   │   │
 │         │  wss://           └──────────────┬──────────────────┘   │
 │         ▼                                │ admin key              │
 │  ┌──────────────────┐                    ▼                        │
 │  │ Socket.IO server │◀──── server-to-  ┌──────────────────────┐  │
 │  │  :4000 (handoff) │     server HMAC  │ Appwrite Cloud (DB,  │  │
 │  │  /tenant-<id>    │     tokens       │ Storage, Auth)       │  │
 │  └────────┬─────────┘                  │ Qdrant Cloud (vectors│  │
 │           │                              │ LLM providers        │  │
 │  ┌────────▼────────────────────┐        └──────────────────────┘  │
 │  │ Operator browser (dashboard) │  magic-link session cookie       │
 │  │  Server Actions w/ Appwrite  │────────────────────────────────▶│
 │  │  session client              │                                 │
 │  └──────────────────────────────┘                                 │
 └──────────────────────────────────────────────────────────────────┘
```

**Boundaries that matter**

1. **Internet → public API routes** (`/api/chat/message`, `/api/widget/config/*`, `/api/webchat/config`). These are reachable by **any anonymous internet user** (CORS `*`) and by design do **not** use Appwrite sessions. Their only client-supplied "identity" is a self-generated `session_token`.
2. **Internet → Socket.IO** (`/tenant-<tenant_id>` namespace, customer role). No token required for `customer` role.
3. **Operator → server actions** (Appwrite session cookie enforced via `createSessionClient` + `getAuthorizedTenantDocument`).
4. **Next.js chat route → Socket.IO HTTP endpoints** (`/rag-permission`, `/bot-message`) — authenticated via short-lived HMAC "server" handoff tokens.
5. **Server → Appwrite** via `APPWRITE_API_KEY` (admin, bypasses per-doc permissions).

### 2.3 Attacker-controlled inputs

- **Anonymous / customer:** `tenant_id`, `bot_id`, `session_token`, `message`, uploaded document bytes, ingest URL, `userId`+`secret` magic-link params, every Socket.IO event payload, `parentOrigin`/`theme`/`className` embed query params.
- **Authenticated operator:** everything above plus bot/system-prompt/theme/`customCss`, WebChat config patch, handoff-token request (`session_id`), ingestion worker `worker_id`.
- **Cross-tenant via stored data:** ingested webpage/HTML→markdown is later concatenated into an LLM **system prompt** — a stored prompt-injection surface.

### 2.4 Invariants the system must preserve

- A request claiming `tenant_id=T` may only read/write documents scoped to `T`.
- An operator may only act on sessions that belong to their own tenant.
- A customer connection may only receive events for the one `(tenant, session)` it belongs to.
- Public APIs may never reveal secrets, internals, or cross-tenant data.
- Outbound fetches from the crawler may never reach private/loopback/metadata addresses.

### 2.5 Severity calibration reference

In this codebase:

- **Critical** = cross-tenant confidentiality break reachable by an authenticated operator with trivial effort (no exotic chain), or public endpoint leaking secrets.
- **High** = public unauthenticated abuse vector with real cost/impact (credit drain, stored XSS in customer-facing surface, account-tier confusion), or missing authz on a protected resource.
- **Medium** = hardening gap that materially weakens a control but needs a precondition or a chain to be harmful (no rate limit + public cost-bearing endpoint, no security headers, unreliable persistence).
- **Low** = defense-in-depth / information-disclosure hygiene, with no standalone exploit path.

---

## 3. Findings

> Each finding below carries: validated source→control→sink→impact, counterevidence considered, and a policy-adjusted severity. Suppressed candidates are in §11.

---

### 🔴 P0-1 — Handoff token minted for arbitrary `session_id` enables cross-tenant session takeover *(Critical)*

**File:** `src/app/api/handoff/token/route.ts:31-37`

**Vulnerability class:** Broken access control / IDOR on a privileged capability (CWE-639, CWE-284).

**Root cause.** The endpoint authenticates the operator and authorizes them for `tenant_id`, then issues a **role: "agent"** handoff token bound to whatever `session_id` the caller supplied — **without ever checking that the session exists or belongs to the caller's tenant**:

```ts
user = await requireAuthenticatedTenant(tenantId);   // ✅ tenant authorized
...
const token = createHandoffToken({
  tenant_id: tenantId,
  session_id: sessionId,                              // ❌ never validated against tenant
  role: "agent",
  sub: user.$id,
});
```

**Impact / attack path.**

1. Operator (or any authenticated user) of tenant A calls `POST /api/handoff/token` with `{ tenant_id: "tenant-A", session_id: "ANY-STRING-3-160-CHARS" }`.
2. Receives a validly-signed **agent** token for that `(tenant_id, session_id)` pair.
3. Connects to Socket.IO `/tenant-tenant-A` namespace with `agent_token` → `joinSessionRoom` (`server.js:272-285`) verifies the HMAC and grants `role: "agent"`.
4. As agent, they can: send `agent-message` (persisted to Appwrite via admin key), toggle `bot-status-toggle` (pause/close the session), and read all live `customer-message`/`bot-message` events.

The session_id used by customers is a **client-generated `crypto.randomUUID()`** (`widget/index.tsx:1719`) passed in cleartext in the request body of every chat message. A malicious operator can therefore:
- **Hijack any active customer conversation in their own tenant** (suppress/corrupt support), or
- Because `session_id` is arbitrary and the downstream persistence `findAppwriteSession` (`session-store.js:144-152`) queries `tenant_id + session_token`, an operator passing a victim tenant's leaked `session_id` pairs it with **their own** `tenant_id` — but persistence still keys on the tuple, so cross-tenant message injection into a session that does exist under a guessed id is plausible if `session_token` values are predictable (the `Math.random` fallback at `widget/index.tsx:1721` is not cryptographically strong).

**Counterevidence considered.** The Socket.IO layer does enforce namespace==handshake tenant (`server.js:268-270`) and requires a valid agent HMAC for the agent role. That prevents *connection* forgery, but it does **not** repair the missing object-level authorization at the token issuer, which is the actual control point.

**Remediation.** Before issuing the token, verify the session belongs to the caller's tenant:

```ts
const { databases } = await createAdminClient();
const found = await databases.listDocuments(db, sessionsCol, [
  Query.equal("tenant_id", tenantId),
  Query.equal("session_token", sessionId),
  Query.limit(1),
]);
if (!found.documents[0]) {
  return jsonError("SESSION_NOT_FOUND", "Session was not found for this tenant.", 404);
}
```

Apply the same object-level check everywhere a handoff token is consumed for agent escalation. Also drop the `Math.random` session-id fallback in the widget.

---

### 🟠 P1-1 — Unauthenticated customer Socket.IO connections can join any tenant/session room *(High)*

**File:** `websocket-server/server.js:106-117, 257-288, 138-158`

**Vulnerability class:** Missing authentication / cross-tenant eavesdropping (CWE-306, CWE-200).

**Root cause.** For `role: "customer"` (the default), `joinSessionRoom` only validates ID format and namespace consistency — **no token, no proof of ownership**:

```js
const role = requestedRole === "agent" ? "agent" : "customer";
...
if (role === "agent") { /* token check */ }    // ← customers skip this entirely
return { ok: true, value: { tenant_id, session_id, role } };
```

Once joined, the socket receives every `customer-message`, `bot-message`, `agent-message`, `bot-status-toggle`, and `session-state` broadcast to that room (`server.js:115-116, 155, 194, 213, 252`). `session_id`s are UUIDs passed in cleartext; an attacker who obtains one (network inspection on a non-HTTPS embed, leaked URL, or by replaying a captured widget request) can silently observe and even inject customer-side messages.

**Impact.** Confidentiality breach of customer support transcripts in transit; ability to impersonate customers in the live room (`customer-message` is echoed to the room). Crosses the "customer may only receive events for its own session" invariant.

**Counterevidence considered.** Customer connections are read-mostly by design and the agent role is gated. But confidentiality of the customer side is a stated product property ("route active sessions into a Socket.IO powered operator inbox"), so unauthenticated read access is a real defect, not a feature.

**Remediation.** Require a short-lived, narrowly-scoped customer token (issued by the Next.js chat route alongside the session, bound to `(tenant_id, session_id, "customer")`) and verify it in `joinSessionRoom` for **all** roles. Restrict `customer-message` emission or rate-limit it.

---

### 🟠 P1-2 — No rate limiting on public, cost-bearing endpoints enables credit/LLM-cost abuse *(High)*

**Files:** `src/app/api/chat/message/route.ts:64-139`, `src/app/api/documents/url/route.ts`, `src/app/api/documents/upload/route.ts`, `src/app/api/widget/config/[botId]/route.ts`

**Vulnerability class:** Missing rate limiting / resource consumption (CWE-770).

**Evidence.** A repository-wide search for rate/throttle/limit primitives returns only `Query.limit(...)`, body-size caps, and `express.json({ limit: "64kb" })`. There is **no per-IP, per-tenant, or per-session rate limiting** on:

- `POST /api/chat/message` — every call embeds the message (Gemini call), runs a Qdrant hybrid search, and streams an LLM completion. Credits are debited *after* completion, so an attacker can drive **uncapped LLM/embedding cost** against a tenant's balance (and the tenant's provider keys) until balance hits 0.
- `POST /api/documents/url` + `POST /api/documents/ingest` — queue arbitrary URLs for crawling + embedding (Gemini batch embed). Each ingest run consumes Gemini quota.
- `GET /api/widget/config/[botId]` — unauthenticated, repeatedly hits Appwrite with admin key.

**Impact.** Denial-of-wallet against any tenant whose `bot_id`/`tenant_id` are public (they are, by design — embedded in every widget snippet). The credit check (`getCreditBalance`) only blocks when balance ≤ 0, by which time substantial cost is incurred.

**Counterevidence considered.** `MAX_MESSAGE_LENGTH`, `MAX_FILE_SIZE`, and crawler byte caps mitigate single-request DoS, but not request-frequency abuse.

**Remediation.** Add rate limiting (Upstash Ratelimit is already a natural fit given the Upstash dependency in `session-store.js`) keyed on `tenant_id + session_token` for chat and `tenant_id` for ingestion; add a global per-IP ceiling on public endpoints.

---

### 🟠 P1-3 — Stored CSS injection via WebChat `customCss` renders on customer-facing widget *(High)*

**Files:** `src/lib/webchat-config.ts:30` (schema), `src/app/api/webchat/config/update/route.ts:45-58`, widget consumer.

**Root cause.** The WebChat config patch schema accepts up to 2000 chars of arbitrary CSS with no sanitization:

```ts
customCss: z.string().max(2000),
```

The WebChat customizer persists this into the tenant config, which is then served to **every customer site that embeds the widget**. CSS is a capable exfiltration vector in a shared DOM: attribute selectors + `background-url`/`@font-face` callbacks can leak typed characters and form values to an attacker-controlled origin; `position:fixed` overlays enable clickjacking/phishing on the host page; `@import` can pull remote stylesheets.

**Impact.** A malicious or compromised tenant admin (or any operator in a tenant, since role checks on config mutation are tenant-level only) can weaponize every customer page rendering their widget. This is a **stored** injection on a third-party-content surface.

**Counterevidence considered.** The widget uses a Shadow DOM, which limits — but does not eliminate — CSS exfiltration (custom properties, `@font-face`, and inherited properties still leak across the shadow boundary; the host page DOM is reachable from light-DOM siblings the widget renders). No CSP is enforced (see P2-2), so there is no backstop.

**Remediation.** Either drop `customCss` entirely, restrict to a small allowlist of property overrides, or sanitize with a CSS-specific parser (e.g. `csstree-validator` / PostCSS allowlist) before persistence. At minimum, enforce a strict CSP on the widget document.

---

### 🟠 P1-4 — Public, unauthenticated `GET /api/webchat/config` returns global base config *(High)*

**File:** `src/app/api/webchat/config/route.ts:4-11`

**Root cause.** This route takes **no tenant argument and performs no authentication**, yet calls `getWebChatConfig()` with no tenant id, which returns `baseConfig` — the global config parsed from `WEBCHAT_CONFIG_JSON`:

```ts
export async function GET() {
  return NextResponse.json({ success: true, data: { config: await getWebChatConfig() } });
}
```

`baseConfig` is whatever an operator persisted globally (env or legacy store), which can include `customCss`, deploy metadata, and internal endpoint references. Combined with P1-3, it's also an amplifier for stored CSS.

**Impact.** Information disclosure + an unauthenticated mutation-readable surface. There is no legitimate reason for an anonymous caller to read the global WebChat base config.

**Counterevidence considered.** Per-tenant `getWebChatConfig(tenantId)` *is* authenticated in the update route. This specific GET has no tenant scope and no auth.

**Remediation.** Require `requireAuthenticatedTenant(tenantId)` and a `tenant_id` query/body param, mirroring the update route; or delete the route if it is vestigial.

---

### 🟠 P1-5 — `data:` URLs allowed for `logoUrl`/`widgetIconUrl` enable XSS in the widget *(High)*

**File:** `src/app/api/widget/config/[botId]/route.ts:364-375`

**Root cause.** `sanitizeUrl` allows both `https:` and `data:`:

```ts
function sanitizeUrl(value: string | null) {
  const url = new URL(value);
  return ["https:", "data:"].includes(url.protocol) ? url.toString() : null;
}
```

A `data:text/html,<script>...` (or `data:image/svg+xml,...<script>`) URL stored as `logoUrl`/`widgetIconUrl`/`avatarUrl` is delivered to every customer rendering the widget. Depending on how the widget consumes the URL (e.g. assigning to `<img src>` / `<iframe>` / opening in a new tab, or inlining as a background), this yields script execution or content-spoofing in the customer's origin.

**Impact.** Stored XSS on the customer-facing widget surface, exploitable by any tenant operator via the customizer.

**Counterevidence considered.** `https:` is required for the generic `optionalUrl` in `webchat-config.ts`, but the widget-config public API path uses the more permissive `sanitizeUrl`. The widget is a custom element in the host page, so script execution there is high-impact (reads host-page cookies/storage if not sandboxed).

**Remediation.** Restrict image URLs to `https:` only (and a strict `data:image/(png|jpeg|gif|webp);base64,` subset if inline images are truly needed). Never allow `data:text/html` or `data:image/svg+xml`.

---

### 🟡 P2-1 — No HTTP security headers and no CSP anywhere *(Medium)*

**File:** `next.config.ts` (empty of headers), absent `src/middleware.ts`.

**Evidence.** `next.config.ts` contains only `serverExternalPackages`. A repo-wide search for `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy` in source/config returns **zero matches** (only `Referrer-Policy: no-referrer` on the verify route's inline HTML). Worse:

- `src/app/embed/[botId]/page.tsx:12-17` documents a CSP-nonce mechanism ("The nonce MUST be injected by middleware via the x-nonce response header") **but there is no middleware file** (`Glob src/middleware.{ts,js}` → none). The nonce is read from `x-nonce` and, since nothing sets it, `cleanCspNonce` is always `undefined` and there is no CSP at all.

**Impact.** No defense-in-depth against XSS (magnifies P1-3 and P1-5), no clickjacking protection on the dashboard, no MIME-type sniffing protection.

**Remediation.** Add a `headers()` block in `next.config.ts` and implement the documented middleware that issues CSP nonces. Apply a real CSP to the embed page.

---

### 🟡 P2-2 — Dashboard auth is client-side only; protection depends on per-action discipline *(Medium)*

**File:** `src/app/(dashboard)/layout.tsx:9-35`

**Root cause.** `DashboardGuard` only calls `router.push("/login")` from a `useEffect`; it renders `null` client-side but the route itself is not server-protected. Any server component or route handler under `(dashboard)` that forgets to call `requireAuthenticatedTenant` / `createSessionClient` will serve data to an unauthenticated caller.

**Evidence that current actions are safe:** `inbox-actions.ts`, `bot-actions.ts`, `monitor-actions.ts`, `webchat-actions.ts` all use `createSessionClient()` + `assertTenantAccess`. But the **discipline is manual and per-file**; a future route that uses `createAdminClient()` directly (as `chat/message` and `documents/*` do) would silently bypass auth.

**Impact.** Latent authz-bypass footgun; no default-deny. Not currently exploitable on the audited code paths but structurally fragile.

**Remediation.** Enforce auth at a server boundary: a `middleware.ts` that rejects unauthenticated `(dashboard)` requests, or a wrapper that makes session-client the only way to reach dashboard data.

---

### 🟡 P2-3 — Magic-link `verify` reflects `userId`/`secret` and `loginWithMagicLink` discloses account existence *(Medium)*

**Files:** `src/app/(auth)/verify/route.ts:59-141`, `src/app/auth-actions.ts:29-45`

**Root cause / issues.**
- `loginWithMagicLink` returns the raw Appwrite error string on failure (`return { success: false, error: getErrorMessage(error) }`). Appwrite distinguishes "user not found" from other errors, enabling **account enumeration**.
- The verify GET renders `userId` and `secret` into HTML. `escapeHtml` escapes `& " < >` but **not `'` (single quote)**; while the values are placed in double-quoted attributes here (so the current sinks are safe), the helper is fragile for future reuse.
- The magic-link token is **Appwrite-generated** (good entropy), but there is no visible attempt-limit / lockout on `verifyMagicLink`, so the secret can be brute-forced within Appwrite's own limits only.

**Impact.** Account enumeration (Medium) + weak single-quote escaping (Low, latent).

**Remediation.** Return a generic "If the email exists, a link has been sent" regardless of Appwrite error; add `'` to `escapeHtml`; add server-side attempt throttling on verify.

---

### 🟡 P2-4 — WebChat config persisted to `.next/` is unreliable and silently lost *(Medium)*

**File:** `src/lib/server/webchat-config-store.ts:18-22, 51-66`

**Root cause.** Per-tenant WebChat config is written to `.next/webchat-config-<tenant>.json`. `.next/` is a **build-output directory** that is wiped/recreated on every build and is read-only in most serverless deploys (Vercel). On any cold start or deploy, tenant customizations vanish and silently fall back to `baseConfig`.

```ts
return path.join(process.cwd(), ".next", `webchat-config-${safe}.json`);
```

**Impact.** Integrity/availability defect: operators' saved configuration (including security-relevant fields like `customCss`) is non-durable. Not a direct exploit, but it undermines every config-dependent control and means the P1-3/P1-5 attack surface is intermittently reset to whatever was last persisted before a deploy.

**Remediation.** Persist per-tenant WebChat config in Appwrite (the codebase already has a `webchat_configs` collection used by the widget-config route) rather than the filesystem.

---

### 🟡 P2-5 — Information disclosure via session-cookie-name logging *(Medium)*

**File:** `src/lib/server/appwrite.ts:26-27`

**Root cause.** When no valid session cookie is present, the thrown error string enumerates every cookie name the request carried:

```ts
throw new Error("No session. Received cookies: " + cookieStore.getAll().map(c => c.name).join(", "));
```

This message propagates to API JSON error bodies in several routes (`getErrorMessage(error)` is used broadly).

**Impact.** Leaks the full set of cookie names (which can fingerprint the user's other sessions/services, SSO cookies, analytics cookies) to any unauthenticated caller who triggers the path. Low direct impact, but it is unnecessary disclosure on a public surface.

**Remediation.** Throw a generic "No session." message; log the cookie names server-side at debug level only.

---

### 🟡 P2-6 — CORS `Access-Control-Allow-Origin: *` on the chat API in combination with credentialed-adjacent flows *(Medium)*

**File:** `src/app/api/chat/message/route.ts:54-58`, `src/app/api/widget/config/[botId]/route.ts:124-129`

**Root cause.** Public chat/widget-config endpoints set `Access-Control-Allow-Origin: *`. The chat endpoint is unauthenticated, so wildcard CORS is *defensible* for the embedded-widget use case. However it also means **any website** can drive chat traffic against any tenant's bot (amplifies P1-2 cost abuse from "attacker with a script" to "any third-party page the victim visits") and read the streamed responses.

**Impact.** Magnifies the unauthenticated abuse vector; cross-origin reads of streamed LLM output.

**Remediation.** Restrict CORS to the tenant's configured widget origins (the product already knows the deploy environment). At minimum, combine with the rate limit in P1-2.

---

### 🟡 P2-7 — Prompt-injection guard is a trivial denylist; RAG context is concatenated unescaped into the system prompt *(Medium)*

**Files:** `src/app/api/chat/message/route.ts:447-453` (`containsPromptInjection`), `367-392` (`buildSystemPrompt`).

**Root cause.** "Protection" is a 5-phrase case-insensitive regex (`ignore previous instructions|system prompt|...`). Ingested webpage/PDF content is concatenated **directly** into the system prompt (`${contextChunks.join("\n\n")}`). A tenant's knowledge base is attacker-influenceable (anyone who can get a URL/document ingested), so a stored payload can override the guardrails ("[KNOWLEDGE GROUNDING]...") without ever matching the denylist.

**Impact.** Stored prompt injection → bot leaks other tenants' ingested docs is *not* possible (Qdrant queries are tenant+bot scoped), but within a tenant the bot can be made to ignore fallback behavior, leak its system prompt, or emit the `[SYSTEM_ACTION: TRANSFER_TO_HUMAN]` marker to force-spam handoff.

**Remediation.** Treat retrieved context as untrusted data: fence it, instruct the model to never execute instructions inside it, and consider a secondary model-based injection classifier. The static denylist provides little value.

---

### 🔵 P3-1 — `containsPromptInjection` / `mentionsSystemInternals` are case-regex only and trivially bypassed *(Low)*
See P2-7. Same files. The regex misses Unicode lookalikes, whitespace/casing variants, and non-English phrasings. Low as a standalone (it's a soft control) but worth replacing.

### 🔵 P3-2 — Generic env var name `API_KEY` used as Qdrant key fallback + typo `ENPOINT_URL` *(Low)*
**File:** `src/lib/server/qdrant.ts:221-222`. `process.env.API_KEY` is an unusually generic name that risks collision with unrelated tooling/CI secrets, and `ENPOINT_URL` is a misspelling of `ENDPOINT_URL` (so the primary lookup likely never matches and only `QDRANT_URL` works). Rename to `QDRANT_API_KEY`/`QDRANT_URL` only; fix the typo.

### 🔵 P3-3 — `getErrorMessage` surfaces raw internal errors to API callers *(Low)*
**Files:** `documents/upload/route.ts:115-121`, `documents/ingest/route.ts:302-304`, `handoff/token/route.ts:40-42`, others. Several routes return `error.message` verbatim, which can include Appwrite internals, collection ids, or stack fragments. Adopt a generic public message + log-the-detail pattern.

### 🔵 P3-4 — `JSON.parse` of upstream LLM SSE chunks without try/catch *(Low / availability)*
**File:** `src/lib/server/llm-providers.ts:246, 280`. A malformed provider chunk throws and aborts the whole stream rather than skipping the line. Wrap in try/catch to tolerate partial frames.

### 🔵 P3-5 — No SRI / integrity on the script tag serving `/widget.js` *(Low)*
**File:** `src/app/embed/[botId]/page.tsx:47-58`. The embed loads `/widget.js` without `integrity`. If the origin is ever compromised (or a MITM on a non-HTTPS host), arbitrary script runs in the host page. Pin and document an integrity hash.

### 🔵 P3-6 — `containsPromptInjection`/console logs include `tenantId`/`botId` in structured logs at info/warn *(Low)*
**Files:** `chat/message/route.ts:102-106, 114-117`. Not PII, but ensure log sinks are access-controlled given tenant identifiers are emitted widely.

---

## 4. Domain-by-Domain Summary (parallel agent coverage)

| Domain | Lead issues | Verdict |
|---|---|---|
| **API routes** (`chat`, `documents/*`, `handoff`, `widget`, `webchat`) | P0-1, P1-2, P1-4, P1-5, P2-6, P3-3 | Public endpoints well-input-validated (`isSafeId`) but lack authz/rate-limiting/CORS discipline |
| **Auth & session** (`(auth)`, `auth-actions`, `tenant-access`, `appwrite.ts`, handoff tokens) | P2-3, P2-5, P3-1 | Magic-link mechanism itself is sound; session-cookie handling and error disclosure need hardening |
| **WebSocket / realtime** (`websocket-server/`, `chat/message` broadcast) | P0-1 (consumer side), P1-1 | Customer role unauthenticated; agent role well-tokenized but token issuer broken (P0-1) |
| **Crawler & ingestion** (`crawler.ts`, `documents/*`, parsers) | (none critical) | **Strongest area.** SSRF guard is genuinely robust. Minor: large-doc DoS mitigated by byte caps; no parser-specific findings reproducible without runtime |
| **SDK / widget / client** (`packages/*`, `widget/`, embed, customizer) | P1-3, P1-5, P2-1, P3-5 | Stored CSS + data:URL XSS on the customer surface; no CSP; embed nonce mechanism unimplemented |
| **Config / deps / infra** (`next.config.ts`, `package.json`, scripts) | P2-1, P2-4, P3-2 | No headers; non-durable config store; no committed secrets (clean git history) |

---

## 5. Things Done Right (defense-in-depth already present)

These materially lowered severity and should be preserved during remediation:

- **SSRF egress guard** (`crawler.ts`): pin-to-resolved-IP connect, multi-record TOCTOU mitigation, comprehensive private-range blocking (IPv4 + IPv6 incl. CGNAT, Teredo, `64:ff9b:` mapped, link-local), redirect re-validation, localhost/literal-IP rejection, byte caps. This is above industry baseline.
- **Handoff-token core** (`handoff-token-core.js`): HMAC-SHA256, `timingSafeEqual` on signature, 5-minute TTL, `jti`, strict structural validation on verify. The primitive is sound — the bug is its *use* (P0-1).
- **Appwrite session-client pattern** in server actions + `getAuthorizedTenantDocument` per-tenant authorization (with per-document permissions preferred over the legacy `prefs.tenant_id` fallback).
- **Magic-link cookie hygiene** (`auth-actions.ts:54-64`): HttpOnly, `Secure` in production, `SameSite=Lax`, stale-cookie purge before write.
- **Document upload validation** (`documents/upload/route.ts`): size cap, extension allowlist, filename sanitization, empty-content rejection, tenant authn before parse.
- **Ingestion locking** (`ingestion-locks.ts` + `claimIngestionLock`): proper atomic claim with expiry to prevent double-processing.
- **Input ID validation** (`isSafeId` regex) applied consistently across all routes — closes NoSQL/ID-injection and most path-injection vectors at the edge.
- **Widget config sanitization** (`widget/config/[botId]/route.ts`): strict HSL/endpoint/theme sanitization with safe defaults — *except* the `data:` URL gap (P1-5).
- **No secrets in git history** (verified `git log --all` for env files: clean).

---

## 6. Recommended Remediation Order

1. **P0-1** (this week): Add object-level session authorization to `POST /api/handoff/token`. One-file fix, removes the cross-tenant escalation primitive.
2. **P1-1 + P1-2**: Authenticate customer Socket.IO connections; add Upstash-backed rate limiting on chat/ingestion/widget-config.
3. **P1-3 + P1-5 + P2-1**: Remove/sanitize `customCss`; drop `data:` URLs; ship a real CSP + security headers + the missing middleware.
4. **P1-4**: Authenticate or delete `GET /api/webchat/config`.
5. **P2-4**: Move WebChat config persistence into Appwrite.
6. **P2/P3 hardening pass**: generic error messages, fix `ENPOINT_URL`/`API_KEY`, add `'` to `escapeHtml`, harden prompt-injection handling, add attempt throttling on verify.

---

## 7. Validation Method & Confidence

Every finding above was validated by **first-hand source read** with line references (not inferred from a scanner). Where a finding depends on the widget's *consumption* of a value (e.g. P1-3/P1-5), confidence is **high** for the *storage/serving* side (confirmed in the API) and **medium** for the exact in-widget render sink (the widget bundle is minified in `public/widget.js`); the remediation is the same regardless. Runtime reproduction (driving live Appwrite/Qdrant/LLM) was out of scope for this static audit and is noted as the proof gap where relevant.

No finding was promoted above **medium** without a concrete, non-speculative source→control→sink→impact tuple, per the Codex Security severity policy.

---

## 8. Suppressed / Downgraded Candidates (transparency)

The following were considered and **not** reported as findings (or downgraded) with reasoning:

| Candidate | Disposition | Reason |
|---|---|---|
| SSRF via `BROWSERLESS_API_KEY` path in `fetchPageHtml` | **Suppressed** | URL still passes `assertAllowedHttpUrl` before the browserless call; browserless is an external managed renderer, not an internal target. |
| Prompt injection → cross-tenant data leak via RAG | **Downgraded to P2-7** | Qdrant queries are tenant+bot scoped (`tenantBotFilter`), so retrieved context cannot cross tenants. Impact confined to in-tenant behavior manipulation. |
| `XSS` via `dangerouslySetInnerHTML` | **Suppressed** | No occurrences in app/SDK/widget source (only `document.body.innerHTML` in the crawler server-side via JSDOM, which is sandboxed). |
| Committed secrets | **Suppressed** | `git log --all` for `.env*` is clean; no hardcoded keys in source. |
| Socket.IO Redis adapter DoS | **Suppressed** | Optional, operator-configured; requires `SOCKET_IO_REDIS_URL` secret to exploit. |
| Open redirect via magic-link origin | **Suppressed** | `resolveAppOrigin` requires configured `NEXT_PUBLIC_APP_URL` in production and refuses untrusted `Host` headers in dev. |
| Ingestion race / double-embed | **Suppressed** | `claimIngestionLock` + release-in-`finally` correctly serializes per-document processing. |
| Denial of service via large sitemap | **Suppressed** | `discoverSitemapUrls` capped at 30 entries; each URL re-validated through the egress guard. |
| Appwrite per-document permission bypass | **Suppressed** | Tenant read-access falls back to `prefs.tenant_id` only when Appwrite per-doc perms already granted `read`; both gates must pass. |

---

## 9. Appendix — Key File Reference

| Concern | File |
|---|---|
| Public chat API | `src/app/api/chat/message/route.ts` |
| Handoff token issuer | `src/app/api/handoff/token/route.ts` |
| Widget config (public) | `src/app/api/widget/config/[botId]/route.ts` |
| WebChat config (unauth GET) | `src/app/api/webchat/config/route.ts` |
| WebChat config update | `src/app/api/webchat/config/update/route.ts` |
| Document upload / url / ingest | `src/app/api/documents/{upload,url,ingest}/route.ts` |
| Auth actions | `src/app/auth-actions.ts` |
| Appwrite clients | `src/lib/server/appwrite.ts` |
| Tenant access | `src/lib/server/tenant-access.ts` |
| Handoff token primitive | `src/lib/server/handoff-token-core.js` |
| SSRF / crawler | `src/lib/server/crawler.ts` |
| WebChat config store | `src/lib/server/webchat-config-store.ts` |
| WebChat config schema | `src/lib/webchat-config.ts` |
| Socket.IO server | `websocket-server/server.js` |
| Socket.IO session store | `websocket-server/session-store.js` |
| Next.js config (no headers) | `next.config.ts` |
| Embed page (missing nonce) | `src/app/embed/[botId]/page.tsx` |
| Dashboard guard (client-only) | `src/app/(dashboard)/layout.tsx` |

---

*Audit performed using the Codex Security skill chain (threat-model, finding-discovery, validation, attack-path-analysis) with 6 parallel domain agents and first-hand source review of every critical path. Findings are grounded in line-referenced evidence; severities follow the Codex severity/policy matrix.*
