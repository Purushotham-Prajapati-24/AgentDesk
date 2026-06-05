"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Database, MessageSquare, ReceiptText, WalletCards } from "lucide-react";
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

  const balance = snapshot?.balance ?? 0;
  const activeSessions = snapshot?.stats.activeSessions ?? 0;
  const totalMessages = snapshot?.stats.totalMessages ?? 0;
  const storageBytes = snapshot?.stats.documentStorageBytes ?? 0;
  const transactions = snapshot?.transactions ?? [];

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#0a0a0a]">
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#e5e7eb] bg-white">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-[#e5e7eb] bg-[#f7f8fa] px-3 py-1 font-mono text-xs font-semibold uppercase text-[#1456f0]">
                Usage and billing
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#0a0a0a] sm:text-5xl lg:text-6xl">
                Keep credits, usage, and customer traffic in one clear ledger.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[#45515e]">
                Monitor available balance, conversation volume, active sessions, and knowledge storage for the selected workspace.
              </p>
            </div>

            <div className="grid content-between gap-5 rounded-3xl bg-[#0a0a0a] p-5 text-white">
              <div>
                <p className="font-mono text-xs font-semibold uppercase text-white/60">Current balance</p>
                <p className="mt-3 font-mono text-5xl font-semibold tracking-[-0.04em]">{formatAmount(balance)}</p>
                <p className="mt-3 text-sm font-medium leading-6 text-white/60">Available credits for live chat, ingestion, and indexed knowledge workflows.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0a0a0a]">Tenant: {tenant?.$id ?? "Unavailable"}</span>
                <span className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/70">{transactions.length} ledger rows</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#ff5530]/40 bg-[#ff5530]/10 px-4 py-3 font-semibold text-[#b42318]" role="alert">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <LedgerMetric icon={<WalletCards aria-hidden="true" className="h-5 w-5" />} label="Balance" value={formatAmount(balance)} detail="available credits" tone="dark" />
          <LedgerMetric icon={<Activity aria-hidden="true" className="h-5 w-5" />} label="Active sessions" value={String(activeSessions)} detail={`open in last ${snapshot?.stats.activeSessionWindowMinutes ?? 30}m`} tone="blue" />
          <LedgerMetric icon={<MessageSquare aria-hidden="true" className="h-5 w-5" />} label="Messages" value={String(totalMessages)} detail="conversation volume" tone="coral" />
          <LedgerMetric icon={<Database aria-hidden="true" className="h-5 w-5" />} label="Storage" value={formatBytes(storageBytes)} detail="knowledge payload" tone="green" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <article className="rounded-[1.5rem] border border-[#e5e7eb] bg-white p-5">
            <p className="font-mono text-xs font-semibold uppercase text-[#5f5f5f]">Plan health</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Usage is ready for production tracking.</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[#45515e]">
              Billing events are grouped by tenant, so finance and operators can audit credits without leaving the workspace.
            </p>
            <div className="mt-5 grid gap-3">
              <PlanRow label="Credit coverage" value={balance > 0 ? "Funded" : "Needs top-up"} />
              <PlanRow label="Session window" value={`${snapshot?.stats.activeSessionWindowMinutes ?? 30} minutes`} />
              <PlanRow label="Storage tracked" value={formatBytes(storageBytes)} />
            </div>
          </article>

          <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e5e7eb] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] bg-[#f7f8fa] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0a0a0a] text-white">
                  <ReceiptText aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#0a0a0a]">Transaction history</h2>
                  <p className="text-sm font-medium text-[#5f5f5f]">Credits and usage debits by event.</p>
                </div>
              </div>
              <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 font-mono text-xs font-semibold text-[#5f5f5f]">{transactions.length} rows</span>
            </div>
            {transactions.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No ledger entries yet" description="Credits and usage debits will appear here after billing events are recorded." />
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-white text-xs uppercase text-[#5f5f5f]">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr className="border-t border-[#eaecf0] bg-white odd:bg-[#f7f8fa]" key={transaction.id}>
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-[#5f5f5f]">{formatDate(transaction.created)}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-xs font-semibold text-[#0a0a0a]">{transaction.transactionType}</span>
                        </td>
                        <td className="px-5 py-4 font-medium text-[#45515e]">{transaction.description}</td>
                        <td className={`px-5 py-4 text-right font-mono font-semibold ${transaction.amount < 0 ? "text-[#dc2626]" : "text-[#15803d]"}`}>
                          {formatAmount(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
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
    dark: "bg-[#0a0a0a] text-white",
    blue: "bg-[#1456f0] text-white",
    coral: "bg-[#ff5530] text-white",
    green: "bg-[#e8ffea] text-[#1ba673]",
  }[tone];

  return (
    <article className="rounded-[1.5rem] border border-[#e5e7eb] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold uppercase text-[#5f5f5f]">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-full ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-5 font-mono text-4xl font-semibold tracking-[-0.04em] text-[#0a0a0a]">{value}</p>
      <p className="mt-3 text-sm font-medium text-[#45515e]">{detail}</p>
    </article>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-[#e5e7eb] bg-[#f7f8fa] px-4 py-3">
      <span className="text-sm font-semibold text-[#45515e]">{label}</span>
      <span className="font-mono text-xs font-semibold text-[#0a0a0a]">{value}</span>
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

