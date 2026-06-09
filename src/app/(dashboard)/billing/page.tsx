"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Database, MessageSquare, ReceiptText, WalletCards } from "lucide-react";
import { getTenantBillingSnapshot } from "@/lib/ledger";
import { useTenant } from "@/context/TenantContext";
import { EmptyState } from "@/components/ui/Signal";
import { Skeleton } from "@/components/ui/skeleton";

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

type BillingTransaction = BillingSnapshot["transactions"][number];

export default function BillingPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isBillingLoading, setIsBillingLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let isActive = true;
    getTenantBillingSnapshot(tenant.$id).then((response) => {
      if (!isActive) {
        return;
      }

      setIsBillingLoading(false);
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

  if (tenantLoading) {
    return <BillingPageSkeleton />;
  }

  const balance = snapshot?.balance ?? 0;
  const activeSessions = snapshot?.stats.activeSessions ?? 0;
  const totalMessages = snapshot?.stats.totalMessages ?? 0;
  const storageBytes = snapshot?.stats.documentStorageBytes ?? 0;
  const transactions = snapshot?.transactions ?? [];
  const isSnapshotLoading = Boolean(tenant?.$id) && isBillingLoading;

  return (
    <div className="cockpit-lane min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <section className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#22c55e]/30 bg-[linear-gradient(135deg,#f0fdf4_0%,#bbf7d0_48%,#22c55e_100%)] text-[#052e16] shadow-[0_24px_70px_rgba(34,197,94,0.16)] dark:bg-[linear-gradient(135deg,#031b12_0%,#14532d_48%,#22c55e_100%)] dark:text-[#ecfdf5]">
          <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-4">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-[#166534]/20 bg-white/55 px-3 py-1 font-mono text-xs font-semibold uppercase text-[#166534] dark:border-white/20 dark:bg-black/20 dark:text-[#bbf7d0]">
                Usage and billing
              </p>
              <h1 className="mt-2 max-w-4xl text-2xl font-semibold leading-[1.1] tracking-[-0.03em] text-current sm:text-3xl lg:text-5xl">
                Keep credits, usage, and customer traffic in one clear ledger.
              </h1>
            </div>

            {isSnapshotLoading ? (
              <BalanceCardSkeleton />
            ) : (
            <div className="grid content-between gap-3 rounded-3xl bg-[linear-gradient(135deg,#dcfce7_0%,#86efac_48%,#22c55e_100%)] p-3 text-[#052e16]">
              <div>
                <p className="font-mono text-xs font-semibold uppercase opacity-60">Current balance</p>
                <p className="mt-1 font-mono text-4xl font-semibold tracking-[-0.04em]">{formatAmount(balance)}</p>
                <p className="mt-2 text-sm font-medium leading-5 opacity-60">Credits for live chat, ingestion, and indexed knowledge.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/75 px-3 py-2 text-xs font-semibold text-[#052e16]">Tenant: {tenant?.$id ?? "Unavailable"}</span>
                <span className="rounded-full border border-[#052e16]/15 bg-white/25 px-3 py-2 text-xs font-semibold text-[#14532d]">{transactions.length} ledger rows</span>
              </div>
            </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#ff5530]/40 bg-[#ff5530]/10 px-4 py-3 font-semibold text-[#ff5530]" role="alert">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            {error}
          </div>
        ) : null}

        {isSnapshotLoading ? (
          <MetricGridSkeleton />
        ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <LedgerMetric icon={<WalletCards aria-hidden="true" className="h-5 w-5" />} label="Balance" value={formatAmount(balance)} detail="available credits" tone="dark" />
          <LedgerMetric icon={<Activity aria-hidden="true" className="h-5 w-5" />} label="Active sessions" value={String(activeSessions)} detail={`open in last ${snapshot?.stats.activeSessionWindowMinutes ?? 30}m`} tone="blue" />
          <LedgerMetric icon={<MessageSquare aria-hidden="true" className="h-5 w-5" />} label="Messages" value={String(totalMessages)} detail="conversation volume" tone="coral" />
          <LedgerMetric icon={<Database aria-hidden="true" className="h-5 w-5" />} label="Storage" value={formatBytes(storageBytes)} detail="knowledge payload" tone="green" />
        </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          {isSnapshotLoading ? (
            <PlanHealthSkeleton />
          ) : (
          <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
            <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">Plan health</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ui-text)]">Usage is ready for production tracking.</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[var(--ui-muted)]">
              Billing events are grouped by tenant, so finance and operators can audit credits without leaving the workspace.
            </p>
            <div className="mt-5 grid gap-3">
              <PlanRow label="Credit coverage" value={balance > 0 ? "Funded" : "Needs top-up"} />
              <PlanRow label="Session window" value={`${snapshot?.stats.activeSessionWindowMinutes ?? 30} minutes`} />
              <PlanRow label="Storage tracked" value={formatBytes(storageBytes)} />
            </div>
          </article>
          )}

          {isSnapshotLoading ? (
            <TransactionTableSkeleton />
          ) : (
          <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--ui-text)] text-[var(--ui-bg)]">
                  <ReceiptText aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ui-text)]">Transaction history</h2>
                  <p className="text-sm font-medium text-[var(--ui-muted)]">Credits and usage debits by event.</p>
                </div>
              </div>
              <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">{transactions.length} rows</span>
            </div>
            {transactions.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No ledger entries yet" description="Credits and usage debits will appear here after billing events are recorded." />
              </div>
            ) : (
              <>
              <div className="grid gap-3 p-3 md:hidden">
                {transactions.map((transaction) => (
                  <TransactionCard transaction={transaction} key={transaction.id} />
                ))}
              </div>
              <div className="scroll-hint is-scrollable hidden max-h-[520px] w-full overflow-auto [scrollbar-color:#22c55e_var(--ui-panel-2)] [scrollbar-width:thin] md:block">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[var(--ui-panel)] text-xs uppercase text-[var(--ui-muted)] shadow-[0_1px_0_var(--ui-border)]">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr className="border-t border-[var(--ui-border)] bg-[var(--ui-panel)] odd:bg-[var(--ui-bg)]" key={transaction.id}>
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-[var(--ui-muted)]">{formatDate(transaction.created)}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 text-xs font-semibold text-[var(--ui-text)]">{transaction.transactionType}</span>
                        </td>
                        <td className="px-5 py-4 font-medium text-[var(--ui-muted)]">{transaction.description}</td>
                        <td className={`whitespace-nowrap px-5 py-4 text-right font-mono font-semibold ${transaction.amount < 0 ? "text-[#dc2626]" : "text-[#15803d]"}`}>
                          {formatAmount(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
          )}
        </section>
      </div>
    </div>
  );
}

function BillingPageSkeleton() {
  return (
    <div className="cockpit-lane min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <section className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#22c55e]/30 bg-[linear-gradient(135deg,#f0fdf4_0%,#bbf7d0_48%,#22c55e_100%)] text-[#052e16] shadow-[0_24px_70px_rgba(34,197,94,0.16)] dark:bg-[linear-gradient(135deg,#031b12_0%,#14532d_48%,#22c55e_100%)] dark:text-[#ecfdf5]">
          <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-4">
            <div className="min-w-0">
              <Skeleton className="h-7 w-40 rounded-full bg-white/45 dark:bg-white/20" />
              <div className="mt-2 grid max-w-4xl gap-3">
                <Skeleton className="h-12 w-full max-w-3xl bg-white/50 dark:bg-white/20 sm:h-14" />
                <Skeleton className="h-12 w-4/5 max-w-2xl bg-white/45 dark:bg-white/15 sm:h-14" />
              </div>
            </div>
            <BalanceCardSkeleton />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <MetricGridSkeleton />
        <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <PlanHealthSkeleton />
          <TransactionTableSkeleton />
        </section>
      </div>
    </div>
  );
}

function BalanceCardSkeleton() {
  return (
    <div className="grid content-between gap-3 rounded-3xl bg-[linear-gradient(135deg,#dcfce7_0%,#86efac_48%,#22c55e_100%)] p-3">
      <div>
        <Skeleton className="h-4 w-32 bg-white/40" />
        <Skeleton className="mt-2 h-10 w-36 bg-white/50" />
        <div className="mt-2 grid gap-2">
          <Skeleton className="h-4 w-full bg-white/35" />
          <Skeleton className="h-4 w-3/4 bg-white/35" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-7 w-36 rounded-full bg-white/45" />
        <Skeleton className="h-7 w-24 rounded-full bg-white/35" />
      </div>
    </div>
  );
}

function MetricGridSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <MetricSkeleton key={index} />
      ))}
    </section>
  );
}

function MetricSkeleton() {
  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-24 bg-[var(--ui-bg)]" />
        <Skeleton className="h-9 w-9 rounded-full bg-[var(--ui-bg)]" />
      </div>
      <Skeleton className="mt-5 h-10 w-28 bg-[var(--ui-bg)]" />
      <Skeleton className="mt-3 h-4 w-36 bg-[var(--ui-bg)]" />
    </article>
  );
}

function PlanHealthSkeleton() {
  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <Skeleton className="h-4 w-28 bg-[var(--ui-bg)]" />
      <div className="mt-4 grid gap-2">
        <Skeleton className="h-7 w-full bg-[var(--ui-bg)]" />
        <Skeleton className="h-7 w-4/5 bg-[var(--ui-bg)]" />
      </div>
      <div className="mt-4 grid gap-2">
        <Skeleton className="h-4 w-full bg-[var(--ui-bg)]" />
        <Skeleton className="h-4 w-10/12 bg-[var(--ui-bg)]" />
        <Skeleton className="h-4 w-2/3 bg-[var(--ui-bg)]" />
      </div>
      <div className="mt-5 grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton className="h-11 rounded-full bg-[var(--ui-bg)]" key={index} />
        ))}
      </div>
    </article>
  );
}

function TransactionTableSkeleton() {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-5 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full bg-[var(--ui-bg)]" />
          <div>
            <Skeleton className="h-5 w-44 bg-[var(--ui-bg)]" />
            <Skeleton className="mt-2 h-4 w-52 bg-[var(--ui-bg)]" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-full bg-[var(--ui-bg)]" />
      </div>
      <div className="max-h-[520px] w-full overflow-auto [scrollbar-color:#22c55e_var(--ui-panel-2)] [scrollbar-width:thin]">
        <div className="min-w-[760px]">
          <div className="sticky top-0 z-10 grid grid-cols-[1fr_0.8fr_1.6fr_0.8fr] gap-4 bg-[var(--ui-panel)] px-5 py-3 shadow-[0_1px_0_var(--ui-border)]">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-4 bg-[var(--ui-bg)]" key={index} />
            ))}
          </div>
          <div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="grid grid-cols-[1fr_0.8fr_1.6fr_0.8fr] gap-4 border-t border-[var(--ui-border)] px-5 py-4" key={index}>
                <Skeleton className="h-4 bg-[var(--ui-bg)]" />
                <Skeleton className="h-7 rounded-full bg-[var(--ui-bg)]" />
                <Skeleton className="h-4 bg-[var(--ui-bg)]" />
                <Skeleton className="h-4 bg-[var(--ui-bg)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LedgerMetric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "dark" | "blue" | "coral" | "green";
}) {
  const toneClass = {
    dark: "bg-[var(--ui-text)] text-[var(--ui-bg)]",
    blue: "bg-[var(--ui-blue)] text-white",
    coral: "bg-[#ff5530] text-white",
    green: "bg-[#22c55e]/15 text-[#22c55e]",
  }[tone];

  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-full ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-5 break-words font-mono text-2xl font-semibold tracking-[-0.04em] text-[var(--ui-text)] sm:text-3xl xl:text-4xl">{value}</p>
      <p className="mt-3 text-sm font-medium text-[var(--ui-muted)]">{detail}</p>
    </article>
  );
}

function TransactionCard({ transaction }: { transaction: BillingTransaction }) {
  const amountClass = transaction.amount < 0 ? "text-[#dc2626]" : "text-[#15803d]";

  return (
    <article className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">{formatDate(transaction.created)}</p>
          <p className="mt-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 text-xs font-semibold text-[var(--ui-text)]">
            {transaction.transactionType}
          </p>
        </div>
        <p className={`shrink-0 whitespace-nowrap font-mono text-sm font-semibold ${amountClass}`}>{formatAmount(transaction.amount)}</p>
      </div>
      <p className="mt-3 break-words text-sm font-medium leading-6 text-[var(--ui-muted)]">{transaction.description}</p>
    </article>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-full">
      <span className="text-sm font-semibold text-[var(--ui-muted)]">{label}</span>
      <span className="font-mono text-xs font-semibold text-[var(--ui-text)]">{value}</span>
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

