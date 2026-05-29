"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Headphones, Radio, Search, Send, UserRound } from "lucide-react";
import { io, Socket } from "socket.io-client";
import {
  listConversationMessages,
  listConversationSessions,
  type ConversationSummary,
} from "@/app/inbox-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/ui/Signal";
import { useTenant } from "@/context/TenantContext";
import { getClientWebSocketUrl } from "@/lib/websocket-url";

type Sender = "customer" | "bot" | "agent";
type SessionStatus = "active" | "paused_by_human" | "closed";

type Room = {
  tenantId: string;
  sessionId: string;
};

type ChatMessage = {
  id: string;
  sender: Sender;
  content: string;
  createdAt: string;
  shouldCallRag?: boolean;
};

type SessionState = {
  tenant_id: string;
  session_id: string;
  status: SessionStatus;
  updated_by: string;
  updated_at: string;
};

type SocketEventMessage = {
  message_id: string;
  sender: Sender;
  content: string;
  created_at: string;
  should_call_rag?: boolean;
};

type AckResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
    };

const WEB_SOCKET_URL = getClientWebSocketUrl();
const WEB_SOCKET_CONFIG_ERROR = "Live handoff is not configured. Set NEXT_PUBLIC_WEBSOCKET_URL to your Socket.IO service URL.";
const DEFAULT_ROOM: Room = {
  tenantId: "tenant_demo",
  sessionId: "session_demo",
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "seed-1",
    sender: "customer",
    content: "Hi, I need help with order A123.",
    createdAt: new Date().toISOString(),
    shouldCallRag: true,
  },
  {
    id: "seed-2",
    sender: "bot",
    content: "I can help with that. Please share the email used for the order.",
    createdAt: new Date().toISOString(),
  },
];

export default function InboxPage() {
  const { tenant } = useTenant();
  const [room, setRoom] = useState<Room>(DEFAULT_ROOM);
  const [draftRoom, setDraftRoom] = useState<Room>(DEFAULT_ROOM);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">(WEB_SOCKET_URL ? "connecting" : "disconnected");
  const [wakingUp, setWakingUp] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("active");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [agentDraft, setAgentDraft] = useState("");
  const [error, setError] = useState<string | null>(WEB_SOCKET_URL ? null : WEB_SOCKET_CONFIG_ERROR);
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyCursorStack, setHistoryCursorStack] = useState<string[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!WEB_SOCKET_URL) {
      return;
    }

    const wsUrl = WEB_SOCKET_URL;
    const abortController = new AbortController();
    let socket: Socket | null = null;
    let disposed = false;

    async function connectWhenHealthy() {
      // Render free-tier services spin down after inactivity.
      // Retry the health check for up to ~40 s before giving up.
      const MAX_RETRIES = 8;
      let healthy = false;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (disposed) return;
        healthy = await checkLiveHandoffHealth(wsUrl, abortController.signal);
        if (healthy) break;
        if (attempt === 0) {
          // First failure — show the waking-up banner, not the hard error.
          setWakingUp(true);
          setError(null);
        }
        if (attempt < MAX_RETRIES - 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, 5000));
        }
      }

      setWakingUp(false);
      if (disposed) return;

      if (!healthy) {
        setSocketStatus("disconnected");
        setError(`Live handoff server is unavailable at ${wsUrl}. Start the WebSocket service or update NEXT_PUBLIC_WEBSOCKET_URL.`);
        return;
      }

      const namespace = `${wsUrl}/tenant-${room.tenantId}`;
      socket = io(namespace, {
        auth: {
          tenant_id: room.tenantId,
          session_id: room.sessionId,
        },
        reconnectionAttempts: 5,
        timeout: 8000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setSocketStatus("connected");
        setError(null);
      });
      socket.on("disconnect", () => {
        setSocketStatus("disconnected");
      });
      socket.on("connect_error", (connectionError) => {
        setSocketStatus("disconnected");
        setError(`Unable to connect to the live handoff server at ${wsUrl}. ${connectionError.message}`);
      });
      socket.on("session-state", (state: SessionState) => setSessionStatus(state.status));
      socket.on("bot-status-toggle", (state: SessionState) => setSessionStatus(state.status));
      socket.on("customer-message", (message: SocketEventMessage) => {
        appendMessage(setMessages, mapSocketMessage(message));
      });
      socket.on("agent-message", (message: SocketEventMessage) => {
        appendMessage(setMessages, mapSocketMessage(message));
      });
      socket.on("server-error", (response: AckResponse<never>) => {
        if (!response.success) {
          setError(response.error.message);
        }
      });
    }

    void connectWhenHealthy();

    return () => {
      disposed = true;
      abortController.abort();
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [room]);

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let isActive = true;
    listConversationSessions({
      tenantId: tenant.$id,
      search: historySearch,
      cursor: historyCursor,
    }).then((response) => {
      if (!isActive) {
        return;
      }

      setHistoryLoading(false);
      if (response.success) {
        setHistory(response.data.sessions);
        setHistoryNextCursor(response.data.nextCursor);
      } else {
        setHistory([]);
        setHistoryNextCursor(null);
        setError(response.error);
      }
    });

    return () => {
      isActive = false;
    };
  }, [tenant?.$id, historySearch, historyCursor]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function updateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSafeId(draftRoom.tenantId) || !isSafeId(draftRoom.sessionId)) {
      setError("Tenant and session IDs must be 3-120 characters using letters, numbers, underscores, or hyphens.");
      return;
    }
    setMessages([]);
    setSelectedConversationId(null);
    setSocketStatus(WEB_SOCKET_URL ? "connecting" : "disconnected");
    setError(WEB_SOCKET_URL ? null : WEB_SOCKET_CONFIG_ERROR);
    setRoom(draftRoom);
  }

  function searchHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHistoryLoading(true);
    setHistoryCursor(null);
    setHistoryCursorStack([]);
    setHistorySearch(historySearchInput.trim());
  }

  function nextHistoryPage() {
    if (!historyNextCursor) {
      return;
    }

    setHistoryLoading(true);
    setHistoryCursorStack((current) => [...current, historyCursor ?? ""]);
    setHistoryCursor(historyNextCursor);
  }

  function previousHistoryPage() {
    setHistoryLoading(true);
    setHistoryCursorStack((current) => {
      const previous = [...current];
      const cursor = previous.pop() ?? "";
      setHistoryCursor(cursor || null);
      return previous;
    });
  }

  async function selectConversation(conversation: ConversationSummary) {
    if (!tenant?.$id) {
      setError("Tenant context is not ready.");
      return;
    }

    setSelectedConversationId(conversation.id);
    setSessionStatus(conversation.status);
    setDraftRoom({ tenantId: conversation.tenantId, sessionId: conversation.sessionToken });
    setRoom({ tenantId: conversation.tenantId, sessionId: conversation.sessionToken });
    setSocketStatus(WEB_SOCKET_URL ? "connecting" : "disconnected");
    setError(WEB_SOCKET_URL ? null : WEB_SOCKET_CONFIG_ERROR);

    const response = await listConversationMessages({
      tenantId: tenant.$id,
      sessionId: conversation.id,
    });

    if (!response.success) {
      setMessages([]);
      setError(response.error);
      return;
    }

    setMessages(
      response.data.messages.map((message) => ({
        id: message.id,
        sender: message.sender,
        content: message.content,
        createdAt: message.createdAt,
      })),
    );
  }

  async function toggleTakeover() {
    const nextStatus: SessionStatus = sessionStatus === "paused_by_human" ? "active" : "paused_by_human";
    const response = await emitWithAck<SessionState>("bot-status-toggle", {
      status: nextStatus,
      updated_by: "dashboard_agent",
    });

    if (!response.success) {
      setError(response.error.message);
      return;
    }

    setSessionStatus(response.data.status);
    setError(null);
  }

  async function sendAgentMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = agentDraft.trim();
    if (!content || sessionStatus !== "paused_by_human") {
      return;
    }

    const response = await emitWithAck<SocketEventMessage>("agent-message", { content });
    if (!response.success) {
      setError(response.error.message);
      return;
    }

    appendMessage(setMessages, mapSocketMessage(response.data));
    setAgentDraft("");
    setError(null);
  }

  async function emitWithAck<T>(event: string, payload: Record<string, string>) {
    const socket = socketRef.current;
    if (!socket?.connected) {
      return {
        success: false,
        error: { code: "SOCKET_DISCONNECTED", message: "Live server is not connected." },
      } satisfies AckResponse<T>;
    }

    return new Promise<AckResponse<T>>((resolve) => {
      socket.timeout(4000).emit(event, payload, (timeoutError: Error | null, response: AckResponse<T>) => {
        if (timeoutError) {
          resolve({
            success: false,
            error: { code: "ACK_TIMEOUT", message: "Live server did not acknowledge the action." },
          });
          return;
        }

        resolve(response);
      });
    });
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        kicker="Live operations"
        title="Inbox with the kill switch in reach."
        description="Monitor a tenant-scoped session, pause the AI, and respond as the human operator without losing conversation context."
        action={<ConnectionBadge status={socketStatus} />}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[330px_minmax(0,1fr)] lg:px-8">
        <aside className="grid min-w-0 gap-5">
          <Panel className="p-4">
            <form className="grid gap-3" onSubmit={updateRoom}>
              <Input
                label="Tenant"
                value={draftRoom.tenantId}
                onChange={(event) => setDraftRoom((current) => ({ ...current, tenantId: event.target.value }))}
              />
              <Input
                label="Session"
                value={draftRoom.sessionId}
                onChange={(event) => setDraftRoom((current) => ({ ...current, sessionId: event.target.value }))}
              />
              <Button size="sm" type="submit" variant="secondary">
                Connect
              </Button>
            </form>
          </Panel>

          <Panel className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Conversation history</h2>
              <StatusPill tone="dark">{historyLoading ? "..." : history.length}</StatusPill>
            </div>

            <form className="mb-4 flex gap-2" onSubmit={searchHistory}>
              <input
                className="min-h-10 min-w-0 flex-1 border border-border bg-card px-3 text-sm font-bold focus:bg-secondary/60"
                placeholder="Search session, bot, status"
                value={historySearchInput}
                onChange={(event) => setHistorySearchInput(event.target.value)}
              />
              <Button aria-label="Search history" size="sm" type="submit" variant="secondary">
                <Search aria-hidden="true" className="h-4 w-4" />
              </Button>
            </form>

            <div className="grid gap-2">
              {history.length === 0 ? (
                <EmptyState title="No stored conversations" description="Persisted widget sessions will appear here after customers chat." />
              ) : (
                history.map((conversation) => (
                  <button
                    className={`transition hover:-translate-y-0.5 w-full border p-4 text-left ${
                      selectedConversationId === conversation.id ? "border-primary/70 bg-primary/10" : "border-border bg-secondary/60"
                    }`}
                    key={conversation.id}
                    onClick={() => void selectConversation(conversation)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-foreground">{conversation.sessionToken}</p>
                        <p className="mt-1 truncate font-mono text-xs font-bold text-muted-foreground">{conversation.botId}</p>
                      </div>
                      <Headphones aria-hidden="true" className="h-6 w-6 text-primary" />
                    </div>
                    <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-muted-foreground">{conversation.lastMessage}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <StatusPill tone={conversation.status === "paused_by_human" ? "hot" : conversation.status === "closed" ? "dark" : "warn"}>
                        {conversation.status}
                      </StatusPill>
                      <span className="font-mono text-xs font-bold text-muted-foreground">{conversation.messageCount} messages</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                disabled={historyCursorStack.length === 0 || historyLoading}
                leftIcon={<ChevronLeft aria-hidden="true" className="h-4 w-4" />}
                onClick={previousHistoryPage}
                size="sm"
                type="button"
                variant="outline"
              >
                Prev
              </Button>
              <Button
                disabled={!historyNextCursor || historyLoading}
                rightIcon={<ChevronRight aria-hidden="true" className="h-4 w-4" />}
                onClick={nextHistoryPage}
                size="sm"
                type="button"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </Panel>
        </aside>

        <Panel className="flex min-h-[520px] min-w-0 flex-col overflow-hidden lg:min-h-[700px]">
          <div className="flex flex-col gap-3 border-b border-border bg-primary/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Conversation</h2>
              <p className="mt-1 break-all font-mono text-xs font-bold text-muted-foreground">
                {room.tenantId} / {room.sessionId}
              </p>
            </div>

            <Button
              className="w-full sm:w-auto"
              type="button"
              variant={sessionStatus === "paused_by_human" ? "primary" : "danger"}
              onClick={() => void toggleTakeover()}
              disabled={socketStatus !== "connected"}
            >
              {sessionStatus === "paused_by_human" ? "Resume AI" : "Pause AI / Take Over"}
            </Button>
          </div>

          {wakingUp && !error ? (
            <div className="border-b border-border bg-amber-500/20 px-4 py-3 text-sm font-bold text-amber-400">
              ⏳ Waking up the live handoff server (Render cold start) — this takes ~30 s…
            </div>
          ) : error ? (
            <div className="border-b border-border bg-destructive px-4 py-3 text-sm font-bold text-white">{error}</div>
          ) : null}

          <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto bg-secondary/60 px-4 py-5">
            {messages.length === 0 ? (
              <EmptyState title="Waiting for live messages" description="Connect a tenant-scoped session to watch support traffic in real time." />
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
          </div>

          <form className="border-t border-border bg-card p-4" onSubmit={(event) => void sendAgentMessage(event)}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="min-h-12 flex-1 border border-border bg-card px-3 text-sm font-bold focus:bg-secondary/60 disabled:cursor-not-allowed disabled:bg-secondary/60"
                disabled={sessionStatus !== "paused_by_human" || socketStatus !== "connected"}
                maxLength={4000}
                placeholder={sessionStatus === "paused_by_human" ? "Reply as the human agent..." : "Pause AI to unlock manual replies"}
                value={agentDraft}
                onChange={(event) => setAgentDraft(event.target.value)}
              />
              <Button
                disabled={sessionStatus !== "paused_by_human" || socketStatus !== "connected" || !agentDraft.trim()}
                rightIcon={<Send aria-hidden="true" className="h-4 w-4" />}
                type="submit"
              >
                Send
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isCustomer = message.sender === "customer";
  const isAgent = message.sender === "agent";
  const Icon = message.sender === "bot" ? Bot : message.sender === "agent" ? Headphones : UserRound;

  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
      <article className={messageBubbleClass(message.sender)}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase">
            <Icon aria-hidden="true" className="h-4 w-4" />
            {message.sender}
          </span>
          {typeof message.shouldCallRag === "boolean" ? (
            <span className="font-mono text-xs font-bold">{message.shouldCallRag ? "RAG active" : "AI bypassed"}</span>
          ) : null}
        </div>
        <p className="text-sm font-semibold leading-6">{message.content}</p>
        <time className={`mt-3 block font-mono text-xs font-bold ${isAgent ? "text-white/80" : "text-muted-foreground"}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </time>
      </article>
    </div>
  );
}

function ConnectionBadge({ status }: { status: "connecting" | "connected" | "disconnected" }) {
  const label = status === "connected" ? "Connected" : status === "connecting" ? "Connecting" : "Offline";
  const tone = status === "connected" ? "warn" : status === "connecting" ? "hot" : "danger";

  return (
    <StatusPill tone={tone}>
      <span className="inline-flex items-center gap-2">
        <Radio aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </span>
    </StatusPill>
  );
}

function messageBubbleClass(sender: Sender) {
  if (sender === "agent") {
    return "max-w-[92%] overflow-hidden rounded-[18px] border border-primary/50 bg-primary px-4 py-3 text-primary-foreground shadow-[0_18px_36px_rgba(0,0,0,0.28)] break-words sm:max-w-[82%]";
  }

  if (sender === "bot") {
    return "max-w-[92%] overflow-hidden rounded-[18px] border border-accent/40 bg-accent/10 px-4 py-3 text-foreground shadow-[0_18px_36px_rgba(0,0,0,0.22)] break-words sm:max-w-[82%]";
  }

  return "max-w-[92%] overflow-hidden rounded-[18px] border border-border bg-card px-4 py-3 text-foreground shadow-[0_18px_36px_rgba(0,0,0,0.2)] break-words sm:max-w-[82%]";
}

function mapSocketMessage(message: SocketEventMessage): ChatMessage {
  return {
    id: message.message_id,
    sender: message.sender,
    content: message.content,
    createdAt: message.created_at,
    shouldCallRag: message.should_call_rag,
  };
}

function appendMessage(setMessages: (updater: (current: ChatMessage[]) => ChatMessage[]) => void, message: ChatMessage) {
  setMessages((current) => {
    if (current.some((item) => item.id === message.id)) {
      return current;
    }
    return [...current, message];
  });
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,120}$/.test(value);
}

async function checkLiveHandoffHealth(baseUrl: string, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  // 8 s per attempt — long enough for Render to start responding.
  const timeout = window.setTimeout(abort, 8000);
  signal.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}

