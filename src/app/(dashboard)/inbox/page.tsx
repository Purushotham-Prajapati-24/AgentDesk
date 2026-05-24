"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Headphones, Radio, Send, UserRound } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/ui/Signal";

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

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? "http://127.0.0.1:4000";
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
  const [room, setRoom] = useState<Room>(DEFAULT_ROOM);
  const [draftRoom, setDraftRoom] = useState<Room>(DEFAULT_ROOM);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("active");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [agentDraft, setAgentDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const selectedSession = useMemo(
    () => ({
      id: room.sessionId,
      tenantId: room.tenantId,
      customer: "Website visitor",
      summary: latestCustomerMessage(messages),
      unread: messages.filter((message) => message.sender === "customer").length,
    }),
    [messages, room],
  );

  useEffect(() => {
    const namespace = `${DEFAULT_WS_URL.replace(/\/$/, "")}/tenant-${room.tenantId}`;
    const socket = io(namespace, {
      auth: {
        tenant_id: room.tenantId,
        session_id: room.sessionId,
      },
      reconnectionAttempts: 5,
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setSocketStatus("connected"));
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    socket.on("connect_error", () => {
      setSocketStatus("disconnected");
      setError("Unable to connect to the live handoff server.");
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [room]);

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
    setSocketStatus("connecting");
    setError(null);
    setRoom(draftRoom);
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

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[330px_1fr] lg:px-8">
        <aside className="grid gap-5">
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
              <h2 className="text-lg font-black">Active sessions</h2>
              <StatusPill tone="dark">{selectedSession.unread}</StatusPill>
            </div>

            <button className="hard-hover w-full border-2 border-line bg-panel-warm p-4 text-left" type="button">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-line">{selectedSession.customer}</p>
                  <p className="mt-1 truncate font-mono text-xs font-bold text-muted">{selectedSession.id}</p>
                </div>
                <Headphones aria-hidden="true" className="h-6 w-6 text-signal" />
              </div>
              <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-muted">{selectedSession.summary}</p>
              <p className="mt-4 font-mono text-xs font-bold text-line">Tenant: {selectedSession.tenantId}</p>
            </button>
          </Panel>
        </aside>

        <Panel className="flex min-h-[700px] flex-col overflow-hidden">
          <div className="flex flex-col gap-3 border-b-2 border-line bg-yellow px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-line">Conversation</h2>
              <p className="mt-1 font-mono text-xs font-bold text-muted">
                {room.tenantId} / {room.sessionId}
              </p>
            </div>

            <Button
              type="button"
              variant={sessionStatus === "paused_by_human" ? "primary" : "danger"}
              onClick={() => void toggleTakeover()}
              disabled={socketStatus !== "connected"}
            >
              {sessionStatus === "paused_by_human" ? "Resume AI" : "Pause AI / Take Over"}
            </Button>
          </div>

          {error ? <div className="border-b-2 border-line bg-coral px-4 py-3 text-sm font-bold text-white">{error}</div> : null}

          <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto bg-panel-warm px-4 py-5">
            {messages.length === 0 ? (
              <EmptyState title="Waiting for live messages" description="Connect a tenant-scoped session to watch support traffic in real time." />
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}
          </div>

          <form className="border-t-2 border-line bg-panel p-4" onSubmit={(event) => void sendAgentMessage(event)}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="min-h-12 flex-1 border-2 border-line bg-panel px-3 text-sm font-bold focus:bg-panel-warm disabled:cursor-not-allowed disabled:bg-panel-warm"
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
          <span className="flex items-center gap-2 font-mono text-xs font-black uppercase">
            <Icon aria-hidden="true" className="h-4 w-4" />
            {message.sender}
          </span>
          {typeof message.shouldCallRag === "boolean" ? (
            <span className="font-mono text-xs font-bold">{message.shouldCallRag ? "RAG active" : "AI bypassed"}</span>
          ) : null}
        </div>
        <p className="text-sm font-semibold leading-6">{message.content}</p>
        <time className={`mt-3 block font-mono text-xs font-bold ${isAgent ? "text-white/80" : "text-muted"}`}>
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
    return "max-w-[82%] rounded-[18px] border-2 border-line bg-signal px-4 py-3 text-white shadow-[4px_4px_0_#17120D]";
  }

  if (sender === "bot") {
    return "max-w-[82%] rounded-[18px] border-2 border-line bg-yellow px-4 py-3 text-line shadow-[4px_4px_0_rgba(23,18,13,0.25)]";
  }

  return "max-w-[82%] rounded-[18px] border-2 border-line bg-panel px-4 py-3 text-line shadow-[4px_4px_0_rgba(23,18,13,0.2)]";
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

function latestCustomerMessage(messages: ChatMessage[]) {
  const message = [...messages].reverse().find((item) => item.sender === "customer");
  return message?.content ?? "No customer messages yet.";
}

function isSafeId(value: string) {
  return /^[a-zA-Z0-9_-]{3,120}$/.test(value);
}
