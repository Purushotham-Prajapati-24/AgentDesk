# AgentDesk

> **AI-powered customer support platform** — deploy RAG-enabled chat bots, monitor live sessions with a human kill-switch, and manage your knowledge base, all from a single dashboard.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Magic-link auth** | Passwordless login via Appwrite — no OAuth credentials required |
| **Multi-tenant** | Every account is provisioned its own tenant workspace with credit isolation |
| **Bot builder** | Create, customise, and embed AI support bots in minutes |
| **RAG pipeline** | Documents (PDF, DOCX, TXT) are chunked, embedded via Gemini, and indexed in Qdrant for grounded responses |
| **Embeddable widget** | Single `<script>` tag drops a full chat widget anywhere; inline mode for `/embed/:botId` iframes |
| **Live inbox** | Real-time session monitor with WebSocket; human agents can pause the AI and take over mid-conversation |
| **Credit ledger** | Token-based billing with per-tenant credit tracking visible in the Usage dashboard |
| **Streaming responses** | Server-Sent Events (SSE) stream bot replies token-by-token |

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth & Database | Appwrite Cloud |
| Vector Store | Qdrant Cloud (hybrid dense + sparse) |
| LLM | Google Gemini (chat) + `text-embedding-004` (embeddings) |
| Fallback LLM | Groq (llama-3) |
| Real-time | Socket.IO (separate WebSocket server) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |

---

## 📁 Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login & magic-link verify pages
│   │   ├── (dashboard)/     # Protected dashboard (Bots, Inbox, Knowledge, Usage)
│   │   ├── api/
│   │   │   ├── chat/        # POST /api/chat/message — streaming RAG chat endpoint
│   │   │   ├── documents/   # Document ingestion & management
│   │   │   └── widget/      # GET /api/widget/config/:botId — widget configuration
│   │   └── embed/[botId]/   # Standalone iframe embed page
│   ├── context/             # AuthContext, TenantContext
│   ├── lib/
│   │   ├── server/          # Appwrite admin, Qdrant, LLM providers, retrieval, chunking
│   │   └── credits.ts       # Ledger & credit balance helpers
│   └── components/          # UI component library
├── widget/                  # Widget source (TypeScript → compiled to public/widget.js)
├── websocket-server/        # Standalone Socket.IO server for live handoff
├── scripts/                 # Build scripts (widget bundler, Qdrant setup)
└── public/
    └── widget.js            # Compiled embeddable widget (do not edit directly)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- An [Appwrite Cloud](https://appwrite.io) project
- A [Qdrant Cloud](https://qdrant.io) cluster
- A Google [Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone & install

```bash
git clone https://github.com/your-org/agentdesk.git
cd agentdesk
npm install
```

### 2. Configure environment

Copy the example and fill in your credentials:

```bash
cp .env.example .env.local
```

```env
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your-project-id>
APPWRITE_API_KEY=<your-server-api-key>
NEXT_PUBLIC_APPWRITE_DATABASE_ID=<your-database-id>
NEXT_PUBLIC_APPWRITE_TENANTS_COLLECTION_ID=tenants
NEXT_PUBLIC_APPWRITE_BOTS_COLLECTION_ID=bots
NEXT_PUBLIC_APPWRITE_DOCUMENTS_COLLECTION_ID=document_files
NEXT_PUBLIC_APPWRITE_LEDGER_COLLECTION_ID=ledger
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=<your-bucket-id>

# Qdrant
ENPOINT_URL=https://<cluster>.qdrant.io
API_KEY=<your-qdrant-api-key>

# LLMs
GEMINI_API_KEY=<your-gemini-api-key>
GROQ_API_KEY=<your-groq-api-key>

# WebSocket server (optional — enables live human handoff)
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:4000
WEBSOCKET_URL=http://localhost:4000
```

### 3. Run the development server

```bash
# Next.js app
npm run dev

# WebSocket server (in a separate terminal — only needed for live inbox)
npm run dev:ws
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🧩 Embedding the Widget

Add this single script tag anywhere on your site:

```html
<script
  src="https://your-domain.com/widget.js"
  data-bot-id="<your-bot-id>"
  async
></script>
```

For a full-page iframe embed:

```
https://your-domain.com/embed/<your-bot-id>
```

### Rebuild the widget after source changes

The widget source lives in `widget/index.tsx` and is compiled to `public/widget.js`:

```bash
npm run build:widget
```

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

### `GET /api/widget/config/:botId`

Returns the public bot configuration used by the widget.

---

## 🏛 Appwrite Schema

| Collection | Key Attributes |
|---|---|
| `tenants` | `name`, `plan`, `credits` |
| `bots` | `tenant_id`, `name`, `system_prompt`, `fallback_message` |
| `sessions` | `tenant_id`, `bot_id`, `session_token`, `status`, `created`, `updated` |
| `messages` | `tenant_id`, `session_id`, `sender`, `content`, `tokens_used`, `created` |
| `document_files` | `tenant_id`, `bot_id`, `file_name`, `file_size`, `status` |
| `ledger` | `tenant_id`, `amount`, `tansaction_type`, `description`, `created` |

---

## 🛠 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run dev:ws` | Start the Socket.IO WebSocket server |
| `npm run build` | Build widget then Next.js production bundle |
| `npm run build:widget` | Compile `widget/index.tsx` → `public/widget.js` |
| `npm run qdrant:hybrid` | Create Qdrant hybrid collection with dense + sparse vectors |
| `npm run lint` | Run ESLint |

---

## 🔒 Security

- All dashboard routes require an active Appwrite session (HttpOnly cookie)
- All server actions validate that the authenticated user's `tenant_id` matches the requested tenant
- The chat API runs as an admin client — no user session required from the widget
- Prompt injection patterns are detected and rejected before hitting the LLM
- Credit balance is checked on every request; zero-balance tenants receive the configured fallback message

---

## 📄 License

MIT
