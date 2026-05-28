<div align="center">

<img src="public/logo.png" alt="AgentDesk Logo" width="80" />

# AgentDesk

**AI-powered customer support platform — deploy RAG-enabled chat bots, monitor live sessions with a human kill-switch, and manage your knowledge base, all from a single dashboard.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Appwrite](https://img.shields.io/badge/Appwrite-Cloud-f02e65?logo=appwrite&logoColor=white)](https://appwrite.io)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-c00b6c?logo=qdrant&logoColor=white)](https://qdrant.io)
[![Gemini](https://img.shields.io/badge/Google_Gemini-LLM-4285f4?logo=google&logoColor=white)](https://aistudio.google.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)

[**Live Demo**](https://agentdeskbot.vercel.app) · [**Docs**](https://agentdeskbot.vercel.app/docs) · [**Report Bug**](https://github.com/Purushotham-Prajapati-24/AgentDesk/issues) · [**Request Feature**](https://github.com/Purushotham-Prajapati-24/AgentDesk/issues)

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
| 💳 **Credit Ledger** | Token-based billing with per-tenant credit tracking visible in a Usage dashboard |
| ⚡ **Streaming Responses** | Server-Sent Events (SSE) stream bot replies token-by-token for instant feedback |
| 📄 **Docs Portal** | Public-facing documentation site — no login required |

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
Customer types message
        │
        ▼
POST /api/chat/message
        │
   ┌────▼────────────────────────────┐
   │  1. Validate session token       │
   │  2. Check credit balance         │
   │  3. Detect prompt injection      │
   └────┬────────────────────────────┘
        │
        ▼
   Embed query → text-embedding-004
        │
        ▼
   Qdrant hybrid search
   (dense BM25 + sparse SPLADE)
        │
        ▼
   Top-K context chunks retrieved
        │
        ▼
   Gemini chat (system prompt + context + history)
        │
        ▼
   SSE stream → token by token to widget
        │
        ▼
   Deduct credits from tenant ledger
```

### 2. Document Ingestion Flow

```
Admin uploads file (PDF / DOCX / XLSX / TXT)
        │
        ▼
   File stored → Appwrite Storage
        │
        ▼
   Text extracted (mammoth / unpdf)
        │
        ▼
   Chunked with overlap
        │
        ▼
   Gemini text-embedding-004
        │
        ▼
   Upserted into Qdrant hybrid collection
        │
        ▼
   Document record saved (Appwrite DB)
```

### 3. Live Human Handoff Flow

```
Customer session active (AI responding)
        │
        ▼
   Human agent opens Inbox dashboard
        │
        ▼
   Connects via Socket.IO → room: <session_id>
        │
        ▼
   Agent clicks "Take Over"
        │
        ▼
   WebSocket server sets session → paused_by_human
        │
        ▼
   Next.js checks status before each AI reply
   → AI is silenced until agent releases control
        │
        ▼
   Human types → message broadcast to customer
        │
        ▼
   Agent clicks "Release" → AI resumes
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework |
| **Auth & Database** | Appwrite Cloud | Magic-link auth, collections, file storage |
| **Vector Store** | Qdrant Cloud | Hybrid dense + sparse vector search |
| **LLM (Chat)** | Google Gemini 2.0 | Chat completions with RAG context |
| **LLM (Embeddings)** | `text-embedding-004` | Document & query embedding |
| **Fallback LLM** | Groq (Llama 3) | Resilient fallback when Gemini is unavailable |
| **Real-time** | Socket.IO 4 | Live agent handoff WebSocket server |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Hosting (App)** | Vercel | Next.js deployment |
| **Hosting (WS)** | Render | WebSocket server deployment |
| **Language** | TypeScript 5 | End-to-end type safety |

---

## 📁 Project Structure

```
agentdesk/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Login & magic-link verify pages
│   │   ├── (dashboard)/             # Protected dashboard routes
│   │   │   ├── bots/                # Bot builder & configuration
│   │   │   ├── inbox/               # Live session inbox
│   │   │   ├── monitor/             # Session monitor & handoff
│   │   │   ├── webchat/             # Webchat widget preview & settings
│   │   │   ├── documents/           # Knowledge base management
│   │   │   └── billing/             # Credit usage & ledger
│   │   ├── api/
│   │   │   ├── chat/                # POST /api/chat/message — streaming SSE
│   │   │   ├── documents/           # Document ingestion & management
│   │   │   └── widget/              # GET /api/widget/config/:botId
│   │   ├── docs/                    # Public documentation portal
│   │   └── embed/[botId]/           # Standalone iframe embed page
│   ├── context/                     # AuthContext, TenantContext
│   ├── lib/
│   │   ├── server/                  # Appwrite admin, Qdrant, LLM, retrieval
│   │   └── credits.ts               # Ledger & credit balance helpers
│   ├── components/                  # Shared UI component library
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

### Prerequisites

- **Node.js 20+**
- [Appwrite Cloud](https://appwrite.io) project
- [Qdrant Cloud](https://qdrant.io) cluster
- [Google AI Studio](https://aistudio.google.com/app/apikey) Gemini API key
- [Groq](https://console.groq.com) API key *(optional fallback LLM)*

### 1. Clone & Install

```bash
git clone https://github.com/Purushotham-Prajapati-24/AgentDesk.git
cd AgentDesk
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
# ── Appwrite ────────────────────────────────────────────────────────
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your-project-id>
APPWRITE_API_KEY=<your-server-api-key>
NEXT_PUBLIC_APPWRITE_DATABASE_ID=<your-database-id>
NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID=tenants
NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID=bots
NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID=document_files
NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID=ledger
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=<your-bucket-id>

# ── Qdrant ──────────────────────────────────────────────────────────
ENPOINT_URL=https://<cluster>.qdrant.io
API_KEY=<your-qdrant-api-key>

# ── LLMs ────────────────────────────────────────────────────────────
GEMINI_API_KEY=<your-gemini-api-key>
GROQ_API_KEY=<your-groq-api-key>

# ── WebSocket Server (Live Handoff) ─────────────────────────────────
NEXT_PUBLIC_WEBSOCKET_URL=https://agentdesk-websocket-server.onrender.com
WEBSOCKET_URL=https://agentdesk-websocket-server.onrender.com
```

### 3. Set Up Qdrant Collection

```bash
npm run qdrant:hybrid
```

### 4. Run Development Servers

```bash
# Terminal 1 — Next.js app
npm run dev

# Terminal 2 — Socket.IO WebSocket server (for live inbox)
npm run dev:ws
```

Open [http://localhost:3000](http://localhost:3000) 🚀

---

## 🧩 Embedding the Widget

Drop this single script tag anywhere on your website:

```html
<script
  src="https://agentdeskbot.vercel.app/widget.js"
  data-bot-id="<your-bot-id>"
  async
></script>
```

For a full-page iframe embed:

```html
<iframe
  src="https://agentdeskbot.vercel.app/embed/<your-bot-id>"
  style="width:100%;height:640px;border:0"
  title="Support Chat"
></iframe>
```

### Rebuild widget after source changes

```bash
npm run build:widget
```

---

## 🌐 Deployment

### Next.js App → Vercel

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Set `NEXT_PUBLIC_WEBSOCKET_URL` to `https://agentdesk-websocket-server.onrender.com`
5. Deploy ✅

### WebSocket Server → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect the `websocket-server/` directory (or set root as the repo and use start command below)
3. **Start command:** `node websocket-server/server.js`
4. **Environment variables:**
   ```env
   PORT=4000
   CORS_ORIGIN=https://agentdeskbot.vercel.app
   ```
5. *(Optional)* Add `SOCKET_IO_REDIS_URL` for clustered pub/sub via Upstash Redis
6. Deploy → copy the public URL
7. Update `NEXT_PUBLIC_WEBSOCKET_URL=https://agentdesk-websocket-server.onrender.com` in Vercel ✅

---

## 🔌 API Reference

### `POST /api/chat/message`

Streams a bot response via Server-Sent Events.

**Request body**
```json
{
  "bot_id": "string",
  "tenant_id": "string",
  "session_token": "string",
  "message": "string (max 1200 chars)"
}
```

**Response** — `text/event-stream`
```
data: {"token":"Hello"}
data: {"token":", how"}
data: [DONE]
```

---

### `GET /api/widget/config/:botId`

Returns the public bot configuration consumed by the widget.

**Response**
```json
{
  "name": "Support Bot",
  "systemPrompt": "...",
  "fallbackMessage": "...",
  "widgetColor": "#0f172a",
  "widgetIconUrl": "https://..."
}
```

---

## 🏛️ Appwrite Schema

| Collection | Key Attributes |
|---|---|
| `tenants` | `name`, `plan`, `credits` |
| `bots` | `tenant_id`, `name`, `system_prompt`, `fallback_message`, `widget_color`, `widget_icon_url` |
| `sessions` | `tenant_id`, `bot_id`, `session_token`, `status`, `created`, `updated` |
| `messages` | `tenant_id`, `session_id`, `sender`, `content`, `tokens_used`, `created` |
| `document_files` | `tenant_id`, `bot_id`, `file_name`, `file_size`, `status` |
| `ledger` | `tenant_id`, `amount`, `transaction_type`, `description`, `created` |

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run dev:ws` | Start the Socket.IO WebSocket server |
| `npm run build` | Build widget then Next.js production bundle |
| `npm run build:widget` | Compile `widget/index.tsx` → `public/widget.js` |
| `npm run qdrant:hybrid` | Create Qdrant hybrid collection (dense + sparse vectors) |
| `npm run lint` | Run ESLint |

---

## 🔒 Security

- All dashboard routes require an active Appwrite session (HttpOnly cookie)
- Server actions validate that `tenant_id` matches the authenticated user
- The chat API runs as an admin client — no user session required from the widget
- Prompt injection patterns are detected and rejected before hitting the LLM
- Credit balance is checked on every request; zero-balance tenants receive the configured fallback message

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

---

## 📄 License

[MIT](LICENSE) © 2026 AgentDesk
