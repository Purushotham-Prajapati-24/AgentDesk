"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, Bot, MessageSquare, Radio, UserRound } from "lucide-react";
import { getMonitorAnalyticsSnapshot, type MonitorAnalyticsSnapshot } from "@/app/monitor-actions";
import { EmptyState, MetricTile, PageHeader, Panel, StatusPill } from "@/components/ui/Signal";
import { useTenant } from "@/context/TenantContext";

export default function MonitorAnalyticsPage() {
  const { tenant } = useTenant();
  const [snapshot, setSnapshot] = useState<MonitorAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let isActive = true;
    getMonitorAnalyticsSnapshot(tenant.$id).then((response) => {
      if (!isActive) {
        return;
      }

      setLoading(false);
      if (!response.success) {
        setSnapshot(null);
        setError(response.error);
        return;
      }

      setSnapshot(response.data);
      setError("");
    });

    return () => {
      isActive = false;
    };
  }, [tenant?.$id]);

  const totals = snapshot?.totals;

  return (
    <div className="min-h-screen">
      <PageHeader
        kicker="Monitor / Analytics"
        title="Operational signals for the support desk."
        description="Measure conversation volume, handoff pressure, bot activity, customer demand, and usage health from existing tenant data."
        action={<StatusPill tone="info">{loading ? "Refreshing" : `Tenant: ${tenant?.$id ?? "Unavailable"}`}</StatusPill>}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="flex items-center gap-3 border border-border bg-destructive px-4 py-3 font-bold text-white" role="alert">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Conversations" value={String(totals?.conversations ?? 0)} detail="tenant lifetime total" tone="info" />
          <MetricTile label="Active sessions" value={String(totals?.activeSessions ?? 0)} detail="currently open" tone="warn" />
          <MetricTile label="Human handoffs" value={String(totals?.handoffs ?? 0)} detail="paused for operator" tone="hot" />
          <MetricTile label="Avg messages" value={String(totals?.averageMessagesPerConversation ?? 0)} detail="per conversation" tone="dark" />
          <MetricTile label="Customer messages" value={String(totals?.customerMessages ?? 0)} detail="latest sampled window" />
          <MetricTile label="Bot replies" value={String(totals?.botReplies ?? 0)} detail="latest sampled window" tone="info" />
          <MetricTile label="Agent messages" value={String(totals?.agentMessages ?? 0)} detail="manual support replies" tone="hot" />
          <MetricTile label="Knowledge storage" value={formatBytes(totals?.documentStorageBytes ?? 0)} detail={`credits ${formatAmount(totals?.creditBalance ?? 0)}`} tone="warn" />
        </section>

        {!snapshot && !loading ? (
          <EmptyState title="No analytics available" description="Conversation and message activity will appear once this tenant has customer sessions." />
        ) : null}

        {snapshot ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-5">
              <Panel className="p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="studio-kicker text-primary">Message flow</p>
                    <h2 className="mt-1 text-2xl font-bold">Recent activity</h2>
                  </div>
                  <BarChart3 aria-hidden="true" className="h-5 w-5 text-accent" />
                </div>
                <div className="grid min-h-64 grid-cols-7 items-end gap-3">
                  {snapshot.recentActivity.map((item) => (
                    <Bar key={item.label} label={item.label} value={item.value} max={maxValue(snapshot.recentActivity)} />
                  ))}
                </div>
              </Panel>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel className="p-5">
                  <div className="mb-5 flex items-center gap-2">
                    <Radio aria-hidden="true" className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">Session status</h2>
                  </div>
                  <DistributionList items={snapshot.statusDistribution.map((item) => ({ label: item.label.replaceAll("_", " "), value: item.value }))} />
                </Panel>

                <Panel className="p-5">
                  <div className="mb-5 flex items-center gap-2">
                    <MessageSquare aria-hidden="true" className="h-5 w-5 text-accent" />
                    <h2 className="text-xl font-bold">Sender mix</h2>
                  </div>
                  <DistributionList items={snapshot.senderMix} />
                </Panel>
              </div>
            </div>

            <div className="grid gap-5">
              <Panel className="p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Bot aria-hidden="true" className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Top bots</h2>
                </div>
                {snapshot.topBots.length === 0 ? (
                  <EmptyState title="No bot activity" description="Bot activity will appear after sessions are created." />
                ) : (
                  <div className="grid gap-3">
                    {snapshot.topBots.map((bot) => (
                      <div className="rounded-lg border border-border bg-secondary/50 p-3" key={bot.botId}>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                          <p className="truncate font-mono text-sm font-bold text-foreground">{bot.botId}</p>
                          <StatusPill tone="dark">{bot.conversations} conv</StatusPill>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-muted-foreground">{bot.messages} sampled messages</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel className="p-5">
                <div className="mb-5 flex items-center gap-2">
                  <UserRound aria-hidden="true" className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-bold">Needs attention</h2>
                </div>
                {snapshot.attentionConversations.length === 0 ? (
                  <EmptyState title="No open conversations" description="Active and paused conversations will surface here." />
                ) : (
                  <div className="grid gap-3">
                    {snapshot.attentionConversations.map((conversation) => (
                      <article className="rounded-lg border border-border bg-card p-3" key={conversation.id}>
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-foreground">{conversation.sessionToken}</p>
                            <p className="mt-1 truncate font-mono text-xs font-bold text-muted-foreground">{conversation.botId || "unassigned bot"}</p>
                          </div>
                          <StatusPill tone={conversation.status === "paused_by_human" ? "hot" : "warn"}>{conversation.status.replaceAll("_", " ")}</StatusPill>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-muted-foreground">{conversation.lastMessage}</p>
                      </article>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DistributionList({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = maxValue(items);

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-semibold capitalize text-foreground">{item.label}</p>
            <p className="font-mono text-sm font-bold text-muted-foreground">{item.value}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${max === 0 ? 0 : Math.max(8, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="grid h-full grid-rows-[1fr_auto_auto] gap-2">
      <div className="flex items-end">
        <div
          className="w-full rounded-t-md border border-primary/30 bg-primary/70 shadow-[0_0_30px_rgba(245,158,11,0.16)]"
          style={{ height: `${max === 0 ? 4 : Math.max(10, (value / max) * 100)}%` }}
        />
      </div>
      <p className="text-center font-mono text-xs font-bold text-muted-foreground">{value}</p>
      <p className="text-center font-mono text-xs font-bold text-muted-foreground">{label}</p>
    </div>
  );
}

function maxValue(items: Array<{ value: number }>) {
  return Math.max(0, ...items.map((item) => item.value));
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

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
}
