"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  Headphones,
  MessageSquareText,
  Radio,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import {
  listConversationMessages,
  listConversationSessions,
  type ConversationSummary,
} from "@/app/inbox-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/context/TenantContext";
import { cn } from "@/lib/utils";
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

export default function InboxPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [room, setRoom] = useState<Room>(DEFAULT_ROOM);
  const [draftRoom, setDraftRoom] = useState<Room>(DEFAULT_ROOM);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">(WEB_SOCKET_URL ? "connecting" : "disconnected");
  const [wakingUp, setWakingUp] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("active");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [agentDraft, setAgentDraft] = useState("");
  const [error, setError] = useState<string | null>(WEB_SOCKET_URL ? null : WEB_SOCKET_CONFIG_ERROR);
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyCursorStack, setHistoryCursorStack] = useState<string[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
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
      setHistoryLoading(false);
      return;
    }

    let isActive = true;
    setHistoryLoading(true);
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
    const query = historySearchInput.trim();

    if (!query) {
      return;
    }

    setHistoryLoading(true);
    setHistoryCursor(null);
    setHistoryCursorStack([]);
    setHistorySearch(query);
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
    setMessages([]);
    setMessageLoading(true);
    setSocketStatus(WEB_SOCKET_URL ? "connecting" : "disconnected");
    setError(WEB_SOCKET_URL ? null : WEB_SOCKET_CONFIG_ERROR);

    try {
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
    } catch (messageError) {
      setMessages([]);
      setError(messageError instanceof Error ? messageError.message : "Unable to load conversation messages.");
    } finally {
      setMessageLoading(false);
    }
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

  const canConnect = isSafeId(draftRoom.tenantId) && isSafeId(draftRoom.sessionId);
  const activeHandoffs = history.filter((conversation) => conversation.status === "paused_by_human").length;
  const totalMessages = history.reduce((total, conversation) => total + conversation.messageCount, 0);
  const selectedConversation = history.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const initialLoading = tenantLoading || (historyLoading && history.length === 0 && !error);

  if (initialLoading) {
    return <InboxPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <InboxHero
          activeHandoffs={activeHandoffs}
          room={room}
          selectedConversation={selectedConversation}
          socketStatus={socketStatus}
          tenantId={tenant?.$id}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <InboxMetric label="Queue window" value={String(history.length)} detail={historyLoading ? "loading sessions" : "visible conversations"} tone="blue" />
          <InboxMetric label="Human control" value={String(activeHandoffs)} detail="sessions paused by operators" tone="coral" />
          <InboxMetric label="Messages" value={String(totalMessages)} detail="in visible history rows" tone="green" />
        </section>

        <div className="grid min-w-0 gap-5 xl:h-[calc(100vh-8rem)] xl:min-h-[720px] xl:grid-cols-[360px_minmax(0,1fr)_310px]">
          <ConversationHistoryPanel
            history={history}
            historyCursorStack={historyCursorStack}
            historyLoading={historyLoading}
            historyNextCursor={historyNextCursor}
            historySearchInput={historySearchInput}
            onNextPage={nextHistoryPage}
            onPreviousPage={previousHistoryPage}
            onSearch={searchHistory}
            onSearchInputChange={setHistorySearchInput}
            onSelectConversation={selectConversation}
            selectedConversationId={selectedConversationId}
          />

          <LiveTranscriptPanel
            agentDraft={agentDraft}
            error={error}
            feedRef={feedRef}
            messageLoading={messageLoading}
            messages={messages}
            onAgentDraftChange={setAgentDraft}
            onSendAgentMessage={sendAgentMessage}
            onToggleTakeover={toggleTakeover}
            room={room}
            selectedConversation={selectedConversation}
            sessionStatus={sessionStatus}
            socketStatus={socketStatus}
            wakingUp={wakingUp}
          />

          <OperatorContextPanel
            canConnect={canConnect}
            draftRoom={draftRoom}
            messages={messages}
            onDraftRoomChange={setDraftRoom}
            onUpdateRoom={updateRoom}
            room={room}
            selectedConversation={selectedConversation}
            socketStatus={socketStatus}
          />
        </div>
      </div>
    </div>
  );
}

function InboxPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:px-8">
        <InboxHeroSkeleton />
        <InboxMetricGridSkeleton />
        <div className="grid min-w-0 gap-5 xl:h-[calc(100vh-8rem)] xl:min-h-[720px] xl:grid-cols-[360px_minmax(0,1fr)_310px]">
          <ConversationHistoryPanelSkeleton />
          <LiveTranscriptPanelSkeleton />
          <OperatorContextPanelSkeleton />
        </div>
      </div>
    </div>
  );
}

function InboxHeroSkeleton() {
  return (
    <section className="mt-3 grid gap-4 rounded-[2rem] border border-[#fb923c]/35 bg-[linear-gradient(135deg,#fff7ed_0%,#fed7aa_44%,#fb923c_100%)] p-4 text-[#431407] shadow-[0_22px_60px_rgba(251,146,60,0.18)] dark:bg-[linear-gradient(135deg,#2b1408_0%,#7c2d12_48%,#fb923c_100%)] dark:text-[#fff7ed] lg:grid-cols-[minmax(0,1fr)_320px] lg:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-28 rounded-full bg-white/45 dark:bg-white/20" />
          <Skeleton className="h-7 w-28 rounded-full bg-white/45 dark:bg-white/20" />
          <Skeleton className="h-7 w-24 rounded-full bg-white/45 dark:bg-white/20" />
        </div>
        <Skeleton className="mt-4 h-10 w-full max-w-4xl bg-white/50 dark:bg-white/20 sm:h-12" />
        <Skeleton className="mt-3 h-10 w-5/6 max-w-3xl bg-white/45 dark:bg-white/15 sm:h-12" />
      </div>
      <div className="grid content-between gap-3 rounded-3xl border border-white/35 bg-white/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:bg-black/20">
        <div>
          <Skeleton className="h-3 w-32 bg-white/50 dark:bg-white/20" />
          <Skeleton className="mt-4 h-4 w-full bg-white/45 dark:bg-white/15" />
          <Skeleton className="mt-3 h-3 w-3/4 bg-white/45 dark:bg-white/15" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniStatSkeleton />
          <MiniStatSkeleton />
        </div>
      </div>
    </section>
  );
}

function InboxMetricGridSkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {["queue", "handoff", "messages"].map((item) => (
        <InboxMetricSkeleton key={item} />
      ))}
    </section>
  );
}

function InboxMetricSkeleton() {
  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-28 bg-[var(--ui-panel-2)]" />
        <Skeleton className="h-3 w-3 rounded-full bg-[var(--ui-panel-2)]" />
      </div>
      <Skeleton className="mt-5 h-10 w-20 bg-[var(--ui-panel-2)]" />
      <Skeleton className="mt-4 h-4 w-36 bg-[var(--ui-panel-2)]" />
    </article>
  );
}

function ConversationHistoryPanelSkeleton() {
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
      <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <Skeleton className="h-3 w-36 bg-[var(--ui-bg)]" />
            <Skeleton className="mt-2 h-5 w-32 bg-[var(--ui-bg)]" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full bg-[var(--ui-bg)]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 min-w-0 flex-1 rounded-full bg-[var(--ui-bg)]" />
          <Skeleton className="h-10 w-10 rounded-full bg-[var(--ui-bg)]" />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-2 overflow-hidden p-3">
        <HistoryRowsSkeleton />
      </div>
      <PanelFooterSkeleton />
    </section>
  );
}

function LiveTranscriptPanelSkeleton() {
  return (
    <section className="flex h-[640px] min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] lg:h-[760px] xl:h-full">
      <div className="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-28 bg-[var(--ui-bg)]" />
          <Skeleton className="mt-2 h-5 w-64 max-w-full bg-[var(--ui-bg)]" />
          <Skeleton className="mt-2 h-3 w-36 bg-[var(--ui-bg)]" />
        </div>
        <Skeleton className="h-10 w-28 rounded-full bg-[var(--ui-bg)]" />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-hidden bg-[var(--ui-bg)] p-4">
        <TranscriptMessagesSkeleton />
      </div>
      <div className="border-t border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-12 min-w-0 flex-1 rounded-full bg-[var(--ui-bg)]" />
          <Skeleton className="h-12 w-24 rounded-full bg-[var(--ui-bg)]" />
        </div>
      </div>
    </section>
  );
}

function OperatorContextPanelSkeleton() {
  return (
    <aside className="grid min-h-0 content-start gap-5">
      <section className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
        <Skeleton className="h-3 w-36 bg-[var(--ui-panel-2)]" />
        <div className="mt-4 grid gap-3">
          <Skeleton className="h-16 rounded-2xl bg-[var(--ui-bg)]" />
          <Skeleton className="h-16 rounded-2xl bg-[var(--ui-bg)]" />
          <Skeleton className="h-9 rounded-full bg-[var(--ui-bg)]" />
        </div>
      </section>
      <section className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
        <Skeleton className="h-3 w-32 bg-[var(--ui-panel-2)]" />
        <div className="mt-4 grid gap-3">
          <ContextRowsSkeleton />
        </div>
      </section>
    </aside>
  );
}

function HistoryRowsSkeleton() {
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

function TranscriptMessagesSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div className={cn("flex", index % 3 === 0 ? "justify-start" : "justify-end")} key={index}>
          <article className="w-[92%] rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-3 sm:w-[72%]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-24 bg-[var(--ui-panel-2)]" />
              <Skeleton className="h-4 w-16 bg-[var(--ui-panel-2)]" />
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

function ContextRowsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3" key={index}>
          <Skeleton className="h-3 w-20 bg-[var(--ui-panel-2)]" />
          <Skeleton className="mt-2 h-4 w-full bg-[var(--ui-panel-2)]" />
        </div>
      ))}
    </>
  );
}

function MiniStatSkeleton() {
  return (
    <div className="rounded-2xl border border-white/35 bg-white/30 p-3 dark:bg-black/20">
      <Skeleton className="h-3 w-14 bg-white/50 dark:bg-white/20" />
      <Skeleton className="mt-2 h-6 w-12 bg-white/45 dark:bg-white/15" />
    </div>
  );
}

function PanelFooterSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-2.5">
      <Skeleton className="h-9 w-20 rounded-full bg-[var(--ui-bg)]" />
      <Skeleton className="h-7 w-20 rounded-full bg-[var(--ui-bg)]" />
      <Skeleton className="h-9 w-20 rounded-full bg-[var(--ui-bg)]" />
    </div>
  );
}

function InboxHero({
  activeHandoffs,
  room,
  selectedConversation,
  socketStatus,
  tenantId,
}: {
  activeHandoffs: number;
  room: Room;
  selectedConversation: ConversationSummary | null;
  socketStatus: "connecting" | "connected" | "disconnected";
  tenantId?: string;
}) {
  return (
    <section className="mt-3 grid gap-4 rounded-[2rem] border border-[#fb923c]/35 bg-[linear-gradient(135deg,#fff7ed_0%,#fed7aa_44%,#fb923c_100%)] p-4 text-[#431407] shadow-[0_22px_60px_rgba(251,146,60,0.18)] dark:bg-[linear-gradient(135deg,#2b1408_0%,#7c2d12_48%,#fb923c_100%)] dark:text-[#fff7ed] lg:grid-cols-[minmax(0,1fr)_320px] lg:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="studio-kicker rounded-full border border-[#9a3412]/20 bg-white/45 px-3 py-1 text-[#9a3412] dark:border-white/20 dark:bg-black/20 dark:text-[#fed7aa]">Live handoff</p>
          <ConnectionBadge status={socketStatus} />
          <SessionStatusPill status={selectedConversation?.status ?? "active"} />
        </div>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-current sm:text-5xl">
          Take over customer conversations with the full context in view.
        </h1>
      </div>
      <div className="grid content-between gap-3 rounded-3xl border border-white/35 bg-white/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:bg-black/20">
        <div>
          <p className="font-mono text-xs font-semibold uppercase opacity-70">Session summary</p>
          <p className="mt-3 break-all font-mono text-sm font-semibold text-current">{room.sessionId}</p>
          <p className="mt-2 break-all font-mono text-xs font-semibold opacity-70">{tenantId ?? room.tenantId}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="handoffs" value={String(activeHandoffs)} />
          <MiniStat label="room" value={socketStatus === "connected" ? "live" : "standby"} />
        </div>
      </div>
    </section>
  );
}

function ConversationHistoryPanel({
  history,
  historyCursorStack,
  historyLoading,
  historyNextCursor,
  historySearchInput,
  onNextPage,
  onPreviousPage,
  onSearch,
  onSearchInputChange,
  onSelectConversation,
  selectedConversationId,
}: {
  history: ConversationSummary[];
  historyCursorStack: string[];
  historyLoading: boolean;
  historyNextCursor: string | null;
  historySearchInput: string;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSearchInputChange: (value: string) => void;
  onSelectConversation: (conversation: ConversationSummary) => void;
  selectedConversationId: string | null;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
      <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="studio-kicker text-[var(--ui-blue)]">Conversation history</p>
            <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Find a session</h2>
          </div>
          <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">
            {historyLoading ? "Loading" : `${history.length} rows`}
          </span>
        </div>

        <form className="flex gap-2" onSubmit={onSearch}>
          <input
            className="min-h-10 min-w-0 flex-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 text-sm font-semibold text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] transition focus:border-[var(--ui-blue)]"
            placeholder="Search session, bot, status"
            value={historySearchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
          />
          <Button aria-label="Search history" className="rounded-full" disabled={!historySearchInput.trim()} size="icon" type="submit" variant="secondary">
            <Search aria-hidden="true" className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto p-3">
        {historyLoading ? (
          <HistoryRowsSkeleton />
        ) : history.length === 0 ? (
          <InboxEmptyState title={historyLoading ? "Loading conversations" : "No conversations found"} description="Persisted widget sessions for this tenant will appear here when customers chat." />
        ) : (
          history.map((conversation) => (
            <button
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition duration-200 ease-out hover:-translate-y-0.5",
                selectedConversationId === conversation.id
                  ? "border-[var(--ui-blue)] bg-[var(--ui-blue)]/10"
                  : "border-[var(--ui-border)] bg-[var(--ui-bg)] hover:border-[var(--ui-blue)]/50",
              )}
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[var(--ui-text)]">{conversation.sessionToken}</p>
                  <p className="mt-1 truncate font-mono text-xs font-semibold text-[var(--ui-muted)]">{conversation.botId || "unassigned agent"}</p>
                </div>
                <SessionStatusPill status={conversation.status} />
              </div>
              <p className="mt-4 line-clamp-2 text-sm font-medium leading-6 text-[var(--ui-muted)]">{conversation.lastMessage || "No message preview yet."}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs font-semibold text-[var(--ui-muted)]">{conversation.messageCount} messages</span>
                <span className="font-mono text-xs font-semibold text-[var(--ui-muted)]">{formatDate(conversation.updatedAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-2.5">
        <Button className="rounded-full" disabled={historyCursorStack.length === 0 || historyLoading} leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={onPreviousPage} size="sm" type="button" variant="outline">
          Prev
        </Button>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">
          {historyLoading ? "Loading" : "History"}
        </span>
        <Button className="rounded-full" disabled={!historyNextCursor || historyLoading} rightIcon={<ChevronRight className="h-4 w-4" />} onClick={onNextPage} size="sm" type="button" variant="outline">
          Next
        </Button>
      </div>
    </section>
  );
}

function LiveTranscriptPanel({
  agentDraft,
  error,
  feedRef,
  messageLoading,
  messages,
  onAgentDraftChange,
  onSendAgentMessage,
  onToggleTakeover,
  room,
  selectedConversation,
  sessionStatus,
  socketStatus,
  wakingUp,
}: {
  agentDraft: string;
  error: string | null;
  feedRef: React.RefObject<HTMLDivElement | null>;
  messageLoading: boolean;
  messages: ChatMessage[];
  onAgentDraftChange: (value: string) => void;
  onSendAgentMessage: (event: FormEvent<HTMLFormElement>) => void;
  onToggleTakeover: () => void;
  room: Room;
  selectedConversation: ConversationSummary | null;
  sessionStatus: SessionStatus;
  socketStatus: "connecting" | "connected" | "disconnected";
  wakingUp: boolean;
}) {
  const canReply = sessionStatus === "paused_by_human" && socketStatus === "connected";

  return (
    <section className="flex h-[640px] min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] lg:h-[760px] xl:h-full">
      <div className="flex flex-col gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="studio-kicker text-[var(--ui-blue)]">Primary transcript</p>
          <h2 className="mt-1 break-all text-lg font-semibold tracking-[-0.02em] text-[var(--ui-text)]">{selectedConversation?.sessionToken ?? room.sessionId}</h2>
          <p className="mt-1 break-all font-mono text-xs font-semibold text-[var(--ui-muted)]">{room.tenantId}</p>
        </div>

        <Button
          className="rounded-full"
          type="button"
          variant={sessionStatus === "paused_by_human" ? "secondary" : "danger"}
          onClick={() => void onToggleTakeover()}
          disabled={socketStatus !== "connected"}
        >
          {sessionStatus === "paused_by_human" ? "Resume AI" : "Take over"}
        </Button>
      </div>

      {wakingUp && !error ? (
        <Notice tone="warn" message="Waking up the live handoff server. Render cold starts can take about 30 seconds." />
      ) : error ? (
        <Notice tone="danger" message={error} />
      ) : null}

      <div ref={feedRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[var(--ui-bg)] p-4">
        {messageLoading ? (
          <TranscriptMessagesSkeleton />
        ) : messages.length === 0 ? (
          <InboxEmptyState
            title={selectedConversation ? "No messages recorded" : "No live session selected"}
            description={selectedConversation ? "This session exists, but no messages have been persisted yet." : "Choose a conversation from history or connect a tenant-scoped room to watch support traffic."}
          />
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      <form className="border-t border-[var(--ui-border)] bg-[var(--ui-panel-2)] p-3" onSubmit={(event) => void onSendAgentMessage(event)}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-12 flex-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 text-sm font-semibold text-[var(--ui-text)] placeholder:text-[var(--ui-muted)] transition focus:border-[var(--ui-blue)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canReply}
            maxLength={4000}
            placeholder={sessionStatus === "paused_by_human" ? "Reply as the human agent..." : "Pause AI to unlock manual replies"}
            value={agentDraft}
            onChange={(event) => onAgentDraftChange(event.target.value)}
          />
          <Button className="rounded-full" disabled={!canReply || !agentDraft.trim()} rightIcon={<Send aria-hidden="true" className="h-4 w-4" />} type="submit">
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}

function OperatorContextPanel({
  canConnect,
  draftRoom,
  messages,
  onDraftRoomChange,
  onUpdateRoom,
  room,
  selectedConversation,
  socketStatus,
}: {
  canConnect: boolean;
  draftRoom: Room;
  messages: ChatMessage[];
  onDraftRoomChange: (updater: (current: Room) => Room) => void;
  onUpdateRoom: (event: FormEvent<HTMLFormElement>) => void;
  room: Room;
  selectedConversation: ConversationSummary | null;
  socketStatus: "connecting" | "connected" | "disconnected";
}) {
  const ragLabel = messages.some((message) => message.shouldCallRag) ? "Source lookup requested" : "No source flag yet";

  return (
    <aside className="grid min-h-0 content-start gap-5">
      <section className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
        <p className="studio-kicker text-[var(--ui-blue)]">Manual room connect</p>
        <form className="mt-4 grid gap-3" onSubmit={onUpdateRoom}>
          <Input
            className="rounded-full border-[var(--ui-border)] bg-[var(--ui-bg)] text-[var(--ui-text)] focus:border-[var(--ui-blue)]"
            label="Tenant"
            value={draftRoom.tenantId}
            onChange={(event) => onDraftRoomChange((current) => ({ ...current, tenantId: event.target.value }))}
          />
          <Input
            className="rounded-full border-[var(--ui-border)] bg-[var(--ui-bg)] text-[var(--ui-text)] focus:border-[var(--ui-blue)]"
            label="Session"
            value={draftRoom.sessionId}
            onChange={(event) => onDraftRoomChange((current) => ({ ...current, sessionId: event.target.value }))}
          />
          <Button className="rounded-full" disabled={!canConnect} size="sm" type="submit" variant="secondary">
            Connect
          </Button>
        </form>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4">
        <p className="studio-kicker text-[var(--ui-blue)]">Operator context</p>
        <div className="mt-4 grid gap-3">
          <ContextRow label="Tenant" value={room.tenantId} />
          <ContextRow label="Session" value={room.sessionId} />
          <ContextRow label="Selected row" value={selectedConversation?.id ?? "No history row selected"} />
          <ContextRow label="RAG signal" value={ragLabel} />
          <ContextRow label="Socket" value={socketStatus} />
        </div>
      </section>
    </aside>
  );
}

function InboxMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "blue" | "green" | "coral" }) {
  const dotClass = {
    blue: "bg-[var(--ui-blue)]",
    green: "bg-[#22c55e]",
    coral: "bg-[var(--ui-coral)]",
  }[tone];

  return (
    <article className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">{label}</p>
        <span className={`h-3 w-3 rounded-full ${dotClass}`} />
      </div>
      <p className="mt-5 font-mono text-4xl font-semibold tracking-[-0.04em] text-[var(--ui-text)]">{value}</p>
      <p className="mt-3 text-sm font-medium text-[var(--ui-muted)]">{detail}</p>
    </article>
  );
}

function InboxEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--ui-border)] bg-[var(--ui-panel)] p-6 text-center">
      <MessageSquareText aria-hidden="true" className="mx-auto h-5 w-5 text-[var(--ui-blue)]" />
      <p className="mt-3 text-base font-semibold text-[var(--ui-text)]">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--ui-muted)]">{description}</p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isCustomer = message.sender === "customer";
  const Icon = message.sender === "bot" ? Bot : message.sender === "agent" ? Headphones : UserRound;

  return (
    <div className={cn("flex", isCustomer ? "justify-start" : "justify-end")}>
      <article className={messageBubbleClass(message.sender)}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase">
            <Icon aria-hidden="true" className="h-4 w-4" />
            {senderLabel(message.sender)}
          </span>
          {typeof message.shouldCallRag === "boolean" ? (
            <span className="font-mono text-xs font-semibold opacity-75">{message.shouldCallRag ? "RAG active" : "AI bypassed"}</span>
          ) : null}
        </div>
        <p className="text-sm font-medium leading-6">{message.content}</p>
        <time className="mt-3 block font-mono text-xs font-semibold opacity-75">{formatTime(message.createdAt)}</time>
      </article>
    </div>
  );
}

function ConnectionBadge({ status }: { status: "connecting" | "connected" | "disconnected" }) {
  const label = status === "connected" ? "Connected" : status === "connecting" ? "Connecting" : "Offline";

  return (
    <span className={connectionBadgeClass(status)}>
      <Radio aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/35 bg-white/30 p-3 dark:bg-black/20">
      <p className="font-mono text-[10px] font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-2 font-mono text-lg font-semibold text-current">{value}</p>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3">
      <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-[var(--ui-text)]">{value}</p>
    </div>
  );
}

function Notice({ message, tone }: { message: string; tone: "danger" | "warn" }) {
  const className =
    tone === "danger"
      ? "border-[var(--ui-coral)]/40 bg-[var(--ui-coral)]/10 text-[var(--ui-coral)]"
      : "border-[var(--ui-amber)]/40 bg-[var(--ui-amber)]/10 text-[var(--ui-amber)]";

  return (
    <div className={`flex items-center gap-3 border-b px-4 py-3 text-sm font-semibold ${className}`} role="alert">
      <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
      {message}
    </div>
  );
}

function SessionStatusPill({ status }: { status: SessionStatus }) {
  return <span className={sessionStatusClass(status)}>{status.replaceAll("_", " ")}</span>;
}

function connectionBadgeClass(status: "connecting" | "connected" | "disconnected") {
  if (status === "connected") {
    return "inline-flex min-h-7 items-center gap-2 rounded-full border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-1 font-mono text-xs font-semibold text-[#22c55e]";
  }

  if (status === "connecting") {
    return "inline-flex min-h-7 items-center gap-2 rounded-full border border-[var(--ui-amber)]/40 bg-[var(--ui-amber)]/10 px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-amber)]";
  }

  return "inline-flex min-h-7 items-center gap-2 rounded-full border border-[var(--ui-coral)]/40 bg-[var(--ui-coral)]/10 px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-coral)]";
}

function sessionStatusClass(status: SessionStatus) {
  if (status === "paused_by_human") {
    return "inline-flex min-h-7 items-center rounded-full border border-[var(--ui-coral)]/40 bg-[var(--ui-coral)]/10 px-3 py-1 font-mono text-xs font-semibold capitalize text-[var(--ui-coral)]";
  }

  if (status === "closed") {
    return "inline-flex min-h-7 items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-3 py-1 font-mono text-xs font-semibold capitalize text-[var(--ui-muted)]";
  }

  return "inline-flex min-h-7 items-center rounded-full border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-1 font-mono text-xs font-semibold capitalize text-[#22c55e]";
}

function messageBubbleClass(sender: Sender) {
  if (sender === "agent") {
    return "max-w-[92%] overflow-hidden break-words rounded-2xl border border-[var(--ui-blue)] bg-[var(--ui-blue)] px-4 py-3 text-[var(--ui-bg)] shadow-[0_18px_36px_rgba(0,0,0,0.22)] sm:max-w-[82%]";
  }

  if (sender === "bot") {
    return "max-w-[92%] overflow-hidden break-words rounded-2xl border border-[#22c55e]/40 bg-[#22c55e]/10 px-4 py-3 text-[var(--ui-text)] sm:max-w-[82%]";
  }

  return "max-w-[92%] overflow-hidden break-words rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-3 text-[var(--ui-text)] sm:max-w-[82%]";
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

function senderLabel(sender: Sender) {
  return sender === "bot" ? "automation" : sender;
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,120}$/.test(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function checkLiveHandoffHealth(baseUrl: string, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  // 8 s per attempt is long enough for Render to start responding.
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
