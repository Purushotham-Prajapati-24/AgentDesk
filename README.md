<div align="center">

# AgentDesk

Multi-tenant AI customer support platform with RAG-grounded answers, an embeddable WebChat widget, credit metering, and live human handoff.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Appwrite](https://img.shields.io/badge/Appwrite-25.x-f02e65?logo=appwrite&logoColor=white)](https://appwrite.io/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Cloud-dc244c)](https://qdrant.tech/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io&logoColor=white)](https://socket.io/)

[Live Demo](https://agentdeskbot.vercel.app) | [Documentation](https://agentdeskbot.vercel.app/docs) | [Report an Issue](https://github.com/Purushotham-Prajapati-24/AgentDesk/issues)

</div>

---

## 📸 Screenshots

> Dashboard · Bot Builder · Live Inbox · Embeddable Widget

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Magic-link Auth** | Passwordless login via Appwrite — no OAuth credentials required |
| 🏢 **Multi-tenant** | Every account gets its own isolated workspace with independent credit ledger |
| 🤖 **Bot Builder** | Create, configure, and embed AI support bots in minutes with a visual editor |
| 🧠 **RAG Pipeline** | PDF, DOCX, XLSX, and TXT docs are chunked, embedded via Gemini, and indexed in Qdrant for grounded answers |
| 🪄 **Embeddable Widget** | Single `<script>` tag drops a full branded chat widget anywhere on the web |
| 📡 **Live Inbox** | Real-time session monitor — human agents can pause the AI and take over mid-conversation |
| 📊 **Real-time Monitor** | Analytics dashboard to track conversation metrics, watch live chats unfold, and view active user records |
| 💳 **Credit Ledger** | Token-based billing with per-tenant credit tracking visible in a Usage dashboard |
| ⚡ **Streaming Responses** | Server-Sent Events (SSE) stream bot replies token-by-token for instant feedback |
| 📄 **Docs Portal** | Public-facing documentation site — no login required |

See [`docs/Features.md`](docs/Features.md) for the maintained feature catalog.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER / CUSTOMER                              │
│                    (Embedded Widget / iframe)                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  script tag / iframe embed
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│               AGENTDESK — Next.js 16 App (Vercel)                   │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │   /embed    │   │  Dashboard   │   │      API Routes           │ │
│  │  [botId]    │   │  (protected) │   │  /api/chat/message (SSE)  │ │
│  └──────┬──────┘   │  ┌─────────┐ │   │  /api/widget/config       │ │
│         │           │  │  Bots   │ │   │  /api/documents/*         │ │
│  widget.js          │  │  Inbox  │ │   └───────────┬──────────────┘ │
│  (compiled)         │  │  Docs   │ │               │                │
│                     │  │  Usage  │ │   ┌───────────▼──────────────┐ │
│                     │  └─────────┘ │   │       RAG Pipeline        │ │
│                     └──────────────┘   │  Gemini Embed → Qdrant   │ │
│                                        │  Retrieval → LLM Prompt   │ │
│                                        └──────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌───────────┐  ┌────────────────┐
   │  Appwrite   │ │  Qdrant   │  │  WebSocket Srv │
   │   Cloud     │ │  Cloud    │  │  (Render)      │
   │  Auth / DB  │ │  Vectors  │  │  Socket.IO     │
   │  Storage    │ │  Hybrid   │  │  Live Handoff  │
   └─────────────┘ └───────────┘  └────────────────┘
          ▲                               ▲
          │                               │
   ┌──────┴──────────────────────────────┐│
   │          HUMAN AGENT (Dashboard)    ││
   │    Monitors sessions in real-time   ││
   │    Can pause AI & take over chat ───┘│
   └──────────────────────────────────────┘
```

---

## 🔄 Workflows

### 1. User Chat Flow (RAG Pipeline)

```

## Repository Layout

```text
src/
  app/
    (auth)/                 Login and magic-link verification
    (dashboard)/            Protected dashboard routes
    api/                    Chat, ingestion, widget, and WebChat APIs
    docs/                   Public documentation route
    embed/[botId]/          Iframe-compatible chat route
  components/               Shared UI components
  context/                  Auth, tenant, and WebChat providers
  lib/
    server/                 Appwrite admin, parsing, embeddings, retrieval, Qdrant, LLM providers
    credits.ts              Credit and ledger helpers
  types/                    Shared TypeScript declarations
widget/                     Embeddable widget source and framework adapters
websocket-server/           Standalone Socket.IO handoff server
scripts/                    Build and provisioning scripts
docs/                       Product, architecture, schema, and design notes
public/readme-screenshots/  README screenshot assets
```

## Technology Stack

| Layer | Implementation |
| --- | --- |
| Framework | Next.js 16.2.6 App Router |
| UI | React 19.2.4, Tailwind CSS 4, Lucide icons |
| Language | TypeScript 5 |
| Auth and data | Appwrite Cloud, `appwrite`, `node-appwrite` |
| Vector search | Qdrant Cloud, `@qdrant/js-client-rest` |
| LLM orchestration | Gemini by default, Groq and OpenAI-compatible fallback support |
| Realtime | Socket.IO server in `websocket-server/` |
| Parsing and ingestion | `mammoth`, `unpdf`, `xlsx`, `jsdom`, `@mozilla/readability`, `turndown` |
| Validation | Zod |
| Verification | ESLint, Node test runner, Playwright screenshot verification |

## Prerequisites

- Node.js 20 or newer
- npm
- Appwrite project with database, storage bucket, and server API key
- Qdrant cluster and API key
- Gemini API key
- Optional Groq or OpenAI-compatible API key for fallback generation
- Optional Browserless API key for JavaScript-heavy URL ingestion
- Optional Upstash Redis for durable websocket state and clustered Socket.IO pub/sub

```
agentdesk/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Login & magic-link verify pages
│   │   ├── (dashboard)/             # Protected dashboard routes
│   │   │   ├── bots/                # Bot builder & configuration
│   │   │   ├── inbox/               # Live session inbox
│   │   │   ├── monitor/             # Session monitor & handoff
│   │   │   │   ├── analytics/       # Conversation analytics & metrics charts
│   │   │   │   ├── conversations/   # Real-time customer chat visualizer
│   │   │   │   └── users/           # User listing & tracking dashboard
│   │   │   ├── webchat/             # Webchat widget preview & settings
│   │   │   ├── documents/           # Knowledge base management
│   │   │   └── billing/             # Credit usage & ledger
│   │   ├── api/
│   │   │   ├── chat/                # POST /api/chat/message — streaming SSE
│   │   │   ├── documents/           # Document ingestion & management
│   │   │   └── widget/              # GET /api/widget/config/:botId
│   │   ├── docs/                    # Public documentation portal
│   │   ├── embed/[botId]/           # Standalone iframe embed page
│   │   └── monitor-actions.ts       # Server actions for conversation & user analytics
│   ├── context/                     # AuthContext, TenantContext
│   ├── lib/
│   │   ├── server/                  # Appwrite admin, Qdrant, LLM, retrieval
│   │   └── credits.ts               # Ledger & credit balance helpers
│   ├── components/                  # Shared UI component library
│   │   └── ui/
│   │       └── Signal.tsx           # Reusable server/connection status component
│   └── types/                       # Shared TypeScript types
│
├── widget/                          # Widget source (TypeScript)
│   └── index.tsx                    # Compiled → public/widget.js
│
├── websocket-server/                # Standalone Socket.IO handoff server
│   ├── server.js                    # Express + Socket.IO server
│   └── session-store.js             # In-memory / Upstash Redis session state
│
├── scripts/                         # Build & setup scripts
│   ├── build-widget.mjs             # Bundles widget/index.tsx → public/widget.js
│   └── create-qdrant-hybrid.mjs     # Creates Qdrant collection with hybrid vectors
│
└── public/
    └── widget.js                    # Compiled embeddable widget (do not edit directly)
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
git clone https://github.com/Purushotham-Prajapati-24/AgentDesk.git
cd AgentDesk
npm install
```

### 2. Configure Environment

Create `.env.local` in the repository root.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-server-api-key
NEXT_PUBLIC_APPWRITE_DATABASE_ID=agentdesk
APPWRITE_DATABASE_ID=agentdesk
NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID=tenants
NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID=bots
NEXT_PUBLIC_APPWRITE_WEBCHAT_CONFIGS_COLLECTION_ID=webchat_configs
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=documents
APPWRITE_DOCUMENTS_BUCKET_ID=documents
APPWRITE_DOCUMENT_FILES_COLLECTION_ID=document_files
APPWRITE_INGESTION_LOCKS_COLLECTION_ID=ingestion_locks
APPWRITE_SESSIONS_COLLECTION_ID=sessions
APPWRITE_MESSAGES_COLLECTION_ID=messages
NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID=ledger

QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
QDRANT_COLLECTION=agent_knowledge_base
QDRANT_COLLECTION_V2=agent_knowledge_base_v2
RAG_INDEX_VERSION=v2

GEMINI_API_KEY=your-gemini-api-key
GEMINI_CHAT_MODEL=gemini-2.0-flash
LLM_PROVIDER_ORDER=gemini,groq,openai
GROQ_API_KEY=
GROQ_CHAT_MODEL=llama-3.3-70b-versatile
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_COMPAT_API_KEY=
OPENAI_COMPAT_CHAT_URL=
OPENAI_COMPAT_CHAT_MODEL=

NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:4000
WEBSOCKET_URL=http://localhost:4000

BROWSERLESS_API_KEY=
CREDIT_PER_TOKEN=0.001
```

The Qdrant scripts also accept the legacy variable names `ENPOINT_URL` and `API_KEY`.

### 3. Provision Required Services

```bash
npm run setup:ingestion
npm run qdrant:hybrid
```

If your Appwrite project does not already contain the WebChat config collection, run:

```bash
node --env-file=.env.local scripts/setup-webchat-configs.mjs
```

### 4. Start The App

```bash
npm run dev
```

Start the realtime handoff service in a second terminal:

```bash
npm run dev:ws
```

The app runs at `http://localhost:3000`; the Socket.IO service defaults to `http://localhost:4000`.

## WebChat Embeds

Script embed:

```html
<script
  src="https://agentdeskbot.vercel.app/widget.js"
  data-bot-id="YOUR_BOT_ID"
  async
></script>
```

Iframe embed:

```html
<iframe
  src="https://agentdeskbot.vercel.app/embed/YOUR_BOT_ID"
  style="width:100%;height:640px;border:0"
  title="AgentDesk Support"
></iframe>
```

Rebuild the compiled widget after changes under `widget/`:

```bash
npm run build:widget
```

## Runtime Workflows

### RAG Chat

1. A customer message reaches `/api/chat/message`.
2. The route validates tenant, bot, session, credits, and prompt-injection rules.
3. The query is embedded and sent to Qdrant with tenant and bot filters.
4. Retrieved chunks are injected into the provider prompt.
5. The answer streams back over Server-Sent Events.
6. Messages and ledger transactions are persisted in Appwrite.

### Knowledge Ingestion

1. Operators upload a file or submit a URL from the dashboard.
2. Source content is extracted, normalized, and chunked.
3. Chunks are embedded with Gemini and upserted to Qdrant.
4. Appwrite-backed locks and deterministic Qdrant IDs make retries idempotent.

### Live Handoff

1. The customer session and operator inbox join the same Socket.IO session room.
2. The operator can mark the session `paused_by_human`.
3. Customer messages continue in realtime but no longer trigger RAG generation.
4. The operator replies manually and can later release control back to AI.

## API Surface

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/chat/message` | Stream a bot response with RAG context. |
| `POST` | `/api/v1/chat/message` | Versioned chat endpoint. |
| `POST` | `/api/documents/upload` | Upload file metadata and storage object for ingestion. |
| `POST` | `/api/documents/url` | Queue URL or sitemap ingestion. |
| `POST` | `/api/documents/ingest` | Process pending documents into vector chunks. |
| `POST` | `/api/v1/ingest/upload` | Versioned upload ingestion endpoint. |
| `POST` | `/api/v1/ingest/url` | Versioned URL ingestion endpoint. |
| `GET` | `/api/widget/config/[botId]` | Return public widget configuration. |
| `GET` | `/api/webchat/config` | Read dashboard WebChat configuration. |
| `POST` | `/api/webchat/config/update` | Persist WebChat configuration changes. |

Example chat request:

```json
{
  "bot_id": "bot_123",
  "tenant_id": "tenant_123",
  "session_token": "session_123",
  "message": "How can I update my billing email?"
}
```

Successful chat responses stream as `text/event-stream`.

## WebSocket Service

The handoff service is isolated in `websocket-server/`.

```bash
cd websocket-server
npm install
npm start
```

Key environment variables:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SOCKET_IO_REDIS_URL=
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=agentdesk
APPWRITE_SESSIONS_COLLECTION_ID=sessions
```

Without Redis, session state is stored in memory and is suitable only for local development or single-instance testing.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run dev:ws` | Start the Socket.IO handoff service. |
| `npm run build` | Build `public/widget.js` and the production Next.js app. |
| `npm run build:widget` | Compile the widget source. |
| `npm run start` | Start the built Next.js app. |
| `npm run qdrant:hybrid` | Create the Qdrant hybrid collection and indexes. |
| `npm run setup:ingestion` | Create Appwrite ingestion metadata and lock schema. |
| `npm run test` | Run Node test files in `test/`. |
| `npm run lint` | Run ESLint. |

## Deployment

### Next.js Application

Deploy the application to Vercel or another Node-compatible Next.js host.

1. Set all production environment variables.
2. Set `NEXT_PUBLIC_APP_URL` to the production app origin.
3. Set `NEXT_PUBLIC_WEBSOCKET_URL` and `WEBSOCKET_URL` to the deployed handoff service.
4. Run `npm run build`.
5. Start with `npm run start` or the hosting provider's Next.js runtime.

### Socket.IO Handoff Service

Deploy `websocket-server/` as a separate Node service, commonly on Render.

1. Set the service root to `websocket-server/`, or run `node websocket-server/server.js` from the repository root.
2. Configure `PORT`, `CORS_ORIGIN`, Appwrite variables, and optional Redis variables.
3. Update the Next.js app with the service URL.

## Security And Operational Notes

- Dashboard routes are protected by Appwrite session handling.
- Server-side Appwrite access uses `APPWRITE_API_KEY`; do not expose this key to the browser.
- Widget-facing APIs must use tenant and bot filters for retrieval isolation.
- Chat requests check available credits before provider calls.
- Prompt-injection patterns are screened before LLM generation.
- `public/widget.js` is generated; edit `widget/` source files and rebuild.
- `public/readme-screenshots/` contains curated README assets; raw Playwright output remains ignored through `.design`.
- This repository currently does not include a license file.

## Reference Documentation

- [`docs/Features.md`](docs/Features.md) - maintained feature catalog.
- [`docs/Schema.md`](docs/Schema.md) - Appwrite collection model.
- [`docs/WebChat.md`](docs/WebChat.md) - WebChat behavior and configuration.
- [`docs/WebsiteIngestion.md`](docs/WebsiteIngestion.md) - website ingestion details.
- [`docs/UrlToChunking.md`](docs/UrlToChunking.md) - URL-to-vector flow.
- [`websocket-server/README.md`](websocket-server/README.md) - handoff server events and runtime behavior.
