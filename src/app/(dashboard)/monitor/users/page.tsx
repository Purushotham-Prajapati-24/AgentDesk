"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, History, Search, UserRoundCheck } from "lucide-react";
import { getMonitorUsers, type MonitorUser } from "@/app/monitor-actions";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/TenantContext";

export default function MonitorUsersPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [users, setUsers] = useState<MonitorUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let isActive = true;
    getMonitorUsers({ tenantId: tenant.$id, search, cursor }).then((response) => {
      if (!isActive) {
        return;
      }

      setLoading(false);
      if (!response.success) {
        setUsers([]);
        setNextCursor(null);
        setError(response.error);
        return;
      }

      setUsers(response.data.users);
      setNextCursor(response.data.nextCursor);
      setError("");
    });

    return () => {
      isActive = false;
    };
  }, [tenant?.$id, search, cursor]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCursor(null);
    setCursorStack([]);
    setLoading(true);
    setSearch(searchInput.trim());
  }

  function nextPage() {
    if (!nextCursor) {
      return;
    }
    setLoading(true);
    setCursorStack((current) => [...current, cursor ?? ""]);
    setCursor(nextCursor);
  }

  function previousPage() {
    setLoading(true);
    setCursorStack((current) => {
      const previous = [...current];
      const previousCursor = previous.pop() ?? "";
      setCursor(previousCursor || null);
      return previous;
    });
  }

  const activeUsers = users.filter((user) => user.active > 0 || user.paused > 0).length;
  const totalMessages = users.reduce((total, user) => total + user.messages, 0);
  const hasTenant = Boolean(tenant?.$id);
  const isUserLoading = hasTenant && loading;
  const initialLoading = tenantLoading || (isUserLoading && users.length === 0 && !error);

  if (initialLoading) {
    return <MonitorUsersPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <section className="grid gap-5 rounded-[2rem] border border-[#fb7185]/30 bg-[linear-gradient(135deg,#fff1f2_0%,#fce7f3_42%,#22c55e_100%)] p-5 text-[#3f0f1f] shadow-[0_24px_70px_rgba(251,113,133,0.14)] dark:bg-[linear-gradient(135deg,#240713_0%,#831843_46%,#166534_100%)] dark:text-[#fff1f2] lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
          <div className="min-w-0">
            <p className="studio-kicker text-[#be123c] dark:text-[#fecdd3]">Monitor / Users</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-current sm:text-5xl">
              Customer sessions with the right signals up front.
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 opacity-75">
              Track customers inferred from widget sessions, with last activity, message volume, agent scope, and handoff state in one ledger.
            </p>
          </div>
          <div className="grid content-between gap-4 rounded-3xl bg-[linear-gradient(135deg,#dcfce7_0%,#86efac_48%,#22c55e_100%)] p-5 text-[#052e16]">
            <div>
              <p className="font-mono text-xs font-semibold uppercase opacity-70">Read-only ledger</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Session-derived profiles</p>
            </div>
            <p className="text-sm font-medium leading-6 opacity-70">Useful for spotting returning customers and conversations still in motion.</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MonitorMetric label="Visible users" value={String(users.length)} detail={isUserLoading ? "loading window" : "session-derived customers"} tone="blue" />
          <MonitorMetric label="Active or paused" value={String(activeUsers)} detail="customers still in motion" tone="green" />
          <MonitorMetric label="Messages" value={String(totalMessages)} detail="in visible user rows" tone="coral" />
        </section>

        {error ? <ErrorNotice message={error} /> : null}

        <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
          <div className="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="studio-kicker text-[var(--ui-blue)]">Customer ledger</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">End customers</h2>
            </div>
            <form className="flex min-w-0 gap-2 sm:w-full lg:w-[420px]" onSubmit={submitSearch}>
              <input
                className="min-h-11 min-w-0 flex-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 text-sm font-semibold text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] transition focus:border-[var(--ui-blue)]"
                placeholder="Search session, agent, status"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <Button aria-label="Search users" className="rounded-full" size="icon" type="submit" variant="secondary">
                <Search aria-hidden="true" className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {isUserLoading ? (
            <UsersTableBodySkeleton />
          ) : users.length === 0 ? (
            <div className="p-5">
              <MonitorEmpty
                title={isUserLoading ? "Loading customers" : "No customers found"}
                description="End-customer identities are inferred from persisted widget sessions in this tenant."
              />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-[var(--ui-panel-2)] font-mono text-xs uppercase text-[var(--ui-muted)]">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">State</th>
                    <th className="px-5 py-3">Activity</th>
                    <th className="px-5 py-3">Agents</th>
                    <th className="px-5 py-3">Latest message</th>
                    <th className="px-5 py-3 text-right">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr className="border-t border-[var(--ui-border)] bg-[var(--ui-panel)] odd:bg-[var(--ui-bg)]" key={user.id}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ui-text)] text-[var(--ui-bg)]">
                            <UserRoundCheck aria-hidden="true" className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--ui-text)]">{user.sessionToken}</p>
                            <p className="mt-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">first seen {formatDate(user.firstSeenAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={user.lastStatus} paused={user.paused} closed={user.closed} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-semibold text-[var(--ui-muted)]">
                          <History aria-hidden="true" className="h-4 w-4 text-[var(--ui-blue)]" />
                          {formatDateTime(user.lastSeenAt)}
                        </div>
                        <p className="mt-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">{user.conversations} conversation</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="grid gap-2">
                          {(user.agents.length ? user.agents : [{ id: "unassigned", name: "Unassigned agent" }]).map((agent) => (
                            <span className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-3 py-2" key={agent.id}>
                              <span className="block truncate text-sm font-semibold text-[var(--ui-text)]">{agent.name}</span>
                              <span className="mt-1 block truncate font-mono text-xs font-semibold text-[var(--ui-muted)]">{agent.id}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="max-w-[360px] px-5 py-4">
                        <p className="line-clamp-2 font-medium leading-6 text-[var(--ui-muted)]">{user.lastMessage}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-lg font-semibold text-[var(--ui-text)]">{user.messages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3">
            <Button className="rounded-full" disabled={cursorStack.length === 0 || isUserLoading} leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={previousPage} size="sm" type="button" variant="outline">
              Prev
            </Button>
            <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">
              {isUserLoading ? "Loading" : `${users.length} rows`}
            </span>
            <Button className="rounded-full" disabled={!nextCursor || isUserLoading} rightIcon={<ChevronRight className="h-4 w-4" />} onClick={nextPage} size="sm" type="button" variant="outline">
              Next
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MonitorUsersPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <MonitorUsersHeroSkeleton />
        <MonitorMetricGridSkeleton />
        <UsersPanelSkeleton />
      </div>
    </div>
  );
}

function MonitorUsersHeroSkeleton() {
  return (
    <section className="grid gap-5 rounded-[2rem] border border-[#fb7185]/30 bg-[linear-gradient(135deg,#fff1f2_0%,#fce7f3_42%,#22c55e_100%)] p-5 text-[#3f0f1f] shadow-[0_24px_70px_rgba(251,113,133,0.14)] dark:bg-[linear-gradient(135deg,#240713_0%,#831843_46%,#166534_100%)] dark:text-[#fff1f2] lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
      <div className="min-w-0">
        <Skeleton className="h-3 w-32 bg-white/45 dark:bg-white/20" />
        <Skeleton className="mt-4 h-10 w-full max-w-2xl bg-white/50 dark:bg-white/20 sm:h-12" />
        <Skeleton className="mt-3 h-10 w-full max-w-xl bg-white/45 dark:bg-white/15 sm:h-12" />
        <div className="mt-5 grid max-w-2xl gap-2">
          <Skeleton className="h-4 w-full bg-white/40 dark:bg-white/15" />
          <Skeleton className="h-4 w-5/6 bg-white/40 dark:bg-white/15" />
        </div>
      </div>
      <div className="grid content-between gap-4 rounded-3xl bg-[linear-gradient(135deg,#dcfce7_0%,#86efac_48%,#22c55e_100%)] p-5">
        <div>
          <Skeleton className="h-3 w-32 bg-white/40" />
          <Skeleton className="mt-4 h-7 w-4/5 bg-white/45" />
          <Skeleton className="mt-2 h-7 w-3/5 bg-white/45" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-3 w-full bg-white/35" />
          <Skeleton className="h-3 w-2/3 bg-white/35" />
        </div>
      </div>
    </section>
  );
}

function MonitorMetricGridSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {["visible", "active", "messages"].map((item) => (
        <MonitorMetricSkeleton key={item} />
      ))}
    </section>
  );
}

function MonitorMetricSkeleton() {
  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-28 bg-[var(--ui-panel-2)]" />
        <Skeleton className="h-3 w-3 rounded-full bg-[var(--ui-panel-2)]" />
      </div>
      <Skeleton className="mt-5 h-10 w-20 bg-[var(--ui-panel-2)]" />
      <Skeleton className="mt-4 h-4 w-40 bg-[var(--ui-panel-2)]" />
    </article>
  );
}

function UsersPanelSkeleton() {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
      <div className="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Skeleton className="h-3 w-28 bg-[var(--ui-bg)]" />
          <Skeleton className="mt-3 h-7 w-48 bg-[var(--ui-bg)]" />
        </div>
        <div className="flex min-w-0 gap-2 sm:w-full lg:w-[420px]">
          <Skeleton className="h-11 min-w-0 flex-1 rounded-full bg-[var(--ui-bg)]" />
          <Skeleton className="h-11 w-11 rounded-full bg-[var(--ui-bg)]" />
        </div>
      </div>
      <UsersTableBodySkeleton />
      <div className="flex items-center justify-between gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3">
        <Skeleton className="h-9 w-24 rounded-full bg-[var(--ui-bg)]" />
        <Skeleton className="h-8 w-24 rounded-full bg-[var(--ui-bg)]" />
        <Skeleton className="h-9 w-24 rounded-full bg-[var(--ui-bg)]" />
      </div>
    </section>
  );
}

function UsersTableBodySkeleton() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1.1fr_1.4fr_0.5fr] gap-4 bg-[var(--ui-panel-2)] px-5 py-3">
          {["customer", "state", "activity", "agents", "message", "count"].map((item) => (
            <Skeleton className="h-3 w-20 bg-[var(--ui-bg)]" key={item} />
          ))}
        </div>
        <div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1.1fr_1.4fr_0.5fr] items-center gap-4 border-t border-[var(--ui-border)] bg-[var(--ui-panel)] px-5 py-4 odd:bg-[var(--ui-bg)]" key={index}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-[var(--ui-panel-2)]" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-4/5 bg-[var(--ui-panel-2)]" />
                  <Skeleton className="mt-2 h-3 w-2/3 bg-[var(--ui-panel-2)]" />
                </div>
              </div>
              <Skeleton className="h-7 w-24 rounded-full bg-[var(--ui-panel-2)]" />
              <div className="grid gap-2">
                <Skeleton className="h-4 w-32 bg-[var(--ui-panel-2)]" />
                <Skeleton className="h-3 w-24 bg-[var(--ui-panel-2)]" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full bg-[var(--ui-panel-2)]" />
                <Skeleton className="h-7 w-20 rounded-full bg-[var(--ui-panel-2)]" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-full bg-[var(--ui-panel-2)]" />
                <Skeleton className="h-4 w-4/5 bg-[var(--ui-panel-2)]" />
              </div>
              <Skeleton className="ml-auto h-7 w-10 bg-[var(--ui-panel-2)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonitorMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "blue" | "green" | "coral" }) {
  const toneClass = {
    blue: "bg-[var(--ui-blue)] text-white",
    green: "bg-[#22c55e]/15 text-[#22c55e]",
    coral: "bg-[#ff5530] text-white",
  }[tone];

  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">{label}</p>
        <span className={`h-3 w-3 rounded-full ${toneClass}`} />
      </div>
      <p className="mt-5 font-mono text-4xl font-semibold tracking-[-0.04em] text-[var(--ui-text)]">{value}</p>
      <p className="mt-3 text-sm font-medium text-[var(--ui-muted)]">{detail}</p>
    </article>
  );
}

function StatusBadge({ status, paused, closed }: { status: MonitorUser["lastStatus"]; paused: number; closed: number }) {
  const className =
    paused > 0
      ? "border-[#ff5530]/40 bg-[#ff5530]/10 text-[#ff5530]"
      : closed > 0
        ? "border-[var(--ui-border)] bg-[var(--ui-panel-2)] text-[var(--ui-muted)]"
        : "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e]";

  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 font-mono text-xs font-semibold capitalize ${className}`}>{status.replaceAll("_", " ")}</span>;
}

function MonitorEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg)] p-6 text-center">
      <UserRoundCheck aria-hidden="true" className="mx-auto h-5 w-5 text-[var(--ui-blue)]" />
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

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
