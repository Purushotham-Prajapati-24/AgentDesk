"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

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
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Live operations</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">Agent inbox</h1>
          </div>

          <form className="grid gap-2 sm:grid-cols-[160px_180px_auto]" onSubmit={updateRoom}>
            <label className="text-xs font-semibold text-slate-600">
              Tenant
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-900"
                value={draftRoom.tenantId}
                onChange={(event) => setDraftRoom((current) => ({ ...current, tenantId: event.target.value }))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Session
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-900"
                value={draftRoom.sessionId}
                onChange={(event) => setDraftRoom((current) => ({ ...current, sessionId: event.target.value }))}
              />
            </label>
            <button className="h-10 self-end rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
              Connect
            </button>
          </form>
        </section>

        <section className="grid flex-1 gap-4 py-4 lg:grid-cols-[320px_1fr]">
          <aside className="min-h-[220px] border-r border-slate-200 pr-0 lg:pr-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Active sessions</h2>
              <ConnectionBadge status={socketStatus} />
            </div>

            <button className="w-full rounded-lg border border-slate-300 bg-white p-4 text-left shadow-sm" type="button">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{selectedSession.customer}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{selectedSession.id}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {selectedSession.unread}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{selectedSession.summary}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">Tenant: {selectedSession.tenantId}</p>
            </button>
          </aside>

          <section className="flex min-h-[640px] flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Conversation</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {room.tenantId} / {room.sessionId}
                </p>
              </div>

              <button
                className={takeoverButtonClass(sessionStatus)}
                type="button"
                onClick={() => void toggleTakeover()}
                disabled={socketStatus !== "connected"}
              >
                {sessionStatus === "paused_by_human" ? "Resume AI" : "Pause AI / Take Over Chat"}
              </button>
            </div>

            {error ? <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div> : null}

            <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5">
              {messages.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                  Waiting for live messages in this tenant-scoped session.
                </div>
              ) : (
                messages.map((message) => <MessageBubble key={message.id} message={message} />)
              )}
            </div>

            <form className="border-t border-slate-200 p-4" onSubmit={(event) => void sendAgentMessage(event)}>
              <div className="flex gap-2">
                <input
                  className="h-11 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100"
                  disabled={sessionStatus !== "paused_by_human" || socketStatus !== "connected"}
                  maxLength={4000}
                  placeholder={
                    sessionStatus === "paused_by_human"
                      ? "Reply as the human agent..."
                      : "Pause AI to unlock manual replies"
                  }
                  value={agentDraft}
                  onChange={(event) => setAgentDraft(event.target.value)}
                />
                <button
                  className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={sessionStatus !== "paused_by_human" || socketStatus !== "connected" || !agentDraft.trim()}
                  type="submit"
                >
                  Send
                </button>
              </div>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isCustomer = message.sender === "customer";
  const isAgent = message.sender === "agent";

  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
      <article className={messageBubbleClass(message.sender)}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-normal">{message.sender}</span>
          {typeof message.shouldCallRag === "boolean" ? (
            <span className="text-xs font-medium">{message.shouldCallRag ? "AI active" : "AI bypassed"}</span>
          ) : null}
        </div>
        <p className="text-sm leading-6">{message.content}</p>
        <time className={`mt-2 block text-xs ${isAgent ? "text-emerald-100" : "text-slate-500"}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </time>
      </article>
    </div>
  );
}

function ConnectionBadge({ status }: { status: "connecting" | "connected" | "disconnected" }) {
  const label = status === "connected" ? "Connected" : status === "connecting" ? "Connecting" : "Offline";
  const className =
    status === "connected"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "connecting"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>{label}</span>;
}

function messageBubbleClass(sender: Sender) {
  if (sender === "agent") {
    return "max-w-[76%] rounded-lg bg-emerald-700 px-4 py-3 text-white shadow-sm";
  }

  if (sender === "bot") {
    return "max-w-[76%] rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-950 shadow-sm";
  }

  return "max-w-[76%] rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm";
}

function takeoverButtonClass(status: SessionStatus) {
  const base = "h-10 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60";
  return status === "paused_by_human" ? `${base} bg-emerald-700 text-white` : `${base} bg-amber-500 text-slate-950`;
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
