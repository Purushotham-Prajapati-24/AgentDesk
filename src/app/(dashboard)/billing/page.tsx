"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ReceiptText } from "lucide-react";
import { getTenantBillingSnapshot } from "@/lib/ledger";
import { useTenant } from "@/context/TenantContext";
import { EmptyState, MetricTile, PageHeader, Panel, StatusPill } from "@/components/ui/Signal";

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
    <div className="min-h-screen">
      <PageHeader
        kicker="Billing ledger"
        title="Credits, volume, and operating cost."
        description="Track top-ups, token debits, active sessions, message volume, and document storage for the current tenant."
        action={<StatusPill tone="warn">Tenant: {tenant?.$id ?? "Unavailable"}</StatusPill>}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="flex items-center gap-3 border border-border bg-destructive px-4 py-3 font-bold text-white" role="alert">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <MetricTile label="Balance" value={formatAmount(snapshot?.balance ?? 0)} detail="available credits" tone="warn" />
          <MetricTile
            label="Active sessions"
            value={String(snapshot?.stats.activeSessions ?? 0)}
            detail={`open in last ${snapshot?.stats.activeSessionWindowMinutes ?? 30}m`}
          />
          <MetricTile label="Messages" value={String(snapshot?.stats.totalMessages ?? 0)} detail="conversation volume" tone="hot" />
          <MetricTile label="Storage" value={formatBytes(snapshot?.stats.documentStorageBytes ?? 0)} detail="knowledge payload" tone="dark" />
        </section>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-primary/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <ReceiptText aria-hidden="true" className="h-5 w-5" />
              <h2 className="text-lg font-bold">Transaction history</h2>
            </div>
            <StatusPill tone="dark">{snapshot?.transactions.length ?? 0} rows</StatusPill>
          </div>
          {(snapshot?.transactions ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState title="No ledger entries yet" description="Credits and usage debits will appear here after billing events are recorded." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-card-elevated text-xs uppercase text-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot?.transactions.map((transaction) => (
                    <tr className="border-t border-border bg-card odd:bg-secondary/60" key={transaction.id}>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-muted-foreground">{formatDate(transaction.created)}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{transaction.transactionType}</td>
                      <td className="px-4 py-3 font-semibold text-muted-foreground">{transaction.description}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${transaction.amount < 0 ? "text-destructive" : "text-success"}`}>
                        {formatAmount(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
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

