# AgentDesk

AgentDesk is a multi-tenant AI support platform for teams that need grounded customer answers, live operator takeover, and an embeddable chat surface. The app combines a protected support dashboard, RAG-backed chat APIs, document and URL ingestion, credit metering, and a standalone Socket.IO handoff service.

[Live demo](https://agentdeskbot.vercel.app) | [Docs](https://agentdeskbot.vercel.app/docs) | [Issues](https://github.com/Purushotham-Prajapati-24/AgentDesk/issues)

## Screenshots

The screenshots below are indexed copies from the Playwright verification output in `.design/playwright-verification-2026-05-31T07-55-21-362Z/`.

| Index | Surface | Screenshot |
| --- | --- | --- |
| 01 | Public landing page | ![01 - public landing page](public/readme-screenshots/01-home-landing.png) |
| 02 | Live inbox and human handoff | ![02 - live inbox and human handoff](public/readme-screenshots/02-live-inbox-handoff.png) |
| 03 | WebChat customizer | ![03 - WebChat customizer](public/readme-screenshots/03-webchat-customizer.png) |
| 04 | Knowledge ingestion | ![04 - knowledge ingestion](public/readme-screenshots/04-knowledge-ingestion.png) |
| 05 | Billing and usage | ![05 - billing and usage](public/readme-screenshots/05-billing-usage.png) |
| 06 | Mobile landing page | ![06 - mobile landing page](public/readme-screenshots/06-mobile-home.png) |

## What It Does

- Creates tenant-scoped support bots with their own prompts, fallback messages, widget identity, appearance, deployment settings, and feature flags.
- Lets teams upload or crawl support knowledge from PDF, DOC, DOCX, XLSX, XLS, CSV, TXT, Markdown, public URLs, and sitemaps.
- Chunks source content, embeds it with Gemini, and stores searchable vectors in Qdrant.
- Streams grounded bot replies through Server-Sent Events.
- Tracks sessions, messages, and tenant credit usage in Appwrite.
- Provides an operator inbox where a human can pause automation, reply directly, and release the session back to AI.
- Ships an embeddable widget through `public/widget.js`, iframe embeds through `/embed/[botId]`, and framework adapters under `widget/`.
- Includes a public documentation portal and protected dashboard sections for bots, WebChat, knowledge, inbox, monitoring, and billing.

## Tech Stack

| Layer | Technology |
| --- | --- |
| App framework | Next.js 16.2.6 App Router |
| UI runtime | React 19.2.4, TypeScript 5, Tailwind CSS 4 |
| Auth, database, storage | Appwrite Cloud |
| Vector database | Qdrant Cloud |
| Embeddings | Gemini embedding model |
| Chat providers | Gemini by default, with Groq and OpenAI-compatible fallbacks supported by env configuration |
| Realtime handoff | Socket.IO service in `websocket-server/` |
| Document parsing | `mammoth`, `unpdf`, `xlsx`, `jsdom`, `@mozilla/readability`, `turndown` |
| Verification tooling | Node test runner, ESLint, Playwright screenshots |

## Architecture

```text
Customer site
  |
  | script tag or iframe
  v
AgentDesk Next.js app
  |
  |-- Public surfaces
  |     |-- /                 landing page
  |     |-- /docs             documentation portal
  |     |-- /embed/[botId]    iframe chat surface
  |     |-- /widget.js        compiled embeddable widget
  |
  |-- Protected dashboard
  |     |-- /bots             bot studio
  |     |-- /webchat          widget configuration
  |     |-- /documents        file and URL ingestion
  |     |-- /inbox            live handoff cockpit
  |     |-- /monitor          analytics, users, conversations
  |     |-- /billing          credit usage and ledger
  |
  |-- API routes
        |-- /api/chat/message
        |-- /api/v1/chat/message
        |-- /api/documents/upload
        |-- /api/documents/url
        |-- /api/documents/ingest
        |-- /api/v1/ingest/upload
        |-- /api/v1/ingest/url
        |-- /api/widget/config/[botId]
        |-- /api/webchat/config
        |-- /api/webchat/config/update

External services
  |
  |-- Appwrite: auth, tenant data, bots, documents, sessions, messages, ledger, storage
  |-- Qdrant: dense and optional hybrid retrieval indexes
  |-- Gemini/Groq/OpenAI-compatible APIs: answer generation
  |-- Socket.IO service: realtime customer-agent handoff
  |-- Optional Browserless: dynamic page crawling
```

## Main Flows

### Chat Response

1. Widget or embed page sends a customer message to `/api/chat/message`.
2. The API validates identifiers, checks credit balance, and screens prompt-injection patterns.
3. The message is embedded and used to retrieve tenant- and bot-filtered context from Qdrant.
4. The selected LLM provider generates an answer from the system prompt, chat history, and retrieved chunks.
5. The response streams back as `text/event-stream`.
6. Session messages and credit ledger entries are persisted in Appwrite.

### Knowledge Ingestion

1. The dashboard uploads a file or submits a URL through the document APIs.
2. Text is extracted from the source, with optional Browserless hydration for dynamic pages.
3. Content is normalized, chunked, embedded, and written to Qdrant.
4. Appwrite ingestion locks and deterministic Qdrant point IDs prevent duplicate processing during retries.

### Human Handoff

1. A customer session connects to the Socket.IO handoff service.
2. The inbox subscribes to the tenant/session room.
3. An operator can set the session to `paused_by_human`.
4. While paused, customer messages stay realtime and do not trigger RAG responses.
5. The operator can release the session so automation resumes.

## Project Structure

```text
src/
  app/
    (auth)/                 login and magic-link verification
    (dashboard)/            protected app routes
    api/                    chat, ingestion, widget, and WebChat APIs
    docs/                   public docs page
    embed/[botId]/          standalone widget embed route
  components/               shared UI components
  context/                  auth, tenant, and WebChat config providers
  lib/
    server/                 Appwrite admin, parsing, embeddings, retrieval, Qdrant, LLM providers
    credits.ts              credit and ledger helpers
  types/                    project type declarations
widget/                     embeddable widget source and adapters
websocket-server/           standalone Socket.IO handoff service
scripts/                    widget build and Appwrite/Qdrant setup scripts
docs/                       design, product, schema, and feature documentation
public/readme-screenshots/  indexed README screenshots
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- Appwrite project with database, storage bucket, and API key
- Qdrant cluster
- Gemini API key
- Optional Groq or OpenAI-compatible API key for chat fallback
- Optional Browserless API key for JavaScript-heavy URL ingestion
- Optional Upstash Redis for durable handoff state and Socket.IO clustering

### Install

```bash
git clone https://github.com/Purushotham-Prajapati-24/AgentDesk.git
cd AgentDesk
npm install
```

### Configure Environment

Create `.env.local` and provide the values needed for the surfaces you run.

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

The code also accepts the legacy Qdrant variable names `ENPOINT_URL` and `API_KEY`.

### Provision Appwrite And Qdrant

```bash
npm run setup:ingestion
npm run qdrant:hybrid
```

If you are using WebChat config documents, also run:

```bash
node --env-file=.env.local scripts/setup-webchat-configs.mjs
```

### Run Locally

```bash
npm run dev
```

In a second terminal, start realtime handoff:

```bash
npm run dev:ws
```

Open `http://localhost:3000`.

## Widget Embeds

Script-tag install:

```html
<script
  src="https://agentdeskbot.vercel.app/widget.js"
  data-bot-id="YOUR_BOT_ID"
  async
></script>
```

Iframe install:

```html
<iframe
  src="https://agentdeskbot.vercel.app/embed/YOUR_BOT_ID"
  style="width:100%;height:640px;border:0"
  title="AgentDesk Support"
></iframe>
```

Rebuild `public/widget.js` after editing `widget/`:

```bash
npm run build:widget
```

## API Reference

### `POST /api/chat/message`

Streams a bot response.

```json
{
  "bot_id": "bot_id",
  "tenant_id": "tenant_id",
  "session_token": "session_token",
  "message": "How do I reset my password?"
}
```

Response content type: `text/event-stream`.

### `GET /api/widget/config/[botId]`

Returns public widget configuration for a bot.

### `POST /api/documents/upload`

Uploads a tenant-scoped source file into Appwrite Storage and creates document metadata.

### `POST /api/documents/url`

Queues URL or sitemap ingestion.

### `POST /api/documents/ingest`

Processes pending document text into chunks, embeddings, and Qdrant points.

## WebSocket Service

The handoff server lives in `websocket-server/` and defaults to port `4000`.

```bash
cd websocket-server
npm install
npm start
```

Useful environment variables:

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

Without Redis, the service uses in-memory state for local development.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run dev:ws` | Start the Socket.IO server from `websocket-server/` |
| `npm run build` | Build the widget and then the Next.js production app |
| `npm run build:widget` | Compile `widget/` into `public/widget.js` |
| `npm run qdrant:hybrid` | Create the Qdrant hybrid collection and indexes |
| `npm run setup:ingestion` | Create Appwrite ingestion metadata and lock schema |
| `npm run test` | Run Node test files in `test/` |
| `npm run lint` | Run ESLint |

## Deployment

### Next.js App On Vercel

1. Import the GitHub repository into Vercel.
2. Add the same production environment variables used locally.
3. Set `NEXT_PUBLIC_APP_URL` to the production app URL.
4. Set `NEXT_PUBLIC_WEBSOCKET_URL` and `WEBSOCKET_URL` to the deployed Socket.IO service.
5. Deploy.

### Socket.IO Service On Render

1. Create a Render web service.
2. Use `websocket-server/` as the service root, or keep the repo root and set the start command to `node websocket-server/server.js`.
3. Set `PORT`, `CORS_ORIGIN`, Appwrite variables, and optional Redis variables.
4. Deploy and copy the Render URL into the Next.js app environment.

## Documentation

- `docs/Features.md` is the maintained feature catalog.
- `docs/Schema.md` documents the Appwrite data model.
- `docs/WebChat.md` covers WebChat behavior.
- `docs/WebsiteIngestion.md` and `docs/UrlToChunking.md` describe URL ingestion.
- `websocket-server/README.md` documents realtime handoff events.

## Notes

- `public/widget.js` is generated; edit files in `widget/` and rebuild.
- This repository currently does not include a license file.
- Keep README screenshots indexed and copied under `public/readme-screenshots/` so GitHub renders them reliably.
