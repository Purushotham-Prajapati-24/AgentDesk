"use client";

import { useEffect, useState } from "react";
import { getTenantBillingSnapshot } from "@/lib/ledger";
import { useTenant } from "@/context/TenantContext";

type BillingSnapshot = {
  balance: number;
  transactions: Array<{
    id: string;
    amount: number;
    transactionType: string;
    description: string;
    created: string;
  }>;
  stats: {
    activeSessions: number;
    totalMessages: number;
    documentStorageBytes: number;
  };
};

export default function BillingPage() {
  const { tenant } = useTenant();
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let isActive = true;
    getTenantBillingSnapshot(tenant.$id).then((response) => {
      if (!isActive) {
        return;
      }

      if (response.success) {
        setSnapshot(response.data);
        setError("");
      } else {
        setError(response.error);
      }
    });

    return () => {
      isActive = false;
    };
  }, [tenant?.$id]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5">
        <section className="border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold leading-6 text-slate-500">Billing ledger</p>
          <h1 className="text-2xl font-semibold leading-tight">Usage and balance</h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-slate-600">
            Review top-ups, token debits, active sessions, message volume, and document storage for the current tenant.
          </p>
        </section>

        {error ? <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <section className="grid gap-4 py-5 md:grid-cols-4">
          <MetricTile label="Balance" value={formatAmount(snapshot?.balance ?? 0)} />
          <MetricTile label="Active sessions" value={String(snapshot?.stats.activeSessions ?? 0)} />
          <MetricTile label="Messages" value={String(snapshot?.stats.totalMessages ?? 0)} />
          <MetricTile label="Storage" value={formatBytes(snapshot?.stats.documentStorageBytes ?? 0)} />
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold leading-tight">Transaction history</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(snapshot?.transactions ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                      No ledger transactions found for this tenant.
                    </td>
                  </tr>
                ) : (
                  snapshot?.transactions.map((transaction) => (
                    <tr className="border-t border-slate-200" key={transaction.id}>
                      <td className="px-4 py-3 text-slate-600">{formatDate(transaction.created)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{transaction.transactionType}</td>
                      <td className="px-4 py-3 text-slate-600">{transaction.description}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${transaction.amount < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        {formatAmount(transaction.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold leading-6 text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-tight text-slate-950">{value}</p>
    </article>
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
