"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, Bot, ChevronLeft, ChevronRight, Headphones, MessageSquareText, Search, UserRound } from "lucide-react";
import {
  getMonitorConversationList,
  getMonitorConversationMessages,
  type MonitorConversation,
  type MonitorMessage,
  type MonitorSessionStatus,
} from "@/app/monitor-actions";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib/utils";

const statusOptions: Array<MonitorSessionStatus | "all"> = ["all", "active", "paused_by_human", "closed"];

export default function MonitorConversationsPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [conversations, setConversations] = useState<MonitorConversation[]>([]);
  const [messages, setMessages] = useState<MonitorMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<MonitorConversation | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MonitorSessionStatus | "all">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant?.$id) {
      setLoading(false);
      return;
    }

    let isActive = true;
    setLoading(true);
    getMonitorConversationList({ tenantId: tenant.$id, search, status, cursor }).then((response) => {
      if (!isActive) {
        return;
      }

      setLoading(false);
      if (!response.success) {
        setConversations([]);
        setNextCursor(null);
        setError(response.error);
        return;
      }

      setConversations(response.data.conversations);
      setNextCursor(response.data.nextCursor);
      setError("");
    });

    return () => {
      isActive = false;
    };
  }, [tenant?.$id, search, status, cursor]);

  async function selectConversation(conversation: MonitorConversation) {
    if (!tenant?.$id) {
      setError("Tenant context is not ready.");
      return;
    }

    setSelectedConversation(conversation);
    setMessageLoading(true);
    const response = await getMonitorConversationMessages({ tenantId: tenant.$id, sessionId: conversation.id });
    setMessageLoading(false);

    if (!response.success) {
      setMessages([]);
      setError(response.error);
      return;
    }

    setMessages(response.data.messages);
    setError("");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCursor(null);
    setCursorStack([]);
    setSelectedConversation(null);
    setMessages([]);
    setLoading(true);
    setSearch(searchInput.trim());
  }

  function updateStatus(nextStatus: MonitorSessionStatus | "all") {
    setLoading(true);
    setStatus(nextStatus);
    setCursor(null);
    setCursorStack([]);
    setSelectedConversation(null);
    setMessages([]);
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

  const activeCount = conversations.filter((conversation) => conversation.status === "active").length;
  const handoffCount = conversations.filter((conversation) => conversation.status === "paused_by_human").length;
  const totalMessages = conversations.reduce((total, conversation) => total + conversation.messageCount, 0);
  const initialLoading = tenantLoading || (loading && conversations.length === 0 && !error);

  if (initialLoading) {
    return <MonitorConversationsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <section className="grid gap-5 rounded-[2rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
          <div className="min-w-0">
            <p className="studio-kicker text-[var(--ui-blue)]">Monitor / Conversations</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ui-text)] sm:text-5xl">
              Watch every customer conversation as it unfolds.
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[var(--ui-muted)]">
              Search active sessions, read the full transcript, and quickly identify chats where automation needs human support.
            </p>
          </div>
          <div className="grid content-between gap-4 rounded-3xl bg-[linear-gradient(135deg,#e0f2fe_0%,#7dd3fc_48%,#0099ff_100%)] p-5 text-[#082f49]">
            <div>
              <p className="font-mono text-xs font-semibold uppercase opacity-70">Conversation desk</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Live review queue</p>
              <p className="mt-2 break-all font-mono text-xs font-semibold opacity-70">{tenant?.$id ?? "Tenant unavailable"}</p>
            </div>
            <p className="text-sm font-medium leading-6 opacity-70">Use filters to focus on open sessions, paused handoffs, or closed conversations without leaving the transcript view.</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MonitorMetric label="Visible conversations" value={String(conversations.length)} detail={loading ? "loading window" : "current result window"} tone="blue" />
          <MonitorMetric label="Active now" value={String(activeCount)} detail="automation still engaged" tone="green" />
          <MonitorMetric label="Human handoffs" value={String(handoffCount)} detail={`${totalMessages} messages visible`} tone="coral" />
        </section>

        {error ? <ErrorNotice message={error} /> : null}

        <div className="grid gap-5 xl:grid-cols-[410px_minmax(0,1fr)]">
          <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
            <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-4">
              <form className="flex gap-2" onSubmit={submitSearch}>
                <input
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 text-sm font-semibold text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] transition focus:border-[var(--ui-blue)]"
                  placeholder="Search session, agent, status"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <Button aria-label="Search conversations" className="rounded-full" size="icon" type="submit" variant="secondary">
                  <Search aria-hidden="true" className="h-4 w-4" />
                </Button>
              </form>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {statusOptions.map((item) => (
                  <button
                    className={cn(
                      "min-h-9 shrink-0 rounded-full border px-3 font-mono text-xs font-semibold capitalize transition",
                      status === item
                        ? "border-[var(--ui-blue)] bg-[var(--ui-blue)] text-white"
                        : "border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-muted)] hover:border-[var(--ui-blue)]/60 hover:text-[var(--ui-text)]",
                    )}
                    key={item}
                    onClick={() => updateStatus(item)}
                    type="button"
                  >
                    {item === "all" ? "all" : item.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid max-h-[520px] gap-2 overflow-y-auto p-3 lg:max-h-[720px]">
              {loading ? (
                <ConversationListRowsSkeleton />
              ) : conversations.length === 0 ? (
                <MonitorEmpty
                  title={loading ? "Loading conversations" : "No conversations found"}
                  description="Customer widget sessions matching the current filters will appear here."
                />
              ) : (
                conversations.map((conversation) => (
                  <button
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition duration-200 ease-out hover:-translate-y-0.5",
                      selectedConversation?.id === conversation.id
                        ? "border-[var(--ui-blue)] bg-[var(--ui-blue)]/10"
                        : "border-[var(--ui-border)] bg-[var(--ui-bg)] hover:border-[var(--ui-blue)]/50",
                    )}
                    key={conversation.id}
                    onClick={() => void selectConversation(conversation)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[var(--ui-text)]">{conversation.sessionToken}</p>
                        <p className="mt-1 truncate font-mono text-xs font-semibold text-[var(--ui-muted)]">{conversation.botId || "unassigned agent"}</p>
                      </div>
                      <MonitorStatus status={conversation.status} />
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm font-medium leading-6 text-[var(--ui-muted)]">{conversation.lastMessage}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-xs font-semibold text-[var(--ui-muted)]">{conversation.messageCount} messages</span>
                      <span className="font-mono text-xs font-semibold text-[var(--ui-muted)]">{formatDate(conversation.updatedAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3">
              <Button className="rounded-full" disabled={cursorStack.length === 0 || loading} leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={previousPage} size="sm" type="button" variant="outline">
                Prev
              </Button>
              <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">
                {loading ? "Loading" : `${conversations.length} rows`}
              </span>
              <Button className="rounded-full" disabled={!nextCursor || loading} rightIcon={<ChevronRight className="h-4 w-4" />} onClick={nextPage} size="sm" type="button" variant="outline">
                Next
              </Button>
            </div>
          </section>

          <section className="flex h-[620px] min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] lg:h-[720px]">
            <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-4">
              {selectedConversation ? (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="studio-kicker text-[var(--ui-blue)]">Transcript</p>
                    <h2 className="mt-1 break-all text-2xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">{selectedConversation.sessionToken}</h2>
                    <p className="mt-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">{selectedConversation.botId || "unassigned agent"}</p>
                  </div>
                  <MonitorStatus status={selectedConversation.status} />
                </div>
              ) : (
                <div>
                  <p className="studio-kicker text-[var(--ui-blue)]">Transcript</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Select a conversation</h2>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[var(--ui-bg)] p-4">
              {!selectedConversation ? (
                <MonitorEmpty title="No transcript selected" description="Choose a conversation from the monitor list to inspect the full message flow." />
              ) : messageLoading ? (
                <TranscriptMessagesSkeleton />
              ) : messages.length === 0 ? (
                <MonitorEmpty title="No messages recorded" description="This session exists, but no messages have been persisted yet." />
              ) : (
                messages.map((message) => <MessageBubble key={message.id} message={message} />)
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MonitorConversationsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <MonitorHeroSkeleton />
        <MonitorMetricGridSkeleton />
        <div className="grid gap-5 xl:grid-cols-[410px_minmax(0,1fr)]">
          <ConversationPanelSkeleton />
          <TranscriptPanelSkeleton />
        </div>
      </div>
    </div>
  );
}

function MonitorHeroSkeleton() {
  return (
    <section className="grid gap-5 rounded-[2rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
      <div className="min-w-0">
        <Skeleton className="h-3 w-40 bg-[var(--ui-panel-2)]" />
        <Skeleton className="mt-4 h-10 w-full max-w-2xl bg-[var(--ui-panel-2)] sm:h-12" />
        <Skeleton className="mt-3 h-10 w-full max-w-xl bg-[var(--ui-panel-2)] sm:h-12" />
        <div className="mt-5 grid max-w-2xl gap-2">
          <Skeleton className="h-4 w-full bg-[var(--ui-panel-2)]" />
          <Skeleton className="h-4 w-4/5 bg-[var(--ui-panel-2)]" />
        </div>
      </div>
      <div className="grid content-between gap-4 rounded-3xl bg-[linear-gradient(135deg,#e0f2fe_0%,#7dd3fc_48%,#0099ff_100%)] p-5">
        <div>
          <Skeleton className="h-3 w-28 bg-white/40" />
          <Skeleton className="mt-4 h-6 w-full bg-white/45" />
          <Skeleton className="mt-2 h-6 w-3/4 bg-white/45" />
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
      {["visible", "active", "handoff"].map((item) => (
        <MonitorMetricSkeleton key={item} />
      ))}
    </section>
  );
}

function MonitorMetricSkeleton() {
  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-32 bg-[var(--ui-panel-2)]" />
        <Skeleton className="h-3 w-3 rounded-full bg-[var(--ui-panel-2)]" />
      </div>
      <Skeleton className="mt-5 h-10 w-20 bg-[var(--ui-panel-2)]" />
      <Skeleton className="mt-4 h-4 w-36 bg-[var(--ui-panel-2)]" />
    </article>
  );
}

function ConversationPanelSkeleton() {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
      <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-4">
        <div className="flex gap-2">
          <Skeleton className="h-11 min-w-0 flex-1 rounded-full bg-[var(--ui-bg)]" />
          <Skeleton className="h-11 w-11 rounded-full bg-[var(--ui-bg)]" />
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden pb-1">
          {["all", "active", "paused", "closed"].map((item) => (
            <Skeleton className="h-9 w-24 shrink-0 rounded-full bg-[var(--ui-bg)]" key={item} />
          ))}
        </div>
      </div>
      <div className="grid max-h-[520px] gap-2 overflow-hidden p-3 lg:max-h-[720px]">
        <ConversationListRowsSkeleton />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3">
        <Skeleton className="h-9 w-24 rounded-full bg-[var(--ui-bg)]" />
        <Skeleton className="h-8 w-24 rounded-full bg-[var(--ui-bg)]" />
        <Skeleton className="h-9 w-24 rounded-full bg-[var(--ui-bg)]" />
      </div>
    </section>
  );
}

function ConversationListRowsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <article className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4" key={index}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-4/5 bg-[var(--ui-panel-2)]" />
              <Skeleton className="mt-2 h-3 w-2/5 bg-[var(--ui-panel-2)]" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full bg-[var(--ui-panel-2)]" />
          </div>
          <div className="mt-4 grid gap-2">
            <Skeleton className="h-4 w-full bg-[var(--ui-panel-2)]" />
            <Skeleton className="h-4 w-3/4 bg-[var(--ui-panel-2)]" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-24 bg-[var(--ui-panel-2)]" />
            <Skeleton className="h-3 w-20 bg-[var(--ui-panel-2)]" />
          </div>
        </article>
      ))}
    </>
  );
}

function TranscriptPanelSkeleton() {
  return (
    <section className="flex h-[620px] min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] lg:h-[720px]">
      <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-4">
        <Skeleton className="h-3 w-24 bg-[var(--ui-bg)]" />
        <Skeleton className="mt-3 h-7 w-64 max-w-full bg-[var(--ui-bg)]" />
        <Skeleton className="mt-2 h-3 w-36 bg-[var(--ui-bg)]" />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-hidden bg-[var(--ui-bg)] p-4">
        <TranscriptMessagesSkeleton />
      </div>
    </section>
  );
}

function TranscriptMessagesSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div className={cn("flex", index % 3 === 0 ? "justify-start" : "justify-end")} key={index}>
          <article className="w-[92%] rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-3 sm:w-[72%]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-24 bg-[var(--ui-panel-2)]" />
              <Skeleton className="h-4 w-4 rounded-full bg-[var(--ui-panel-2)]" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-full bg-[var(--ui-panel-2)]" />
              <Skeleton className="h-4 w-4/5 bg-[var(--ui-panel-2)]" />
            </div>
            <Skeleton className="mt-4 h-3 w-20 bg-[var(--ui-panel-2)]" />
          </article>
        </div>
      ))}
    </>
  );
}

function MonitorMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "blue" | "green" | "coral" }) {
  const toneClass = {
    blue: "bg-[var(--ui-blue)] text-white",
    green: "bg-[#22c55e]/15 text-[#22c55e]",
    coral: "bg-[#ff5530] text-white",
  }[tone];
  const dotClass = {
    blue: "bg-[var(--ui-blue)]",
    green: "bg-[#86efac] shadow-[0_0_16px_rgba(134,239,172,0.75)]",
    coral: "bg-[#ff5530]",
  }[tone];

  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">{label}</p>
        {tone === "green" ? (
          <span aria-label="Active signal" className="relative flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#86efac] opacity-60" />
            <span className={`relative inline-flex h-3 w-3 rounded-full ${dotClass}`} />
          </span>
        ) : (
          <span className={`h-3 w-3 rounded-full ${dotClass}`} />
        )}
      </div>
      <p className="mt-5 font-mono text-4xl font-semibold tracking-[-0.04em] text-[var(--ui-text)]">{value}</p>
      <p className="mt-3 text-sm font-medium text-[var(--ui-muted)]">{detail}</p>
    </article>
  );
}

function MessageBubble({ message }: { message: MonitorMessage }) {
  const isCustomer = message.sender === "customer";
  const Icon = message.sender === "bot" ? Bot : message.sender === "agent" ? Headphones : UserRound;

  return (
    <div className={cn("flex", isCustomer ? "justify-start" : "justify-end")}>
      <article className={messageClass(message.sender)}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase">
            <Icon aria-hidden="true" className="h-4 w-4" />
            {senderLabel(message.sender)}
          </span>
          <MessageSquareText aria-hidden="true" className="h-4 w-4 opacity-70" />
        </div>
        <p className="text-sm font-medium leading-6">{message.content}</p>
        <time className="mt-3 block font-mono text-xs font-semibold opacity-75">{formatTime(message.createdAt)}</time>
      </article>
    </div>
  );
}

function messageClass(sender: MonitorMessage["sender"]) {
  if (sender === "agent") {
    return "max-w-[92%] overflow-hidden break-words rounded-2xl border border-[var(--ui-blue)] bg-[var(--ui-blue)] px-4 py-3 text-white shadow-[0_18px_36px_rgba(0,0,0,0.22)] sm:max-w-[82%]";
  }

  if (sender === "bot") {
    return "max-w-[92%] overflow-hidden break-words rounded-2xl border border-[#22c55e]/40 bg-[#22c55e]/10 px-4 py-3 text-[var(--ui-text)] sm:max-w-[82%]";
  }

  return "max-w-[92%] overflow-hidden break-words rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-3 text-[var(--ui-text)] sm:max-w-[82%]";
}

function MonitorStatus({ status }: { status: MonitorSessionStatus }) {
  return <span className={statusClass(status)}>{status.replaceAll("_", " ")}</span>;
}

function statusClass(status: MonitorSessionStatus) {
  if (status === "paused_by_human") {
    return "inline-flex min-h-7 items-center rounded-full border border-[#ff5530]/40 bg-[#ff5530]/10 px-2.5 py-1 font-mono text-xs font-semibold capitalize text-[#ff5530]";
  }

  if (status === "closed") {
    return "inline-flex min-h-7 items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-2.5 py-1 font-mono text-xs font-semibold capitalize text-[var(--ui-muted)]";
  }

  return "inline-flex min-h-7 items-center rounded-full border border-[#22c55e]/40 bg-[#22c55e]/10 px-2.5 py-1 font-mono text-xs font-semibold capitalize text-[#22c55e]";
}

function MonitorEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--ui-border)] bg-[var(--ui-panel)] p-6 text-center">
      <MessageSquareText aria-hidden="true" className="mx-auto h-5 w-5 text-[var(--ui-blue)]" />
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

function senderLabel(sender: MonitorMessage["sender"]) {
  return sender === "bot" ? "automation" : sender;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
}
