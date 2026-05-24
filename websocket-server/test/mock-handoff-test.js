import { once } from "node:events";
import { io as createClient } from "socket.io-client";
import { createHandoffServer } from "../server.js";
import { createMemorySessionStore } from "../session-store.js";

const tenantId = "tenant_demo";
const sessionId = "session_demo";

const backingState = new Map();
const sessionStore = createMemorySessionStore(backingState);
const { server, io } = createHandoffServer({ sessionStore });
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Unable to start mock websocket server.");
}

const baseUrl = `http://127.0.0.1:${address.port}/tenant-${tenantId}`;
const auth = { tenant_id: tenantId, session_id: sessionId };
const customer = createClient(baseUrl, { auth, transports: ["websocket"] });
const agent = createClient(baseUrl, { auth, transports: ["websocket"] });

try {
  await Promise.all([once(customer, "connect"), once(agent, "connect")]);

  const activeMessage = await emitWithAck(customer, "customer-message", {
    content: "Where is order A123?",
  });

  assert(activeMessage.success, "active customer message should be accepted");
  assert(activeMessage.data.should_call_rag === true, "active customer message should allow RAG");

  const statusAck = await emitWithAck(agent, "bot-status-toggle", {
    status: "paused_by_human",
    updated_by: "agent_demo",
  });

  assert(statusAck.success, "status toggle should be accepted");
  assert(statusAck.data.status === "paused_by_human", "session should be paused by human");
  assert(backingState.size === 1, "status toggle should persist session state through the store");

  const forwardedMessage = once(agent, "customer-message");
  const pausedMessage = await emitWithAck(customer, "customer-message", {
    content: "I need a human now.",
  });
  const [forwardedPayload] = await forwardedMessage;

  assert(pausedMessage.success, "paused customer message should be accepted");
  assert(pausedMessage.data.should_call_rag === false, "paused customer message should bypass RAG");
  assert(forwardedPayload.content === "I need a human now.", "agent should receive forwarded customer message");
  assert(forwardedPayload.should_call_rag === false, "forwarded message should preserve RAG bypass flag");

  const permission = await fetch(`http://127.0.0.1:${address.port}/rag-permission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId, session_id: sessionId }),
  }).then((response) => response.json());

  assert(permission.success, "rag-permission should return a success response");
  assert(permission.data.shouldCallRag === false, "rag-permission should use stored paused status");

  const agentMessage = once(customer, "agent-message");
  const agentAck = await emitWithAck(agent, "agent-message", {
    content: "I am checking that for you.",
  });
  const [agentPayload] = await agentMessage;

  assert(agentAck.success, "agent message should be accepted");
  assert(agentPayload.sender === "agent", "customer should receive agent sender payload");

  console.info("Mock handoff verification passed.");
} finally {
  customer.disconnect();
  agent.disconnect();
  await io.close();
  await new Promise((resolve) => server.close(resolve));
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => {
    socket.timeout(3000).emit(event, payload, (error, response) => {
      if (error) {
        resolve({ success: false, error: { code: "ACK_TIMEOUT", message: error.message } });
        return;
      }
      resolve(response);
    });
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
