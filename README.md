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

## Overview

AgentDesk is a full-stack support automation system for teams that need AI answers they can audit and override. It provides a protected operator dashboard, tenant-scoped bots, document and website ingestion, vector retrieval, streaming chat responses, usage credits, and a Socket.IO-backed inbox where human agents can pause automation and take over a conversation.

The project is built as a Next.js App Router application with a separate realtime service for handoff state and live messaging.

## Core Capabilities

| Area | Capability |
| --- | --- |
| Multi-tenancy | Tenant-scoped bots, documents, sessions, messages, credits, and retrieval filters. |
| Authentication | Appwrite-backed passwordless login and protected dashboard routes. |
| Bot studio | Create and configure support bots with prompts, fallbacks, identity, and WebChat settings. |
| WebChat | Embeddable script widget, iframe route, customer-facing preview, and framework adapters under `widget/`. |
| Knowledge base | Upload and ingest PDF, DOC, DOCX, XLSX, XLS, CSV, TXT, Markdown, public URLs, and sitemaps. |
| RAG pipeline | Chunking, Gemini embeddings, Qdrant indexing, tenant/bot-filtered retrieval, and grounded prompting. |
| Streaming chat | Server-Sent Events response streaming through `/api/chat/message` and `/api/v1/chat/message`. |
| Human handoff | Socket.IO inbox with session monitoring, AI pause, human reply, and release-to-AI controls. |
| Billing | Credit balance checks, token charging, and ledger-backed usage tracking. |
| Operations | Setup scripts for Qdrant hybrid indexes and Appwrite ingestion schema. |

## Product Screenshots

Curated screenshots are copied from the Playwright verification output into `public/readme-screenshots/` with stable numeric names.

| 01 - Landing | 02 - Live Inbox |
| --- | --- |
| ![AgentDesk public landing page](public/readme-screenshots/01-home-landing.png) | ![AgentDesk live inbox and handoff controls](public/readme-screenshots/02-live-inbox-handoff.png) |

| 03 - WebChat Customizer | 04 - Knowledge Ingestion |
| --- | --- |
| ![AgentDesk WebChat customizer](public/readme-screenshots/03-webchat-customizer.png) | ![AgentDesk knowledge ingestion dashboard](public/readme-screenshots/04-knowledge-ingestion.png) |

| 05 - Billing | 06 - Mobile |
| --- | --- |
| ![AgentDesk billing and usage dashboard](public/readme-screenshots/05-billing-usage.png) | ![AgentDesk mobile landing page](public/readme-screenshots/06-mobile-home.png) |

## Architecture

```text
Customer Website
  |
  |-- <script src="/widget.js" data-bot-id="...">
  |-- <iframe src="/embed/[botId]">
  v
Next.js Application
  |
  |-- Public routes
  |     |-- /                  Marketing and product entry
  |     |-- /docs              Public documentation
  |     |-- /embed/[botId]     Standalone WebChat surface
  |
  |-- Protected dashboard
  |     |-- /bots              Bot configuration
  |     |-- /webchat           WebChat identity, appearance, deployment, feature flags
  |     |-- /documents         File and URL ingestion
  |     |-- /inbox             Human handoff cockpit
  |     |-- /monitor           Analytics, users, and conversations
  |     |-- /billing           Credit balance and ledger
  |
  |-- API layer
        |-- /api/chat/message
        |-- /api/v1/chat/message
        |-- /api/documents/upload
        |-- /api/documents/url
        |-- /api/documents/ingest
        |-- /api/widget/config/[botId]
        |-- /api/webchat/config
        |-- /api/webchat/config/update

External Services
  |
  |-- Appwrite        Auth, database, storage, tenant records, sessions, messages, ledger
  |-- Qdrant          Vector storage and hybrid retrieval
  |-- Gemini          Embeddings and default chat provider
  |-- Groq/OpenAI     Optional chat provider fallback
  |-- Socket.IO       Realtime human handoff service
  |-- Browserless     Optional dynamic website crawling
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

## Local Development

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
