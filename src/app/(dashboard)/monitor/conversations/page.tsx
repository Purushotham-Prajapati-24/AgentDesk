"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Headphones, MessageSquareText, Search, UserRound } from "lucide-react";
import {
  getMonitorConversationList,
  getMonitorConversationMessages,
  type MonitorConversation,
  type MonitorMessage,
  type MonitorSessionStatus,
} from "@/app/monitor-actions";
import { Button } from "@/components/ui/Button";
import { EmptyState, MetricTile, PageHeader, Panel, StatusPill } from "@/components/ui/Signal";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib/utils";

const statusOptions: Array<MonitorSessionStatus | "all"> = ["all", "active", "paused_by_human", "closed"];

export default function MonitorConversationsPage() {
  const { tenant } = useTenant();
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
      return;
    }

    let isActive = true;
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

  return (
    <div className="min-h-screen">
      <PageHeader
        kicker="Monitor / Conversations"
        title="Live conversation control without losing context."
        description="Review tenant-scoped sessions, inspect transcripts, and identify handoffs that need operator attention."
        action={<StatusPill tone="info">Tenant: {tenant?.$id ?? "Unavailable"}</StatusPill>}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricTile label="Visible conversations" value={String(conversations.length)} detail={loading ? "loading window" : "current result window"} tone="info" />
          <MetricTile label="Active now" value={String(activeCount)} detail="automation still engaged" tone="warn" />
          <MetricTile label="Human handoffs" value={String(handoffCount)} detail={`${totalMessages} messages visible`} tone="hot" />
        </section>

        {error ? <div className="border border-border bg-destructive px-4 py-3 text-sm font-bold text-white">{error}</div> : null}

        <div className="grid gap-5 xl:grid-cols-[410px_minmax(0,1fr)]">
          <Panel className="min-w-0 overflow-hidden">
            <div className="border-b border-border bg-card-elevated p-4">
              <form className="flex gap-2" onSubmit={submitSearch}>
                <input
                  className="min-h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary"
                  placeholder="Search session, bot, status"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <Button aria-label="Search conversations" size="icon" type="submit" variant="secondary">
                  <Search aria-hidden="true" className="h-4 w-4" />
                </Button>
              </form>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {statusOptions.map((item) => (
                  <button
                    className={cn(
                      "min-h-9 shrink-0 rounded-full border px-3 font-mono text-xs font-semibold transition",
                      status === item
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
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
              {conversations.length === 0 ? (
                <EmptyState
                  title={loading ? "Loading conversations" : "No conversations found"}
                  description="Customer widget sessions matching the current filters will appear here."
                />
              ) : (
                conversations.map((conversation) => (
                  <button
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition hover:-translate-y-0.5",
                      selectedConversation?.id === conversation.id ? "border-primary/70 bg-primary/10" : "border-border bg-secondary/50",
                    )}
                    key={conversation.id}
                    onClick={() => void selectConversation(conversation)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-foreground">{conversation.sessionToken}</p>
                        <p className="mt-1 truncate font-mono text-xs font-bold text-muted-foreground">{conversation.botId || "unassigned bot"}</p>
                      </div>
                      <StatusPill tone={statusTone(conversation.status)}>{conversation.status.replaceAll("_", " ")}</StatusPill>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-muted-foreground">{conversation.lastMessage}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{conversation.messageCount} messages</span>
                      <span className="font-mono text-xs font-bold text-muted-foreground">{formatDate(conversation.updatedAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card-elevated p-3">
              <Button disabled={cursorStack.length === 0 || loading} leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={previousPage} size="sm" type="button" variant="outline">
                Prev
              </Button>
              <StatusPill tone="dark">{loading ? "Loading" : `${conversations.length} rows`}</StatusPill>
              <Button disabled={!nextCursor || loading} rightIcon={<ChevronRight className="h-4 w-4" />} onClick={nextPage} size="sm" type="button" variant="outline">
                Next
              </Button>
            </div>
          </Panel>

          <Panel className="flex min-h-[520px] min-w-0 flex-col overflow-hidden lg:min-h-[760px]">
            <div className="border-b border-border bg-primary/10 p-4">
              {selectedConversation ? (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="studio-kicker text-primary">Transcript</p>
                    <h2 className="mt-1 break-all text-2xl font-bold">{selectedConversation.sessionToken}</h2>
                    <p className="mt-1 font-mono text-xs font-bold text-muted-foreground">{selectedConversation.botId || "unassigned bot"}</p>
                  </div>
                  <StatusPill tone={statusTone(selectedConversation.status)}>{selectedConversation.status.replaceAll("_", " ")}</StatusPill>
                </div>
              ) : (
                <div>
                  <p className="studio-kicker text-primary">Transcript</p>
                  <h2 className="mt-1 text-2xl font-bold">Select a conversation</h2>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-secondary/50 p-4">
              {!selectedConversation ? (
                <EmptyState title="No transcript selected" description="Choose a conversation from the monitor list to inspect the full message flow." />
              ) : messageLoading ? (
                <EmptyState title="Loading transcript" description="Fetching tenant-scoped conversation messages." />
              ) : messages.length === 0 ? (
                <EmptyState title="No messages recorded" description="This session exists, but no messages have been persisted yet." />
              ) : (
                messages.map((message) => <MessageBubble key={message.id} message={message} />)
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MonitorMessage }) {
  const isCustomer = message.sender === "customer";
  const Icon = message.sender === "bot" ? Bot : message.sender === "agent" ? Headphones : UserRound;

  return (
    <div className={cn("flex", isCustomer ? "justify-start" : "justify-end")}>
      <article className={messageClass(message.sender)}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase">
            <Icon aria-hidden="true" className="h-4 w-4" />
            {message.sender}
          </span>
          <MessageSquareText aria-hidden="true" className="h-4 w-4 opacity-70" />
        </div>
        <p className="text-sm font-semibold leading-6">{message.content}</p>
        <time className="mt-3 block font-mono text-xs font-bold opacity-75">{formatTime(message.createdAt)}</time>
      </article>
    </div>
  );
}

function messageClass(sender: MonitorMessage["sender"]) {
  if (sender === "agent") {
    return "max-w-[92%] overflow-hidden break-words rounded-lg border border-primary/50 bg-primary px-4 py-3 text-primary-foreground shadow-[0_18px_36px_rgba(0,0,0,0.28)] sm:max-w-[82%]";
  }

  if (sender === "bot") {
    return "max-w-[92%] overflow-hidden break-words rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-foreground shadow-[0_18px_36px_rgba(0,0,0,0.22)] sm:max-w-[82%]";
  }

  return "max-w-[92%] overflow-hidden break-words rounded-lg border border-border bg-card px-4 py-3 text-foreground shadow-[0_18px_36px_rgba(0,0,0,0.2)] sm:max-w-[82%]";
}

function statusTone(status: MonitorSessionStatus) {
  return status === "paused_by_human" ? "hot" : status === "closed" ? "dark" : "warn";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
}
