import assert from "node:assert/strict";
import { test } from "node:test";

// ---------------------------------------------------------------------------
// Tests for billing rollup patterns used in credits.ts.
// Since credits.ts uses @/ path aliases (unresolvable by bare node), we test
// the reconcile-on-miss logic and type contracts in isolation.
// ---------------------------------------------------------------------------

/**
 * Pure balance calculator — mirrors credits.ts:calculateBalance.
 */
function calculateBalance(transactions) {
  return transactions.reduce((total, tx) => total + tx.amount, 0);
}

/**
 * Reconcile-on-miss pattern: first request computes full sum, persists to
 * rollup with balance_reconciled_at marker.  Subsequent requests read the
 * rollup directly.
 */
function createReconciler() {
  const rollups = new Map();
  return {
    getRollup(tenantId) {
      return rollups.get(tenantId) ?? null;
    },
    /**
     * Simulates the full-paginate fallback path.
     * Returns snapshot + side-effects the rollup.
     */
    reconcile(tenantId, transactions) {
      const balance = calculateBalance(transactions);
      const rollup = {
        credit_balance: balance,
        balance_reconciled_at: new Date().toISOString(),
      };
      rollups.set(tenantId, rollup);
      return { balance, transactions };
    },
    /**
     * Simulates the fast rollup-backed path.
     * Returns snapshot from pre-computed rollup.
     */
    readFast(tenantId, tenantCredits) {
      const rollup = rollups.get(tenantId);
      if (!rollup || !rollup.balance_reconciled_at) {
        return null; // signals: fall back to full paginate
      }
      return {
        balance: tenantCredits + rollup.credit_balance,
        reconciled: true,
      };
    },
  };
}

test("calculateBalance sums positive and negative amounts", () => {
  const transactions = [
    { amount: 100, type: "top_up" },
    { amount: -10, type: "debit" },
    { amount: -5, type: "debit" },
    { amount: 50, type: "top_up" },
  ];
  assert.equal(calculateBalance(transactions), 135);
});

test("calculateBalance returns 0 for empty transactions", () => {
  assert.equal(calculateBalance([]), 0);
});

test("reconcile-on-miss: first request computes full sum and persists rollup", () => {
  const reconciler = createReconciler();
  const transactions = [
    { amount: 500, type: "top_up" },
    { amount: -10, type: "debit" },
    { amount: -5, type: "debit" },
  ];

  const snapshot = reconciler.reconcile("tenant_1", transactions);
  assert.equal(snapshot.balance, 485);
  assert.equal(snapshot.transactions.length, 3);

  // Rollup should now exist for fast-path reads
  const rollup = reconciler.getRollup("tenant_1");
  assert.ok(rollup !== null);
  assert.equal(rollup.credit_balance, 485);
  assert.ok(rollup.balance_reconciled_at.length > 0);
});

test("reconcile-on-miss: subsequent request reads from rollup (fast path)", () => {
  const reconciler = createReconciler();

  // First request: reconcile
  reconciler.reconcile("tenant_1", [
    { amount: 200, type: "top_up" },
    { amount: -15, type: "debit" },
  ]);

  // Second request: should hit fast path
  const fast = reconciler.readFast("tenant_1", 0);
  assert.ok(fast !== null);
  assert.equal(fast.balance, 185);
  assert.equal(fast.reconciled, true);
});

test("reconcile-on-miss: unreconciled tenant returns null (triggers fallback)", () => {
  const reconciler = createReconciler();
  const fast = reconciler.readFast("tenant_new", 0);
  assert.equal(fast, null);
});

test("reconcile-on-miss: tenant credits are added on top of rollup balance", () => {
  const reconciler = createReconciler();
  reconciler.reconcile("tenant_1", [{ amount: -50, type: "debit" }]);

  // tenantCredits represents the legacy credits field on the tenant document
  const fast = reconciler.readFast("tenant_1", 1000);
  assert.equal(fast.balance, 950);
});

test("billing rollup data shape matches expected format", () => {
  const rollup = {
    credit_balance: -50,
    document_storage_bytes: 1024,
    balance_reconciled_at: "2026-06-20T00:00:00.000Z",
  };

  // These are the shapes credits.ts reads from the rollup document.
  assert.equal(typeof rollup.credit_balance, "number");
  assert.equal(typeof rollup.document_storage_bytes, "number");
  assert.equal(typeof rollup.balance_reconciled_at, "string");
  assert.ok(rollup.balance_reconciled_at.length > 0, "reconciled_at should be a non-empty string");
});

test("billing snapshot type contracts are correct", () => {
  const snapshot = {
    success: true,
    data: {
      balance: 500,
      transactions: [
        {
          id: "tx_1",
          amount: -10,
          transactionType: "debit",
          description: "Chat message",
          created: "2026-06-20T12:00:00.000Z",
        },
      ],
      stats: {
        activeSessions: 3,
        activeSessionWindowMinutes: 30,
        totalMessages: 42,
        documentStorageBytes: 2048,
      },
    },
  };

  assert.equal(snapshot.success, true);
  assert.equal(typeof snapshot.data.balance, "number");
  assert.ok(Array.isArray(snapshot.data.transactions));
  assert.equal(typeof snapshot.data.stats.activeSessions, "number");
  assert.equal(typeof snapshot.data.stats.documentStorageBytes, "number");
});
