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

| Prop | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `botId` *(or `bot-id`)* | `string` | — | ✅ | The Bot ID from your AgentDesk dashboard. |
| `mode` | `'launcher' \| 'inline'` | `'launcher'` | — | `'launcher'` = floating bubble. `'inline'` = fills the nearest positioned ancestor. |
| `scriptSrc` *(or `script-src`)* | `string` | `'/widget.js'` | — | URL to the compiled `widget.js` file. Override for cross-origin embeds. |
| `apiOrigin` *(or `api-origin`)* | `string` | *(same origin)* | — | Base URL of your AgentDesk backend. Required for cross-origin embeds. |
| `configUrl` *(or `config-url`)* | `string` | `{apiOrigin}/api/widget/config/{botId}` | — | Fully-qualified override for the widget config fetch endpoint. |

> Both `camelCase` and `kebab-case` are supported, so `bot-id` and `botId` are equivalent in templates. The underlying prop names are `botId`, `scriptSrc`, `apiOrigin`, and `configUrl` — use whichever style you prefer.

### `WidgetMode` reference

```ts
import type { WidgetMode } from '@agentdeskbot/vue'; // re-exported from @agentdeskbot/core

type WidgetMode = 'launcher' | 'inline';
```

- **`'launcher'`** — A floating bubble anchored to the bottom-right corner of the viewport. Clicking it expands the chat surface.
- **`'inline'`** — The widget fills the nearest positioned ancestor element (`position: relative | absolute | fixed`). Useful for embedding the chat directly inside a page section, side panel, or modal.

---

## Events

The component emits two lifecycle events. Internally these are wired to the widget's `postMessage` events and validated against `event.origin` and `botId` before being emitted.

```vue
<script setup lang="ts">
function handleOpen() {
  analytics.track('agentdesk_widget_opened');
}

function handleClose() {
  analytics.track('agentdesk_widget_closed');
}
</script>

<template>
  <AgentDeskWidget
    bot-id="YOUR_BOT_ID"
    @open="handleOpen"
    @close="handleClose"
  />
</template>
```

| Event | Payload | Description |
| --- | --- | --- |
| `open` | — | Emitted when the user opens the chat surface. |
| `close` | — | Emitted when the user closes the chat surface. |

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

Mounting the same `botId` twice (e.g. across HMR boundaries or after a route change) is a no-op — only the first injection runs.

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

The same `data-*` attributes used by the Vue SDK are honored by the script:

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

Under the hood, the Vue component:

1. **Deduplicates** — On `onMounted`, it scans `document` for existing `script[data-agentdesk]` tags and bails early if one for the current `botId` is already present.
2. **Injects** — Otherwise it appends a `<script>` element pointing to `widget.js` and tags it with `data-agentdesk` and `data-bot-id`.
3. **Listens** — It registers a `message` event listener on `window`, validates `event.origin === window.location.origin` and the `botId` in the payload, then emits `open` / `close`.
4. **Cleans up** — On `onBeforeUnmount`, the script tag, custom element, and event listener are all removed.

```
Vue tree mount
   └─ <AgentDeskWidget :bot-id="…" />
        ├─ injects <script data-agentdesk data-bot-id="…" src="/widget.js" />
        ├─ registers window.addEventListener('message', …)
        └─ renders <span data-agentdesk-vue-host aria-hidden="true" />
```

---

## Troubleshooting

<details>
<summary><strong>"document is not defined" in Nuxt</strong></summary>

You forgot the `.client` suffix on your plugin file. Rename it so Nuxt only loads it on the client:

```diff
- plugins/agentdesk.ts
+ plugins/agentdesk.client.ts
```

</details>

<details>
<summary><strong>Widget loads twice in development</strong></summary>

Vue's `<Suspense>` and HMR can re-mount components. The SDK is designed to handle this — it deduplicates scripts by `botId`. If you still see two widgets, make sure you aren't rendering two different `<AgentDeskWidget>` components with the same `botId`.

</details>

<details>
<summary><strong>@open / @close events never fire</strong></summary>

The SDK validates `event.origin` against `window.location.origin`. If you are embedding the widget from a different origin than the page (cross-origin iframe), the `postMessage` events will not match and the events won't be emitted. Use the `apiOrigin` + `scriptSrc` props to point at the correct host and confirm both the page and the widget backend share the same origin.

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
