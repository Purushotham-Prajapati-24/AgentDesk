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
| `mode` | `'launcher' \| 'inline'` | `'launcher'` | — | `'launcher'` = floating bubble (default). `'inline'` = fills the nearest positioned ancestor. |
| `scriptSrc` | `string` | `'https://agentdeskbot.vercel.app/widget.js'` | — | URL to the compiled `widget.js` file. Override for custom or self-hosted deployments. |
| `apiOrigin` | `string` | `'https://agentdeskbot.vercel.app'` | — | Base URL of your AgentDesk backend. Required for custom or self-hosted deployments. |
| `configUrl` | `string` | `{apiOrigin}/api/widget/config/{botId}` | — | Fully-qualified override for the widget config fetch endpoint. |
| `theme` | `string` | — | — | Optional theme name for the widget (e.g. `'webchat-v1'`). *Mount-only.* |
| `cspNonce` | `string` | — | — | Optional CSP nonce to apply to the injected script and dynamic styles. *Mount-only.* |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | — | Optional fixed position for the launcher bubble and widget pane. |
| `className` | `string` | — | — | Optional custom HTML class name to apply to the host custom element. |
| `onOpen` | `() => void` | — | — | Callback invoked when the user opens the chat widget. |
| `onClose` | `() => void` | — | — | Callback invoked when the user closes the chat widget. |
| `onReady` | `() => void` | — | — | Callback invoked when configuration loads successfully and widget is ready. |
| `onError` | `(error: { message: string }) => void` | — | — | Callback invoked when widget fails to load config or establish connection. |
| `onMessageSent` | `(message: { text: string }) => void` | — | — | Callback invoked when the user/customer sends a message. |
| `onWidgetInjected` | `() => void` | — | — | Callback invoked when the widget custom element is injected into the DOM. |

### `WidgetMode` reference

```ts
import type { WidgetMode } from '@agentdeskbot/react'; // re-exported from @agentdeskbot/core

type WidgetMode = 'launcher' | 'inline';
```

---

## Lifecycle Events

The component supports a rich set of lifecycle callbacks to track user interaction and widget status. Internally, these callbacks are wired to the widget's `postMessage` protocol with origin verification.

```tsx
<AgentDeskWidget
  botId="YOUR_BOT_ID"
  onOpen={() => {
    analytics.track('agentdesk_widget_opened');
  }}
  onClose={() => {
    analytics.track('agentdesk_widget_closed');
  }}
  onReady={() => {
    console.log('AgentDesk widget is ready to chat!');
  }}
  onError={({ message }) => {
    console.error('Failed to load AgentDesk widget:', message);
  }}
  onMessageSent={({ text }) => {
    analytics.track('agentdesk_message_sent', { length: text.length });
  }}
  onWidgetInjected={() => {
    console.log('Widget custom element has been injected into the DOM.');
  }}
/>
```

> **Fresh Callback Identities:** All callbacks are tracked dynamically. Changing callback function identities or state variables referenced inside your callbacks on subsequent renders is fully supported, safe, and will **never** cause the widget script to re-inject, unmount, or lose listener mappings.

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

Mounting the same `botId` twice (e.g. under StrictMode, or across HMR boundaries) is a no-op — only the first injection runs, and both component instances' callbacks are registered and fired.

### Recommended Multi-Bot Patterns

When mounting multiple bots on the same page:

1. **Avoid Launcher Overlaps:** Do not mount more than one bot in `launcher` mode at the same position. If you must have multiple launchers, use the `position` prop to space them out (e.g., one on the `bottom-right` and one on the `bottom-left`).
2. **Prefer Inline Mode:** For secondary assistants or context-specific support, prefer `mode="inline"` to render the bot within a sidebar, dashboard tab, or modal, keeping the main floating launcher clean.
3. **Event Attribution:** Use `onMessageSent` and `onOpen` callbacks on each widget to attribute user interactions and analytics tracking to the specific `botId`.

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

The same `data-*` attributes used by the React SDK are honored by the script.

---

## How it works

Under the hood, the React component:

1. **Deduplicates** — On mount, it scans `document` for existing `script[data-agentdesk]` tags and bails early if one for the current `botId` is already present.
2. **Injects** — Otherwise it appends a `<script>` element pointing to `widget.js` and tags it with `data-agentdesk` and `data-bot-id`.
3. **Listens** — It registers a single global `message` event listener on `window` and forwards events to the appropriate callback registries matching the `botId` and origin checks.
4. **Cleans up** — On unmount, the component removes its listener registration. If the last component referencing a `botId` unmounts, the script tag and custom element are removed from the DOM.

```
React tree mount
   └─ <AgentDeskWidget botId="…" />
        ├─ injects <script data-agentdesk data-bot-id="…" src="https://agentdeskbot.vercel.app/widget.js" />
        ├─ registers component callback in global dispatch Set
        └─ renders null
```

---

## Troubleshooting

<details>
<summary><strong>"window is not defined" in Next.js</strong></summary>

You are importing from `@agentdeskbot/react` in a Server Component context. Switch to the `/nextjs` subpath:

```tsx
import { AgentDeskWidget } from '@agentdeskbot/react/nextjs';
```

Using `@agentdeskbot/react/nextjs` utilizes `next/dynamic` with `ssr: false` to ensure the widget bundle is only executed client-side.
</details>

<details>
<summary><strong>widget.js returns 404 or fails to load</strong></summary>

By default, the SDK requests `https://agentdeskbot.vercel.app/widget.js`. If you are using a self-hosted or white-labeled deployment, specify your custom absolute URL using the `scriptSrc` prop:

```tsx
<AgentDeskWidget
  botId="YOUR_BOT_ID"
  scriptSrc="https://support.yourapp.com/widget.js"
/>
```
</details>

<details>
<summary><strong>Content Security Policy (CSP) blocks the widget script</strong></summary>

If your page enforces a strict CSP, inline scripts or dynamically injected scripts might be blocked. You can propagate a CSP cryptographic nonce directly to the injected script tag using the `cspNonce` prop:

```tsx
<AgentDeskWidget
  botId="YOUR_BOT_ID"
  cspNonce="random_cryptographic_nonce_string"
/>
```
This nonce is applied to the injected `<script>` tag and passed down to dynamically loaded styles.
</details>

<details>
<summary><strong>Widget loads but configuration fetch fails</strong></summary>

If the widget loads but displays a loading/connection error, the widget configuration endpoint might be unreachable. Check the browser console network tab. By default, it requests `{apiOrigin}/api/widget/config/{botId}`. You can override this endpoint entirely using the `configUrl` prop:

```tsx
<AgentDeskWidget
  botId="YOUR_BOT_ID"
  configUrl="https://api.mysupport.com/custom/widget-config"
/>
```
</details>

<details>
<summary><strong>Callbacks or events do not fire in cross-origin deployment</strong></summary>

For security, the message listener validates `event.origin` against the page origin, `apiOrigin` prop, and `scriptSrc` prop.
If you are running the widget backend on `api.support.com` but embedding it on `app.com`, ensure you pass the correct `apiOrigin` and `scriptSrc` props so the origins are explicitly whitelisted:

```tsx
<AgentDeskWidget
  botId="YOUR_BOT_ID"
  apiOrigin="https://api.support.com"
  scriptSrc="https://api.support.com/widget.js"
/>
```
</details>

<details>
<summary><strong>Widget loads twice in development</strong></summary>

React 18 StrictMode intentionally double-invokes effects in development to surface side-effect bugs. The SDK is designed to handle this — it deduplicates scripts by `botId`. If you still see two widgets, make sure you aren't rendering two different `<AgentDeskWidget>` components with the same `botId` on the page.
</details>

<details>
<summary><strong>Hoisting issues in a monorepo</strong></summary>

If your monorepo's package manager doesn't hoist `react` correctly (rare with npm/yarn/pnpm workspaces), add an explicit `react` peer dependency in your app's `package.json`. The SDK declares `react` and `react-dom` as peer dependencies with no `optional` flag.
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
