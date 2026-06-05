"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Bot, MessageSquare, Radio, UserRound } from "lucide-react";
import { getMonitorAnalyticsSnapshot, type MonitorAnalyticsSnapshot } from "@/app/monitor-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/TenantContext";

export default function MonitorAnalyticsPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [snapshot, setSnapshot] = useState<MonitorAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant?.$id) {
      setLoading(false);
      return;
    }

    let isActive = true;
    setLoading(true);
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
  const initialLoading = tenantLoading || loading;

  if (initialLoading) {
    return <MonitorAnalyticsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <section className="grid gap-5 rounded-[2rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
          <div className="min-w-0">
            <p className="studio-kicker text-[var(--ui-blue)]">Monitor / Analytics</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ui-text)] sm:text-5xl">
              Operational signals for the support desk.
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[var(--ui-muted)]">
              Measure conversation volume, handoff pressure, automation activity, customer demand, and usage health from tenant data.
            </p>
          </div>
          <div className="grid min-w-0 content-between gap-4 rounded-3xl bg-[linear-gradient(135deg,#fff7ed_0%,#fdba74_48%,#ff5530_100%)] p-5 text-[#431407]">
            <div>
              <p className="font-mono text-xs font-semibold uppercase opacity-70">{loading ? "Refreshing" : "Snapshot ready"}</p>
              <p className="mt-3 min-w-0 break-all font-mono text-xl font-semibold tracking-[-0.03em]">{tenant?.$id ?? "Unavailable"}</p>
            </div>
            <p className="text-sm font-medium leading-6 opacity-70">Aggregates are sampled from sessions, messages, indexed files, and ledger activity.</p>
          </div>
        </section>

        {error ? <ErrorNotice message={error} /> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AnalyticsMetric icon={<MessageSquare aria-hidden="true" className="h-5 w-5" />} label="Conversations" value={String(totals?.conversations ?? 0)} detail="tenant lifetime total" tone="blue" />
          <AnalyticsMetric icon={<Activity aria-hidden="true" className="h-5 w-5" />} label="Active sessions" value={String(totals?.activeSessions ?? 0)} detail="currently open" tone="green" />
          <AnalyticsMetric icon={<UserRound aria-hidden="true" className="h-5 w-5" />} label="Human handoffs" value={String(totals?.handoffs ?? 0)} detail="paused for operator" tone="coral" />
          <AnalyticsMetric icon={<BarChart3 aria-hidden="true" className="h-5 w-5" />} label="Avg messages" value={String(totals?.averageMessagesPerConversation ?? 0)} detail="per conversation" tone="dark" />
        </section>

        {!snapshot && !loading ? (
          <MonitorEmpty title="No analytics available" description="Conversation and message activity will appear once this tenant has customer sessions." />
        ) : null}

        {snapshot ? (
          <div className="grid min-w-0 gap-5">
            <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="studio-kicker text-[var(--ui-blue)]">Message flow</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Recent activity</h3>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ui-text)] text-[var(--ui-bg)]">
                  <BarChart3 aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
              <div className="grid h-40 grid-cols-7 items-end gap-3 sm:h-48">
                {snapshot.recentActivity.map((item) => (
                  <Bar key={item.label} label={item.label} value={item.value} max={maxValue(snapshot.recentActivity)} />
                ))}
              </div>
            </section>

            <div className="grid min-w-0 gap-5 lg:grid-cols-2 2xl:grid-cols-4">
              <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Radio aria-hidden="true" className="h-5 w-5 text-[var(--ui-blue)]" />
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Session status</h3>
                </div>
                <DistributionList items={snapshot.statusDistribution.map((item) => ({ label: item.label.replaceAll("_", " "), value: item.value }))} />
              </section>

              <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
                <div className="mb-5 flex items-center gap-2">
                  <MessageSquare aria-hidden="true" className="h-5 w-5 text-[var(--ui-blue)]" />
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Sender mix</h3>
                </div>
                <DistributionList items={snapshot.senderMix.map((item) => ({ label: item.label === "bot" ? "automation" : item.label, value: item.value }))} />
              </section>

              <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 sm:p-5">
                <div className="mb-5 flex items-center gap-2">
                  <Bot aria-hidden="true" className="h-5 w-5 text-[var(--ui-blue)]" />
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Top agents</h3>
                </div>
                {snapshot.topBots.length === 0 ? (
                  <MonitorEmpty title="No agent activity" description="Agent activity will appear after sessions are created." />
                ) : (
                  <div className="grid gap-3">
                    {snapshot.topBots.map((agent) => (
                      <div className="min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3" key={agent.botId}>
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <p className="min-w-0 truncate font-mono text-sm font-semibold text-[var(--ui-text)]">{agent.botId}</p>
                          <span className="shrink-0 rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">
                            {agent.conversations} conv
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-[var(--ui-muted)]">{agent.messages} sampled messages</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 sm:p-5">
                <div className="mb-5 flex items-center gap-2">
                  <UserRound aria-hidden="true" className="h-5 w-5 text-[var(--ui-blue)]" />
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Needs attention</h3>
                </div>
                {snapshot.attentionConversations.length === 0 ? (
                  <MonitorEmpty title="No open conversations" description="Active and paused conversations will surface here." />
                ) : (
                  <div className="grid gap-3">
                    {snapshot.attentionConversations.map((conversation) => (
                      <article className="min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3" key={conversation.id}>
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--ui-text)]">{conversation.sessionToken}</p>
                            <p className="mt-1 truncate font-mono text-xs font-semibold text-[var(--ui-muted)]">{conversation.botId || "unassigned agent"}</p>
                          </div>
                          <AttentionStatus status={conversation.status} />
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-[var(--ui-muted)]">{conversation.lastMessage}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MonitorAnalyticsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <AnalyticsHeroSkeleton />
        <AnalyticsMetricGridSkeleton />
        <div className="grid min-w-0 gap-5">
          <AnalyticsChartSkeleton />
          <div className="grid min-w-0 gap-5 lg:grid-cols-2 2xl:grid-cols-4">
            <DistributionPanelSkeleton />
            <DistributionPanelSkeleton />
            <SideCardSkeleton />
            <SideCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsHeroSkeleton() {
  return (
    <section className="grid gap-5 rounded-[2rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
      <div className="min-w-0">
        <Skeleton className="h-3 w-40 bg-[var(--ui-panel-2)]" />
        <Skeleton className="mt-4 h-10 w-full max-w-2xl bg-[var(--ui-panel-2)] sm:h-12" />
        <Skeleton className="mt-3 h-10 w-full max-w-xl bg-[var(--ui-panel-2)] sm:h-12" />
        <div className="mt-5 grid max-w-2xl gap-2">
          <Skeleton className="h-4 w-full bg-[var(--ui-panel-2)]" />
          <Skeleton className="h-4 w-5/6 bg-[var(--ui-panel-2)]" />
        </div>
      </div>
      <div className="grid min-w-0 content-between gap-4 rounded-3xl bg-[linear-gradient(135deg,#fff7ed_0%,#fdba74_48%,#ff5530_100%)] p-5">
        <div>
          <Skeleton className="h-3 w-28 bg-white/40" />
          <Skeleton className="mt-4 h-6 w-full bg-white/45" />
          <Skeleton className="mt-2 h-6 w-4/5 bg-white/45" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-3 w-full bg-white/35" />
          <Skeleton className="h-3 w-3/4 bg-white/35" />
        </div>
      </div>
    </section>
  );
}

function AnalyticsMetricGridSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <AnalyticsMetricSkeleton key={index} />
      ))}
    </section>
  );
}

function AnalyticsMetricSkeleton() {
  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-32 bg-[var(--ui-panel-2)]" />
        <Skeleton className="h-9 w-9 rounded-full bg-[var(--ui-panel-2)]" />
      </div>
      <Skeleton className="mt-5 h-10 w-24 bg-[var(--ui-panel-2)]" />
      <Skeleton className="mt-4 h-4 w-36 bg-[var(--ui-panel-2)]" />
    </article>
  );
}

function AnalyticsChartSkeleton() {
  return (
    <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Skeleton className="h-3 w-28 bg-[var(--ui-panel-2)]" />
          <Skeleton className="mt-3 h-7 w-48 bg-[var(--ui-panel-2)]" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full bg-[var(--ui-panel-2)]" />
      </div>
      <div className="grid h-40 grid-cols-7 items-end gap-3 sm:h-48">
        {[64, 38, 82, 54, 72, 46, 90].map((height, index) => (
          <div className="grid h-full grid-rows-[1fr_auto_auto] gap-2" key={index}>
            <div className="flex items-end">
              <Skeleton className="w-full rounded-t-xl bg-[var(--ui-blue)]/25" style={{ height: `${height}%` }} />
            </div>
            <Skeleton className="mx-auto h-3 w-8 bg-[var(--ui-panel-2)]" />
            <Skeleton className="mx-auto h-3 w-10 bg-[var(--ui-panel-2)]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DistributionPanelSkeleton() {
  return (
    <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full bg-[var(--ui-panel-2)]" />
        <Skeleton className="h-6 w-40 bg-[var(--ui-panel-2)]" />
      </div>
      <div className="grid gap-4">
        {[78, 48, 64, 34].map((width, index) => (
          <div key={index}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-32 bg-[var(--ui-panel-2)]" />
              <Skeleton className="h-4 w-8 bg-[var(--ui-panel-2)]" />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ui-bg)]">
              <Skeleton className="h-full rounded-full bg-[var(--ui-blue)]/30" style={{ width: `${width}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SideCardSkeleton() {
  return (
    <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full bg-[var(--ui-panel-2)]" />
        <Skeleton className="h-6 w-36 bg-[var(--ui-panel-2)]" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article className="min-w-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3" key={index}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-4/5 bg-[var(--ui-panel-2)]" />
                <Skeleton className="mt-2 h-3 w-1/2 bg-[var(--ui-panel-2)]" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full bg-[var(--ui-panel-2)]" />
            </div>
            <Skeleton className="mt-3 h-4 w-full bg-[var(--ui-panel-2)]" />
            <Skeleton className="mt-2 h-4 w-3/4 bg-[var(--ui-panel-2)]" />
          </article>
        ))}
      </div>
    </section>
  );
}

function AnalyticsMetric({
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
  tone: "blue" | "green" | "coral" | "dark";
}) {
  const toneClass = {
    blue: "bg-[var(--ui-blue)] text-white",
    green: "bg-[#22c55e]/15 text-[#22c55e]",
    coral: "bg-[#ff5530] text-white",
    dark: "bg-[var(--ui-text)] text-[var(--ui-bg)]",
  }[tone];

  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-full ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-5 font-mono text-4xl font-semibold tracking-[-0.04em] text-[var(--ui-text)]">{value}</p>
      <p className="mt-3 text-sm font-medium text-[var(--ui-muted)]">{detail}</p>
    </article>
  );
}

function DistributionList({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = maxValue(items);

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-semibold capitalize text-[var(--ui-text)]">{item.label}</p>
            <p className="font-mono text-sm font-semibold text-[var(--ui-muted)]">{item.value}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--ui-bg)]">
            <div className="h-full rounded-full bg-[var(--ui-blue)]" style={{ width: `${max === 0 ? 0 : Math.max(8, (item.value / max) * 100)}%` }} />
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
          className="w-full rounded-t-xl border border-[var(--ui-blue)]/30 bg-[var(--ui-blue)] shadow-[0_0_30px_rgba(0,153,255,0.18)]"
          style={{ height: `${max === 0 ? 4 : Math.max(10, (value / max) * 100)}%` }}
        />
      </div>
      <p className="text-center font-mono text-xs font-semibold text-[var(--ui-muted)]">{value}</p>
      <p className="text-center font-mono text-xs font-semibold text-[var(--ui-muted)]">{label}</p>
    </div>
  );
}

function AttentionStatus({ status }: { status: string }) {
  const paused = status === "paused_by_human";
  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 py-1 font-mono text-xs font-semibold capitalize ${
        paused ? "border-[#ff5530]/40 bg-[#ff5530]/10 text-[#ff5530]" : "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function MonitorEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg)] p-6 text-center">
      <BarChart3 aria-hidden="true" className="mx-auto h-5 w-5 text-[var(--ui-blue)]" />
      <p className="mt-3 text-base font-semibold text-[var(--ui-text)]">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--ui-muted)]">{description}</p>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ff5530]/40 bg-[#ff5530]/10 px-4 py-3 text-sm font-semibold text-[#ff5530]" role="alert">
      <AlertTriangle aria-hidden="true" className="h-5 w-5" />
      {message}
    </div>
  );
}

function maxValue(items: Array<{ value: number }>) {
  return Math.max(0, ...items.map((item) => item.value));
}
