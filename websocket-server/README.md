# AgentDesk WebSocket Server

Standalone Socket.io handoff service for customer chat sessions and live agent takeover.

## Run

```powershell
npm install
npm start
```

Default port: `4000`.

## Optional State Backends

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: durable shared session state.
- `SOCKET_IO_REDIS_URL`: Socket.IO pub/sub adapter for clustered websocket instances.

Without Redis configuration, the server uses in-memory state for local development.

## Client Connection

Connect to a tenant namespace and pass tenant/session identifiers in auth:

```js
io("https://your-render-app.onrender.com/tenant-tenant_demo", {
  auth: {
    tenant_id: "tenant_demo",
    session_id: "session_demo"
  }
});
```

## Events

- `customer-message`: sends customer text to the session room. Response includes `should_call_rag`.
- `agent-message`: sends human agent text to the customer room.
- `bot-status-toggle`: accepts `active`, `paused_by_human`, or `closed`.

When a session is `paused_by_human`, `customer-message` stays real-time only and returns `should_call_rag: false`.
