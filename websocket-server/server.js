import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";

const PORT = Number.parseInt(process.env.PORT ?? "4000", 10);
const DEFAULT_CORS_ORIGIN = "http://localhost:3000,http://127.0.0.1:3000";
const MAX_MESSAGE_LENGTH = 4000;
const SESSION_STATUSES = new Set(["active", "paused_by_human", "closed"]);

const sessionState = new Map();

export function createHandoffServer(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: parseCorsOrigins(process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN),
      methods: ["GET", "POST"],
    },
  });

  app.disable("x-powered-by");
  app.use(cors({ origin: parseCorsOrigins(process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN) }));
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        service: "agentdesk-websocket-server",
        status: "ok",
      },
    });
  });

  app.post("/rag-permission", (request, response) => {
    const room = parseRoomPayload(request.body);
    if (!room.ok) {
      response.status(422).json(errorBody("INVALID_ROOM", room.error));
      return;
    }

    response.status(200).json({
      success: true,
      data: {
        shouldCallRag: getSessionStatus(room.value) !== "paused_by_human",
      },
    });
  });

  io.of(/^\/tenant-[a-zA-Z0-9_-]+$/).on("connection", (socket) => {
    const joinResult = joinSessionRoom(socket);
    if (!joinResult.ok) {
      socket.emit("server-error", errorBody("INVALID_HANDSHAKE", joinResult.error));
      socket.disconnect(true);
      return;
    }

    const room = joinResult.value;
    socket.join(roomName(room));
    socket.emit("session-state", buildSessionState(room));

    socket.on("customer-message", (payload, acknowledge) => {
      handleCustomerMessage(socket, room, payload, acknowledge);
    });

    socket.on("agent-message", (payload, acknowledge) => {
      handleAgentMessage(socket, room, payload, acknowledge);
    });

    socket.on("bot-status-toggle", (payload, acknowledge) => {
      handleStatusToggle(socket, room, payload, acknowledge);
    });
  });

  return { app, server, io, sessionState: options.sessionState ?? sessionState };
}

function handleCustomerMessage(socket, room, payload, acknowledge) {
  const message = parseMessagePayload(payload, "customer");
  if (!message.ok) {
    acknowledge?.(errorBody("INVALID_MESSAGE", message.error));
    return;
  }

  const status = getSessionStatus(room);
  const event = {
    ...message.value,
    tenant_id: room.tenant_id,
    session_id: room.session_id,
    bot_status: status,
    should_call_rag: status !== "paused_by_human",
    created_at: new Date().toISOString(),
  };

  socket.to(roomName(room)).emit("customer-message", event);
  socket.emit("message-accepted", event);
  acknowledge?.({ success: true, data: event });
}

function handleAgentMessage(socket, room, payload, acknowledge) {
  const message = parseMessagePayload(payload, "agent");
  if (!message.ok) {
    acknowledge?.(errorBody("INVALID_MESSAGE", message.error));
    return;
  }

  const event = {
    ...message.value,
    tenant_id: room.tenant_id,
    session_id: room.session_id,
    created_at: new Date().toISOString(),
  };

  socket.to(roomName(room)).emit("agent-message", event);
  socket.emit("message-accepted", event);
  acknowledge?.({ success: true, data: event });
}

function handleStatusToggle(socket, room, payload, acknowledge) {
  const status = typeof payload?.status === "string" ? payload.status : "";
  if (!SESSION_STATUSES.has(status)) {
    acknowledge?.(errorBody("INVALID_STATUS", "Status must be active, paused_by_human, or closed."));
    return;
  }

  const state = {
    tenant_id: room.tenant_id,
    session_id: room.session_id,
    status,
    updated_by: sanitizeText(payload.updated_by ?? "agent", 120),
    updated_at: new Date().toISOString(),
  };

  sessionState.set(stateKey(room), state);
  socket.to(roomName(room)).emit("bot-status-toggle", state);
  socket.emit("session-state", state);
  acknowledge?.({ success: true, data: state });
}

function joinSessionRoom(socket) {
  const tenantId = readHandshakeValue(socket, "tenant_id");
  const sessionId = readHandshakeValue(socket, "session_id");
  const namespaceTenantId = socket.nsp.name.replace(/^\/tenant-/, "");

  if (!isSafeId(tenantId) || !isSafeId(sessionId)) {
    return { ok: false, error: "tenant_id and session_id are required." };
  }

  if (tenantId !== namespaceTenantId) {
    return { ok: false, error: "Namespace tenant does not match handshake tenant." };
  }

  return { ok: true, value: { tenant_id: tenantId, session_id: sessionId } };
}

function parseRoomPayload(payload) {
  const tenantId = typeof payload?.tenant_id === "string" ? payload.tenant_id : "";
  const sessionId = typeof payload?.session_id === "string" ? payload.session_id : "";

  if (!isSafeId(tenantId) || !isSafeId(sessionId)) {
    return { ok: false, error: "tenant_id and session_id are required." };
  }

  return { ok: true, value: { tenant_id: tenantId, session_id: sessionId } };
}

function parseMessagePayload(payload, sender) {
  const content = typeof payload?.content === "string" ? payload.content.trim() : "";
  const messageId = typeof payload?.message_id === "string" ? payload.message_id : crypto.randomUUID();

  if (!content) {
    return { ok: false, error: "Message content is required." };
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message content must be ${MAX_MESSAGE_LENGTH} characters or less.` };
  }

  return {
    ok: true,
    value: {
      message_id: sanitizeText(messageId, 120),
      sender,
      content: sanitizeText(content, MAX_MESSAGE_LENGTH),
    },
  };
}

function readHandshakeValue(socket, key) {
  const value = socket.handshake.auth?.[key] ?? socket.handshake.query?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildSessionState(room) {
  return (
    sessionState.get(stateKey(room)) ?? {
      tenant_id: room.tenant_id,
      session_id: room.session_id,
      status: "active",
      updated_by: "system",
      updated_at: new Date().toISOString(),
    }
  );
}

function getSessionStatus(room) {
  return buildSessionState(room).status;
}

function stateKey(room) {
  return `${room.tenant_id}:${room.session_id}`;
}

function roomName(room) {
  return `tenant:${room.tenant_id}:session:${room.session_id}`;
}

function isSafeId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{3,120}$/.test(value);
}

function sanitizeText(value, maxLength) {
  return String(value).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

function parseCorsOrigins(value) {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : false;
}

function errorBody(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
      requestId: crypto.randomUUID(),
    },
  };
}

const isEntrypoint = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;
if (isEntrypoint) {
  const { server } = createHandoffServer();
  server.listen(PORT, () => {
    console.info(`AgentDesk websocket server listening on ${PORT}`);
  });
}
