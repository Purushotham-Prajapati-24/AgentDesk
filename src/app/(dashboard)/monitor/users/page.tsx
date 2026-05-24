"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, History, Search, UserRoundCheck } from "lucide-react";
import { getMonitorUsers, type MonitorUser } from "@/app/monitor-actions";
import { Button } from "@/components/ui/Button";
import { EmptyState, MetricTile, PageHeader, Panel, StatusPill } from "@/components/ui/Signal";
import { useTenant } from "@/context/TenantContext";

export default function MonitorUsersPage() {
  const { tenant } = useTenant();
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

  return (
    <div className="min-h-screen">
      <PageHeader
        kicker="Monitor / Users"
        title="Customer sessions with the right signals up front."
        description="Track end customers inferred from widget sessions, their last activity, message volume, and handoff state."
        action={<StatusPill tone="info">Read-only customer view</StatusPill>}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricTile label="Visible users" value={String(users.length)} detail={loading ? "loading window" : "session-derived customers"} tone="info" />
          <MetricTile label="Active or paused" value={String(activeUsers)} detail="customers still in motion" tone="warn" />
          <MetricTile label="Messages" value={String(totalMessages)} detail="in visible user rows" tone="hot" />
        </section>

        {error ? <div className="border border-border bg-destructive px-4 py-3 text-sm font-bold text-white">{error}</div> : null}

        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border bg-card-elevated p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="studio-kicker text-primary">Customer ledger</p>
              <h2 className="mt-1 text-2xl font-bold">End customers</h2>
            </div>
            <form className="flex min-w-0 gap-2 lg:w-[420px]" onSubmit={submitSearch}>
              <input
                className="min-h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary"
                placeholder="Search session, bot, status"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <Button aria-label="Search users" size="icon" type="submit" variant="secondary">
                <Search aria-hidden="true" className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {users.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title={loading ? "Loading customers" : "No customers found"}
                description="End-customer identities are inferred from persisted widget sessions in this tenant."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-card text-xs uppercase text-foreground">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Bots</th>
                    <th className="px-4 py-3">Latest message</th>
                    <th className="px-4 py-3 text-right">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr className="border-t border-border bg-card odd:bg-secondary/50" key={user.id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-accent">
                            <UserRoundCheck aria-hidden="true" className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-foreground">{user.sessionToken}</p>
                            <p className="mt-1 font-mono text-xs font-bold text-muted-foreground">first seen {formatDate(user.firstSeenAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill tone={user.paused > 0 ? "hot" : user.closed > 0 ? "dark" : "warn"}>
                          {user.lastStatus.replaceAll("_", " ")}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                          <History aria-hidden="true" className="h-4 w-4 text-primary" />
                          {formatDateTime(user.lastSeenAt)}
                        </div>
                        <p className="mt-1 font-mono text-xs font-bold text-muted-foreground">{user.conversations} conversation</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {(user.botIds.length ? user.botIds : ["unassigned"]).map((botId) => (
                            <StatusPill key={botId} tone="dark">
                              {botId}
                            </StatusPill>
                          ))}
                        </div>
                      </td>
                      <td className="max-w-[360px] px-4 py-4">
                        <p className="line-clamp-2 font-semibold leading-6 text-muted-foreground">{user.lastMessage}</p>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-lg font-bold text-foreground">{user.messages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border bg-card-elevated p-3">
            <Button disabled={cursorStack.length === 0 || loading} leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={previousPage} size="sm" type="button" variant="outline">
              Prev
            </Button>
            <StatusPill tone="dark">{loading ? "Loading" : `${users.length} rows`}</StatusPill>
            <Button disabled={!nextCursor || loading} rightIcon={<ChevronRight className="h-4 w-4" />} onClick={nextPage} size="sm" type="button" variant="outline">
              Next
            </Button>
          </div>
        </Panel>
      </div>
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
