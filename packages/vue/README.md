<div align="center">

# `@agentdeskbot/vue`

**Drop-in Vue 3 & Nuxt 3 SDK for the AgentDesk AI chat widget.**

Embed a fully-typed, RAG-grounded support bot in your Vue app in under 30 seconds — no manual `onMounted` boilerplate, no plugin setup required, SSR-safe for Nuxt out of the box.

[![npm version](https://img.shields.io/npm/v/@agentdeskbot/vue?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@agentdeskbot/vue)
[![npm downloads](https://img.shields.io/npm/dm/@agentdeskbot/vue?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@agentdeskbot/vue)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentdeskbot/vue?color=success)](https://bundlephobia.com/package/@agentdeskbot/vue)
[![license](https://img.shields.io/npm/l/@agentdeskbot/vue?color=blue)](./LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white)](https://vuejs.org)
[![Nuxt](https://img.shields.io/badge/Nuxt-3.x-00DC82?logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage by Framework](#usage-by-framework)
  - [Plain Vue 3](#plain-vue-3)
  - [Vue 3 with global plugin](#vue-3-with-global-plugin)
  - [Nuxt 3](#nuxt-3)
  - [Cross-origin / Self-hosted Embeds](#cross-origin--self-hosted-embeds)
- [Props API](#props-api)
- [Events](#events)
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

- **One component, zero config** — `<AgentDeskWidget bot-id="…" />` is everything you need.
- **Optional global plugin** — Install once, use the component anywhere without per-file imports.
- **Nuxt 3 ready** — Drop-in client plugin that keeps the widget out of SSR.
- **Strictly typed** — Full TypeScript surface with IntelliSense, including prop types and emit payloads.
- **Zero runtime deps outside Vue** — `vue` is externalized; no other peer deps required.
- **Tree-shakable** — `"sideEffects": false`; ESM and CJS bundles ship with `.d.ts` declarations.
- **Idempotent injection** — Deduplicates scripts so re-mounts (HMR, `<KeepAlive>`) don't double-load the widget.
- **Origin-validated events** — `postMessage` listeners verify `event.origin` and `botId` before emitting.

---

## Quick Start

```vue
<script setup lang="ts">
import { AgentDeskWidget } from '@agentdeskbot/vue';
</script>

<template>
  <main><!-- your app --></main>
  <AgentDeskWidget bot-id="YOUR_BOT_ID" />
</template>
```

That's it. The widget will mount as a floating launcher bubble in the bottom-right corner of your page.

---

## Installation

```bash
# npm
npm install @agentdeskbot/vue

# yarn
yarn add @agentdeskbot/vue

# pnpm
pnpm add @agentdeskbot/vue
```

**Peer dependencies** *(automatically installed alongside in modern setups)*

| Package | Required | Supported versions |
| --- | --- | --- |
| `vue` | ✅ | `>= 3.0.0` |

> **Vue 2 users:** This package targets Vue 3 only. For Vue 2, use the [manual script-tag approach](#manual-script-tag-fallback) below.

---

## Usage by Framework

### Plain Vue 3

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { AgentDeskWidget } from '@agentdeskbot/vue';
</script>

<template>
  <main><!-- your app --></main>
  <AgentDeskWidget bot-id="YOUR_BOT_ID" />
</template>
```

### Vue 3 with global plugin

Register once in your app's entry point and use `<AgentDeskWidget>` anywhere — no per-file imports needed.

```ts
// src/main.ts
import { createApp } from 'vue';
import { AgentDeskPlugin } from '@agentdeskbot/vue';
import App from './App.vue';

createApp(App)
  .use(AgentDeskPlugin)
  .mount('#app');
```

```vue
<!-- Any component — no import required -->
<template>
  <AgentDeskWidget bot-id="YOUR_BOT_ID" />
</template>
```

#### Plugin options

```ts
import { AgentDeskPlugin } from '@agentdeskbot/vue';

app.use(AgentDeskPlugin, {
  // Set to false to register the plugin without auto-registering the
  // global <AgentDeskWidget> component. Useful when you want to manage
  // component registration manually.
  globalComponent: true, // default
});
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `globalComponent` | `boolean` | `true` | When `true`, registers `<AgentDeskWidget>` globally. Set to `false` to skip global registration. |

### Nuxt 3

Create a **client-only** plugin so the widget is never executed during SSR. The `.client.ts` suffix tells Nuxt to only load this module on the browser.

```ts
// plugins/agentdesk.client.ts
import { AgentDeskPlugin } from '@agentdeskbot/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(AgentDeskPlugin);
});
```

Then use the component normally in any page or layout:

```vue
<!-- app.vue or layouts/default.vue -->
<template>
  <div>
    <NuxtPage />
    <AgentDeskWidget bot-id="YOUR_BOT_ID" />
  </div>
</template>
```

> **Why a `.client.ts` plugin?** Nuxt runs every plugin in `plugins/` on the server first. The widget touches `window` and `document` during mount, so it must be deferred to the client. The `.client.ts` suffix is Nuxt's official escape hatch for this.

### Cross-origin / Self-hosted Embeds

If your AgentDesk backend runs on a **different domain** than the page embedding the widget, point `api-origin` and `script-src` at the correct hosts:

```vue
<AgentDeskWidget
  bot-id="YOUR_BOT_ID"
  api-origin="https://support.yourapp.com"
  script-src="https://support.yourapp.com/widget.js"
/>
```

| Prop | When you need it |
| --- | --- |
| `apiOrigin` | The widget is embedded on `app.com` but the chat backend lives on `support.yourapp.com`. |
| `scriptSrc` | Same as above, but for the actual `widget.js` bundle URL. |

---

## Props API

| Prop (CamelCase) | Prop (kebab-case) | Type | Default | Required | Description |
| --- | --- | --- | --- | --- | --- |
| `botId` | `bot-id` | `string` | — | ✅ | The Bot ID from your AgentDesk dashboard. |
| `mode` | `mode` | `'launcher' \| 'inline'` | `'launcher'` | — | `'launcher'` = floating bubble. `'inline'` = fills nearest positioned ancestor. |
| `scriptSrc` | `script-src` | `string` | `'/widget.js'` | — | URL to compiled `widget.js`. Override for CDNs/cross-origin embeds. |
| `apiOrigin` | `api-origin` | `string` | *(same origin)* | — | Base URL of your AgentDesk backend. Required for cross-origin embeds. |
| `configUrl` | `config-url` | `string` | `{apiOrigin}/api/widget/config/{botId}` | — | Fully-qualified override for widget config fetch endpoint. |
| `theme` | `theme` | `string` | — | — | Optional theme name for the widget (e.g. `'webchat-v1'`). *Mount-only.* |
| `cspNonce` | `csp-nonce` | `string` | — | — | Optional CSP nonce to apply to the script tag and dynamic styles. *Mount-only.* |
| `position` | `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | — | Optional fixed position for launcher bubble and widget pane. |
| `className` | `class-name` | `string` | — | — | Optional custom HTML class name to apply to host element container. |

> Both `camelCase` and `kebab-case` are fully supported for all props in Vue templates (e.g., `:bot-id` and `:botId` are equivalent).

### `WidgetMode` reference

```ts
import type { WidgetMode } from '@agentdeskbot/vue'; // re-exported from @agentdeskbot/core

type WidgetMode = 'launcher' | 'inline';
```

- **`'launcher'`** — A floating bubble anchored to the bottom-right corner of the viewport. Clicking it expands the chat surface.
- **`'inline'`** — The widget fills the nearest positioned ancestor element (`position: relative | absolute | fixed`). Useful for embedding the chat directly inside a page section, side panel, or modal.

---

## Events

The component emits six lifecycle events corresponding to widget actions and network status. Internally, these events are received from the widget's `postMessage` channel, origin-validated, and re-emitted:

```vue
<script setup lang="ts">
function handleOpen() {
  analytics.track('agentdesk_widget_opened');
}

function handleClose() {
  analytics.track('agentdesk_widget_closed');
}

function handleReady() {
  console.log('Widget is ready');
}

function handleError(err: { message: string }) {
  console.error('Widget load error:', err.message);
}

function handleMessageSent(msg: { text: string }) {
  analytics.track('agentdesk_message_sent', { text: msg.text });
}

function handleInjected() {
  console.log('Widget element injected into the DOM');
}
</script>

<template>
  <AgentDeskWidget
    bot-id="YOUR_BOT_ID"
    @open="handleOpen"
    @close="handleClose"
    @ready="handleReady"
    @error="handleError"
    @message-sent="handleMessageSent"
    @injected="handleInjected"
  />
</template>
```

| Event | Payload | Description |
| --- | --- | --- |
| `@open` | — | Emitted when the user opens the chat widget. |
| `@close` | — | Emitted when the user closes the chat widget. |
| `@ready` | — | Emitted when configuration loads successfully and widget is ready. |
| `@error` | `{ message: string }` | Emitted when configuration fails to load or socket connection is lost. |
| `@message-sent` | `{ text: string }` | Emitted when the user/customer sends a message. |
| `@injected` | — | Emitted when the custom element host is injected into the DOM. |

> The SDK stores its own internal event listeners in the `setup()` closure and tears them down in `onBeforeUnmount`, so re-mounting the component (HMR, `<KeepAlive>`, route changes) is fully idempotent.

---

## Advanced

### Multiple bots on the same page

The SDK deduplicates scripts by `botId`, so mounting two `<AgentDeskWidget>` instances with **different** `botId` values will inject two independent widget bundles:

```vue
<template>
  <AgentDeskWidget bot-id="SALES_BOT_ID" mode="inline" />
  <AgentDeskWidget bot-id="SUPPORT_BOT_ID" mode="launcher" />
</template>
```

Mounting the same `botId` twice (e.g. across HMR boundaries or after a route change) is a no-op — only the first injection runs, and both components' listeners are registered to receive events.

### Recommended Multi-Bot Patterns

When mounting multiple bots on the same page:

1. **Avoid Launcher Overlaps:** Do not mount more than one bot in `launcher` mode at the same position. If you must have multiple launchers, use the `position` prop to space them out (e.g., one on the `bottom-right` and one on the `bottom-left`).
2. **Prefer Inline Mode:** For secondary assistants or context-specific support, prefer `mode="inline"` to render the bot within a sidebar, dashboard tab, or modal, keeping the main floating launcher clean.
3. **Event Attribution:** Use `@message-sent` and `@open` event listeners on each widget to attribute user interactions and analytics tracking to the specific `bot-id`.

### Programmatic control

The component renders an empty host `<span>` and owns the widget lifecycle internally. If you need imperative APIs (open/close, send messages), use the [manual script-tag approach](#manual-script-tag-fallback) and call into the custom element directly:

```ts
const el = document.querySelector('agentdesk-widget') as HTMLElement & {
  open?: () => void;
  close?: () => void;
};

el.open?.();
```

### Manual script-tag fallback

If you can't (or don't want to) install the Vue package, drop the script directly into your HTML:

```html
<script
  src="https://agentdeskbot.vercel.app/widget.js"
  data-bot-id="YOUR_BOT_ID"
  data-theme="webchat-v1"
  data-mode="launcher"
  async
></script>
```

The same `data-*` attributes used by the Vue SDK are honored by the script.

---

## How it works

Under the hood, the Vue component:

1. **Deduplicates** — On `onMounted`, it scans `document` for existing `script[data-agentdesk]` tags and bails early if one for the current `botId` is already present.
2. **Injects** — Otherwise it appends a `<script>` element pointing to `widget.js` and tags it with `data-agentdesk` and `data-bot-id`.
3. **Listens** — It registers a single global `message` event listener on `window` and forwards events to active components matching the `botId` and origin checks.
4. **Cleans up** — On `onBeforeUnmount` or `onDeactivated` (for KeepAlive), it removes its listener registry. If the last component referencing a `botId` unmounts, the script tag and custom element are removed from the DOM.

```
Vue tree mount
   └─ <AgentDeskWidget :bot-id="…" />
        ├─ injects <script data-agentdesk data-bot-id="…" src="/widget.js" />
        ├─ registers component callback in global dispatch Set
        └─ renders <span data-agentdesk-vue-host aria-hidden="true" />
```

---

## Troubleshooting

<details>
<summary><strong>"document is not defined" or window errors in Nuxt</strong></summary>

You forgot the `.client` suffix on your plugin file. Rename it so Nuxt only loads it on the client:

```diff
- plugins/agentdesk.ts
+ plugins/agentdesk.client.ts
```

Vue plugins that touch browser DOM globals (like `window` and `document`) must be client-only. Nuxt recognizes `.client.ts` as the official way to skip server-side execution.
</details>

<details>
<summary><strong>widget.js returns 404 or fails to load</strong></summary>

By default, the SDK requests `/widget.js` from the current origin. If your widget is served from a CDN or a separate backend server, specify the absolute URL using the `script-src` prop:

```vue
<AgentDeskWidget
  bot-id="YOUR_BOT_ID"
  script-src="https://cdn.example.com/widget.js"
/>
```
</details>

<details>
<summary><strong>Content Security Policy (CSP) blocks the widget script</strong></summary>

If your page enforces a strict CSP, inline scripts or dynamically injected scripts might be blocked. You can propagate a CSP cryptographic nonce directly to the injected script tag using the `csp-nonce` prop:

```vue
<AgentDeskWidget
  bot-id="YOUR_BOT_ID"
  csp-nonce="random_cryptographic_nonce_string"
/>
```
This nonce is applied to the injected `<script>` tag and passed down to dynamically loaded styles.
</details>

<details>
<summary><strong>Widget loads but configuration fetch fails</strong></summary>

If the widget loads but displays a loading/connection error, check the browser console network tab. By default, it requests `{apiOrigin}/api/widget/config/{botId}`. You can override this endpoint entirely using the `config-url` prop:

```vue
<AgentDeskWidget
  bot-id="YOUR_BOT_ID"
  config-url="https://api.mysupport.com/custom/widget-config"
/>
```
</details>

<details>
<summary><strong>Callbacks or events do not fire in cross-origin deployment</strong></summary>

For security, the message listener validates `event.origin` against the page origin, `api-origin` prop, and `script-src` prop.
If you are running the widget backend on `api.support.com` but embedding it on `app.com`, ensure you pass the correct `api-origin` and `script-src` props:

```vue
<AgentDeskWidget
  bot-id="YOUR_BOT_ID"
  api-origin="https://api.support.com"
  script-src="https://api.support.com/widget.js"
/>
```
</details>

<details>
<summary><strong>Widget loads twice in development</strong></summary>

Vue's `<Suspense>` and HMR can re-mount components. The SDK is designed to handle this — it deduplicates scripts by `botId`. If you still see two widgets, make sure you aren't rendering two different `<AgentDeskWidget>` components with the same `botId` on the page.
</details>

<details>
<summary><strong>Vue 2 project</strong></summary>

This package requires Vue 3. For Vue 2, use the [manual script-tag approach](#manual-script-tag-fallback) — the underlying `widget.js` IIFE is framework-agnostic.
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
| [`@agentdeskbot/react`](https://www.npmjs.com/package/@agentdeskbot/react) | React & Next.js SDK for the same widget. |

---

## License

[MIT](./LICENSE) © AgentDesk
