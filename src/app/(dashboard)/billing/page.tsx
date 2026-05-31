"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ReceiptText } from "lucide-react";
import { getTenantBillingSnapshot } from "@/lib/ledger";
import { useTenant } from "@/context/TenantContext";
import { EmptyState } from "@/components/ui/Signal";

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
    activeSessionWindowMinutes: number;
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
    <div className="cream-lane min-h-screen">
      <section className="border-b border-[#eceae4] bg-[#f7f4ed] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-[#1456f0]">Billing ledger</p>
            <h1 className="editorial-display mt-2 max-w-4xl text-6xl text-[#1c1c1c]">Credits, volume, and operating cost.</h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[#5f5f5d]">
              Track top-ups, token debits, active sessions, message volume, and document storage for the current tenant.
            </p>
          </div>
          <span className="inline-flex rounded-full border border-[#eceae4] bg-[#fcfbf8] px-3 py-2 font-mono text-xs font-semibold text-[#1c1c1c]">
            Tenant: {tenant?.$id ?? "Unavailable"}
          </span>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="flex items-center gap-3 border border-[#ff5530]/40 bg-[#ff5530]/10 px-4 py-3 font-semibold text-[#b42318]" role="alert">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <LedgerMetric label="Balance" value={formatAmount(snapshot?.balance ?? 0)} detail="available credits" />
          <LedgerMetric label="Active sessions" value={String(snapshot?.stats.activeSessions ?? 0)} detail={`open in last ${snapshot?.stats.activeSessionWindowMinutes ?? 30}m`} />
          <LedgerMetric label="Messages" value={String(snapshot?.stats.totalMessages ?? 0)} detail="conversation volume" />
          <LedgerMetric label="Storage" value={formatBytes(snapshot?.stats.documentStorageBytes ?? 0)} detail="knowledge payload" />
        </section>

        <section className="min-w-0 overflow-hidden border border-[#eceae4] bg-[#fcfbf8]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceae4] bg-[#f7f4ed] px-4 py-3">
            <div className="flex items-center gap-2">
              <ReceiptText aria-hidden="true" className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-[#1c1c1c]">Transaction history</h2>
            </div>
            <span className="rounded-full border border-[#eceae4] bg-[#fcfbf8] px-3 py-1 font-mono text-xs font-semibold text-[#5f5f5d]">{snapshot?.transactions.length ?? 0} rows</span>
          </div>
          {(snapshot?.transactions ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState title="No ledger entries yet" description="Credits and usage debits will appear here after billing events are recorded." />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-[#f7f4ed] text-xs uppercase text-[#5f5f5d]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot?.transactions.map((transaction) => (
                    <tr className="border-t border-[#eceae4] bg-[#fcfbf8] odd:bg-[#f7f4ed]" key={transaction.id}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#5f5f5d]">{formatDate(transaction.created)}</td>
                      <td className="px-4 py-3 font-semibold text-[#1c1c1c]">{transaction.transactionType}</td>
                      <td className="px-4 py-3 font-medium text-[#5f5f5d]">{transaction.description}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${transaction.amount < 0 ? "text-[#dc2626]" : "text-[#15803d]"}`}>
                        {formatAmount(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function LedgerMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="border border-[#eceae4] bg-[#fcfbf8] p-5">
      <p className="font-mono text-xs font-semibold uppercase text-[#5f5f5d]">{label}</p>
      <p className="mt-5 font-mono text-4xl text-[#1c1c1c]">{value}</p>
      <div className="mt-5 h-2 rounded-full bg-[#eceae4]">
        <div className="h-full w-2/3 rounded-full bg-[#1456f0]" />
      </div>
      <p className="mt-3 text-sm font-medium text-[#5f5f5d]">{detail}</p>
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

