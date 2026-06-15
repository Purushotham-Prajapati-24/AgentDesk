# @agentdesk/react

> Official React & Next.js SDK for the [AgentDesk](https://agentdesk.ai) AI chat widget.

[![npm](https://img.shields.io/npm/v/@agentdesk/react)](https://www.npmjs.com/package/@agentdesk/react)

---

## Installation

```bash
npm install @agentdesk/react
# or
yarn add @agentdesk/react
# or
pnpm add @agentdesk/react
```

React 18+ is required as a peer dependency.

---

## Usage

### Plain React

```tsx
import { AgentDeskWidget } from '@agentdesk/react';

export default function App() {
  return (
    <>
      <YourApp />
      <AgentDeskWidget botId="your-bot-id" />
    </>
  );
}
```

### Next.js — App Router (`app/`)

Import from the `/nextjs` subpath to get an SSR-safe version:

```tsx
// app/layout.tsx
import { AgentDeskWidget } from '@agentdesk/react/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AgentDeskWidget botId="your-bot-id" />
      </body>
    </html>
  );
}
```

### Next.js — Pages Router (`pages/`)

```tsx
// pages/_app.tsx
import { AgentDeskWidget } from '@agentdesk/react/nextjs';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <AgentDeskWidget botId="your-bot-id" />
    </>
  );
}
```

### Cross-origin / Self-hosted

If your widget backend runs on a different domain than the page embedding it:

```tsx
<AgentDeskWidget
  botId="your-bot-id"
  apiOrigin="https://support.yourapp.com"
  scriptSrc="https://support.yourapp.com/widget.js"
/>
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `botId` | `string` | — | **Required.** The Bot ID from your AgentDesk dashboard. |
| `mode` | `'launcher' \| 'inline'` | `'launcher'` | `'launcher'` = floating bubble. `'inline'` = fills container. |
| `scriptSrc` | `string` | `'/widget.js'` | URL to the `widget.js` file. |
| `apiOrigin` | `string` | — | Base URL of your AgentDesk backend (for cross-origin embeds). |
| `configUrl` | `string` | auto-derived | Override the config fetch URL. |
| `onOpen` | `() => void` | — | Called when the chat is opened. |
| `onClose` | `() => void` | — | Called when the chat is closed. |

---

## License

MIT
