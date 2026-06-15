<div align="center">

# `@agentdeskbot/react`

**Drop-in React & Next.js SDK for the AgentDesk AI chat widget.**

Embed a fully-typed, RAG-grounded support bot in your React app in under 30 seconds — no `<script>` tag wrangling, no `useEffect` boilerplate, no SSR gymnastics.

[![npm version](https://img.shields.io/npm/v/@agentdeskbot/react?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@agentdeskbot/react)
[![npm downloads](https://img.shields.io/npm/dm/@agentdeskbot/react?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@agentdeskbot/react)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentdeskbot/react?color=success)](https://bundlephobia.com/package/@agentdeskbot/react)
[![license](https://img.shields.io/npm/l/@agentdeskbot/react?color=blue)](./LICENSE)
[![React](https://img.shields.io/badge/React-%E2%89%A518-149eca?logo=react&logoColor=white)](https://react.dev)
[![Next.js](https://img.shields.io/badge/Next.js-%E2%89%A513-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage by Framework](#usage-by-framework)
  - [Plain React (CRA, Vite, Remix)](#plain-react-cra-vite-remix)
  - [Next.js App Router](#nextjs-app-router)
  - [Next.js Pages Router](#nextjs-pages-router)
  - [Cross-origin / Self-hosted Embeds](#cross-origin--self-hosted-embeds)
- [Props API](#props-api)
- [Lifecycle Events](#lifecycle-events)
- [Advanced](#advanced)
  - [Multiple bots on the same page](#multiple-bots-on-the-same-page)
  - [Programmatic control](#programmatic-control)
  - [Manual script-tag fallback](#manual-script-tag-fallback)
- [How it works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Migrating to v0.1.0](#migrating-to-v010)
- [Related Packages](#related-packages)
- [License](#license)

---

## Features

- **One component, zero config** — `<AgentDeskWidget botId="…" />` is everything you need.
- **SSR-safe for Next.js** — dedicated `/nextjs` subpath with `next/dynamic({ ssr: false })` baked in.
- **Strictly typed** — full TypeScript surface, including inferred prop types and event payloads.
- **Zero runtime deps outside React** — `react`, `react-dom`, and `next` (optional) are externalized.
- **Tree-shakable** — `"sideEffects": false`; ESM and CJS bundles ship with `.d.ts` declarations.
- **Idempotent injection** — the SDK deduplicates scripts so re-mounts (StrictMode, HMR) don't double-load the widget.
- **Origin-validated events** — `postMessage` listeners verify `event.origin` and the `botId` payload before invoking callbacks.

---

## Quick Start

```tsx
import { AgentDeskWidget } from '@agentdeskbot/react';

export default function App() {
  return (
    <>
      <YourApp />
      <AgentDeskWidget botId="YOUR_BOT_ID" />
    </>
  );
}
```

That's it. The widget will mount as a floating launcher bubble in the bottom-right corner of your page.

---

## Installation

```bash
# npm
npm install @agentdeskbot/react

# yarn
yarn add @agentdeskbot/react

# pnpm
pnpm add @agentdeskbot/react
```

**Peer dependencies** *(automatically installed alongside in modern setups)*

| Package | Required | Optional | Supported versions |
| --- | --- | --- | --- |
| `react` | ✅ | — | `>= 18.0.0` |
| `react-dom` | ✅ | — | `>= 18.0.0` |
| `next` | — | ✅ | `>= 13.0.0` *(only required if you import from `/nextjs`)* |

> **Note:** If you are on an older React (≤ 17) or Next.js (≤ 12), the widget will still work but you'll need to either upgrade or fall back to the [manual script-tag approach](#manual-script-tag-fallback) below.

---

## Usage by Framework

### Plain React (CRA, Vite, Remix)

```tsx
// src/App.tsx
import { AgentDeskWidget } from '@agentdeskbot/react';

export default function App() {
  return (
    <>
      <main>{/* your app */}</main>
      <AgentDeskWidget botId="YOUR_BOT_ID" />
    </>
  );
}
```

No special directives, no provider, no config — just import and render.

### Next.js App Router

For App Router projects, import from the **`/nextjs` subpath**. This wrapper uses `next/dynamic` with `ssr: false` so the widget is **never executed on the server**, eliminating `window is not defined` errors.

```tsx
// app/layout.tsx
import { AgentDeskWidget } from '@agentdeskbot/react/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AgentDeskWidget botId="YOUR_BOT_ID" />
      </body>
    </html>
  );
}
```

> **Why a separate subpath?** Next.js' App Router treats files with `'use client'` as Client Components, but `next/dynamic({ ssr: false })` is the **only** reliable way to guarantee the inner module never executes during SSR. The `/nextjs` entry handles that for you automatically.

### Next.js Pages Router

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { AgentDeskWidget } from '@agentdeskbot/react/nextjs';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <AgentDeskWidget botId="YOUR_BOT_ID" />
    </>
  );
}
```

### Cross-origin / Self-hosted Embeds

If your AgentDesk backend runs on a **different domain** than the page embedding the widget (CDN, separate staging domain, white-label deployment), point `apiOrigin` and `scriptSrc` at the correct hosts:

```tsx
<AgentDeskWidget
  botId="YOUR_BOT_ID"
  apiOrigin="https://support.yourapp.com"
  scriptSrc="https://support.yourapp.com/widget.js"
/>
```

| Prop | When you need it |
| --- | --- |
| `apiOrigin` | The widget is embedded on `app.com` but the chat backend lives on `support.yourapp.com`. |
| `scriptSrc` | Same as above, but for the actual `widget.js` bundle URL. |

---

## Props API

| Prop | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `botId` | `string` | — | ✅ | The Bot ID from your AgentDesk dashboard. |
| `mode` | `'launcher' \| 'inline'` | `'launcher'` | — | `'launcher'` = floating bubble. `'inline'` = fills the nearest positioned ancestor. |
| `scriptSrc` | `string` | `'/widget.js'` | — | URL to the compiled `widget.js` file. Override for cross-origin embeds. |
| `apiOrigin` | `string` | *(same origin)* | — | Base URL of your AgentDesk backend. Required for cross-origin embeds. |
| `configUrl` | `string` | `{apiOrigin}/api/widget/config/{botId}` | — | Fully-qualified override for the widget config fetch endpoint. |
| `onOpen` | `() => void` | — | — | Invoked when the user opens the chat surface. |
| `onClose` | `() => void` | — | — | Invoked when the user closes the chat surface. |

### `WidgetMode` reference

```ts
import type { WidgetMode } from '@agentdeskbot/react'; // re-exported from @agentdeskbot/core

type WidgetMode = 'launcher' | 'inline';
```

- **`'launcher'`** — A floating bubble anchored to the bottom-right corner of the viewport. Clicking it expands the chat surface.
- **`'inline'`** — The widget fills the nearest positioned ancestor element (`position: relative | absolute | fixed`). Useful for embedding the chat directly inside a page section, side panel, or modal.

---

## Lifecycle Events

The component exposes `onOpen` and `onClose` callbacks. Internally these are wired to the widget's `postMessage` events and validated against `event.origin` and `botId` before being fired.

```tsx
<AgentDeskWidget
  botId="YOUR_BOT_ID"
  onOpen={() => {
    analytics.track('agentdesk_widget_opened');
    setChatUnreadCount(0);
  }}
  onClose={() => {
    analytics.track('agentdesk_widget_closed');
  }}
/>
```

> Callbacks are stored in refs, so passing **new function identities on every render is safe** — you will not cause the widget to remount.

---

## Advanced

### Multiple bots on the same page

The SDK deduplicates scripts by `botId`, so mounting two `<AgentDeskWidget>` instances with **different** `botId` values will inject two independent widget bundles:

```tsx
<>
  <AgentDeskWidget botId="SALES_BOT_ID" mode="inline" />
  <AgentDeskWidget botId="SUPPORT_BOT_ID" mode="launcher" />
</>
```

Mounting the same `botId` twice (e.g. under StrictMode, or across HMR boundaries) is a no-op — only the first injection runs.

### Programmatic control

The component renders `null` and owns the widget lifecycle internally. If you need imperative APIs (open/close, send messages), use the [manual script-tag approach](#manual-script-tag-fallback) and call into the custom element directly:

```ts
const el = document.querySelector('agentdesk-widget') as HTMLElement & {
  open?: () => void;
  close?: () => void;
};

el.open?.();
```

### Manual script-tag fallback

If you can't (or don't want to) install the React package, drop the script directly into your HTML:

```html
<script
  src="https://agentdeskbot.vercel.app/widget.js"
  data-bot-id="YOUR_BOT_ID"
  data-theme="webchat-v1"
  data-mode="launcher"
  async
></script>
```

The same `data-*` attributes used by the React SDK are honored by the script:

| Attribute | Maps to prop | Default |
| --- | --- | --- |
| `data-bot-id` | `botId` | — |
| `data-mode` | `mode` | `'launcher'` |
| `data-script-src` | `scriptSrc` | `'/widget.js'` |
| `data-api-origin` | `apiOrigin` | — |
| `data-config-url` | `configUrl` | auto-derived |

Or use the iframe embed:

```html
<iframe
  src="https://agentdeskbot.vercel.app/embed/YOUR_BOT_ID?theme=webchat-v1"
  title="AgentDesk Support"
  style="width: 100%; height: 640px; border: 0;"
></iframe>
```

---

## How it works

Under the hood, the React component:

1. **Deduplicates** — On mount, it scans `document` for existing `script[data-agentdesk]` tags and bails early if one for the current `botId` is already present.
2. **Injects** — Otherwise it appends a `<script>` element pointing to `widget.js` and tags it with `data-agentdesk` and `data-bot-id`.
3. **Listens** — It registers a `message` event listener on `window`, validates `event.origin === window.location.origin` and the `botId` in the payload, then fires `onOpen` / `onClose`.
4. **Cleans up** — On unmount, the script tag, custom element, and event listener are all removed.

```
React tree mount
   └─ <AgentDeskWidget botId="…" />
        ├─ injects <script data-agentdesk data-bot-id="…" src="/widget.js" />
        ├─ registers window.addEventListener('message', …)
        └─ renders null
```

---

## Troubleshooting

<details>
<summary><strong>"window is not defined" in Next.js</strong></summary>

You are importing from `@agentdeskbot/react` in a Server Component context. Switch to the `/nextjs` subpath:

```diff
- import { AgentDeskWidget } from '@agentdeskbot/react';
+ import { AgentDeskWidget } from '@agentdeskbot/react/nextjs';
```

</details>

<details>
<summary><strong>Widget loads twice in development</strong></summary>

React 18 StrictMode intentionally double-invokes effects in development to surface side-effect bugs. The SDK is designed to handle this — it deduplicates scripts by `botId`. If you still see two widgets, make sure you aren't rendering two different `<AgentDeskWidget>` components with the same `botId`.

</details>

<details>
<summary><strong>Hoisting issues in a monorepo</strong></summary>

If your monorepo's package manager doesn't hoist `react` correctly (rare with npm/yarn/pnpm workspaces), add an explicit `react` peer dependency in your app's `package.json`. The SDK declares `react` and `react-dom` as peer dependencies with no `optional` flag.

</details>

<details>
<summary><strong>onOpen / onClose never fire</strong></summary>

The SDK validates `event.origin` against `window.location.origin`. If you are embedding the widget from a different origin than the page (cross-origin iframe), the `postMessage` events will not match and the callbacks won't fire. Use the `apiOrigin` + `scriptSrc` props to point at the correct host and confirm both the page and the widget backend share the same origin.

</details>

---

## Migrating to v0.1.0

> **Breaking change (v0.1.0):** The widget's `postMessage` target origin is now strictly `window.location.origin` (previously `*`). If you were listening for `agentdesk-widget-open` / `agentdesk-widget-close` events directly via `window.addEventListener('message', …)`, your listener must be on the same origin as the page mounting the widget, or it will silently drop events.

The official React and Vue SDKs handle this for you — no action is required unless you wrote a custom adapter.

---

## Related Packages

| Package | Description |
| --- | --- |
| [`@agentdeskbot/core`](https://www.npmjs.com/package/@agentdeskbot/core) | Shared TypeScript types (used internally). |
| [`@agentdeskbot/vue`](https://www.npmjs.com/package/@agentdeskbot/vue) | Vue 3 & Nuxt 3 SDK for the same widget. |

---

## License

[MIT](./LICENSE) © AgentDesk
