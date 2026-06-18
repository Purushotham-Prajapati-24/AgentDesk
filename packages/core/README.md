<div align="center">

# `@agentdeskbot/core`

**Shared TypeScript types for the AgentDesk widget ecosystem.**

The contract layer that powers [`@agentdeskbot/react`](https://www.npmjs.com/package/@agentdeskbot/react) and [`@agentdeskbot/vue`](https://www.npmjs.com/package/@agentdeskbot/vue).

[![npm version](https://img.shields.io/npm/v/@agentdeskbot/core?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@agentdeskbot/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentdeskbot/core?color=success)](https://bundlephobia.com/package/@agentdeskbot/core)
[![license](https://img.shields.io/npm/l/@agentdeskbot/core?color=blue)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Table of Contents

- [Why `@agentdeskbot/core`?](#why-agentdeskcore)
- [Installation](#installation)
- [Exports](#exports)
  - [`WidgetMode`](#widgetmode)
  - [`WidgetMessageEventData`](#widgetmessageeventdata)
- [Usage](#usage)
- [Tree-shaking & Side Effects](#tree-shaking--side-effects)
- [Build & Develop](#build--develop)
- [Versioning & Compatibility](#versioning--compatibility)
- [Contributing](#contributing)
- [License](#license)

---

## Why `@agentdeskbot/core`?

The AgentDesk widget is shipped as multiple framework adapters (React, Vue, and any future adapters). To keep these adapters in lock-step — and to let **you** consume the same well-typed contract in your own integrations — all shared TypeScript surface lives here.

| Benefit | What it means for you |
| --- | --- |
| **Single source of truth** | Props, modes, and event payloads match across React, Vue, and any custom adapter. |
| **Minimal runtime** | Tiny (< 3 KB) JavaScript module — tree-shakeable, only ships what you use. |
| **Framework-agnostic** | Use it from React, Vue, Svelte, Solid, vanilla JS/TS — anything that can read `.d.ts`. |
| **Strictly typed** | Built with `strict: true` so you get full IntelliSense and compile-time safety. |

> If you just want to embed the chat widget, you probably don't need this package directly — install [`@agentdeskbot/react`](https://www.npmjs.com/package/@agentdeskbot/react) or [`@agentdeskbot/vue`](https://www.npmjs.com/package/@agentdeskbot/vue) instead. This package is for **adapter authors** and **advanced consumers** building custom integrations.

---

## Installation

```bash
# npm
npm install @agentdeskbot/core

# yarn
yarn add @agentdeskbot/core

# pnpm
pnpm add @agentdeskbot/core
```

**Requirements**

- Node.js `>= 18`
- TypeScript `>= 4.7` (recommended `>= 5.x`)

This package ships a **tiny runtime module** (< 3 KB) alongside type definitions. It handles widget instance ref-counting, mode synchronization, and cross-origin postMessage. The bundle is tree-shakeable — if your bundler supports side-effect detection, unused exports will not appear in your production build.

---

## Exports

The package exposes the following type definitions and runtime helpers from its root entry:

```ts
export type WidgetMode = 'launcher' | 'inline';

export type WidgetLifecycleEventType =
  | 'agentdesk-widget-open'
  | 'agentdesk-widget-close'
  | 'agentdesk-widget-ready'
  | 'agentdesk-widget-error'
  | 'agentdesk-widget-message-sent'
  | 'agentdesk-widget-injected';

export type WidgetControlEventType = 'agentdesk-set-mode';
export type WidgetAckEventType = 'agentdesk-set-mode-ack';

export type WidgetEventType =
  | WidgetLifecycleEventType
  | WidgetControlEventType
  | WidgetAckEventType;

export type WidgetMessageEventData =
  | { type: 'agentdesk-widget-open' | 'agentdesk-widget-close' | 'agentdesk-widget-ready' | 'agentdesk-widget-injected'; botId: string }
  | { type: 'agentdesk-widget-error'; botId: string; message: string }
  | { type: 'agentdesk-widget-message-sent'; botId: string; text: string }
  | { type: WidgetControlEventType; botId: string; mode: WidgetMode }
  | { type: WidgetAckEventType; botId: string };
```

### `WidgetMode`

Controls how the widget is rendered on the host page.

| Value | Behavior |
| --- | --- |
| `'launcher'` *(default)* | A floating launcher bubble anchored to the bottom-right corner. Clicking it opens the chat surface. |
| `'inline'` | The widget fills the nearest positioned ancestor element — useful for embedding the chat directly inside a page section, modal, or side panel. |

```ts
import type { WidgetMode } from '@agentdeskbot/core';

const mode: WidgetMode = 'inline';
```

### `WidgetMessageEventData`

The shape of the payload posted by the AgentDesk widget to `window` via `postMessage` whenever lifecycle state changes.

| Event Type | Additional Payload Fields | Description |
| --- | --- | --- |
| `'agentdesk-widget-open'` | `botId: string` | Broadcasted when the chat surface is opened. |
| `'agentdesk-widget-close'` | `botId: string` | Broadcasted when the chat surface is closed. |
| `'agentdesk-widget-ready'` | `botId: string` | Broadcasted when the widget has finished loading configuration and is ready. |
| `'agentdesk-widget-error'` | `botId: string`, `message: string` | Broadcasted when widget fails to load config or connect. |
| `'agentdesk-widget-message-sent'` | `botId: string`, `text: string` | Broadcasted when a user sends a message. |
| `'agentdesk-widget-injected'` | `botId: string` | Broadcasted when custom element is injected in DOM. |

```ts
import type { WidgetMessageEventData } from '@agentdeskbot/core';

window.addEventListener('message', (event: MessageEvent) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data as WidgetMessageEventData;
  if (data?.botId !== 'YOUR_BOT_ID') return;

  switch (data.type) {
    case 'agentdesk-widget-open':
      console.log('Chat opened');
      break;
    case 'agentdesk-widget-close':
      console.log('Chat closed');
      break;
    case 'agentdesk-widget-ready':
      console.log('Widget is ready');
      break;
    case 'agentdesk-widget-error':
      console.error('Error:', data.message);
      break;
    case 'agentdesk-widget-message-sent':
      console.log('Sent message:', data.text);
      break;
    case 'agentdesk-widget-injected':
      console.log('Element injected');
      break;
  }
});
```

---

## Runtime Helpers

For framework adapter authors, the package exports core runtime helpers for managing script loading lifecycles, reference counting, registry states, and cross-window messages:

### `acquireInstance(botId: string, mode: WidgetMode): AcquireResult`
Acquires a registry slot for a bot instance. Tracks reference counts across multiple components pointing to the same `botId` so the loader script is injected only once.
Returns:
- `isFirstForBot: boolean`: True if this is the first instance for this bot (tells caller to inject script).
- `mustInstallListener: boolean`: True if the global window message event listener needs to be installed.
- `modeChanged: boolean`: True if the requested mode differs from the existing instance's mode.
- `entry: AgentDeskWidgetRegistryEntry`: The entry state containing `count` and `mode`.

### `releaseInstance(botId: string): ReleaseResult`
Releases a registry slot.
Returns:
- `isLastForBot: boolean`: True if this was the last instance for the bot (tells caller to clean up script and element).
- `mustRemoveListener: boolean`: True if the global window message event listener can be uninstalled.

### `getEntry(botId: string): AgentDeskWidgetRegistryEntry | undefined`
Retrieves the registry state (reference count, current mode) for a given `botId`.

### `getActiveBotIds(): string[]`
Returns an array of all currently active `botId` values registered on the page.

### `postSetMode(botId: string, mode: WidgetMode): void`
Dispatches a control message to the widget IIFE (same-origin window and parent window if iframe) to dynamically update the display mode without requiring script reload.

---

## Usage

### 1. As a type-only dependency in your own adapter

If you are building a custom framework adapter (Svelte, Solid, vanilla, etc.) and want to stay consistent with the official ones:

```ts
// my-agentdesk-adapter/src/index.ts
import type { WidgetMode, WidgetMessageEventData } from '@agentdeskbot/core';

export interface MyAdapterProps {
  botId: string;
  mode?: WidgetMode;
  onOpen?: () => void;
  onClose?: () => void;
  onReady?: () => void;
  onError?: (err: { message: string }) => void;
  onMessageSent?: (msg: { text: string }) => void;
  onWidgetInjected?: () => void;
}
```

### 2. Listening to all widget lifecycle events safely

```ts
import type { WidgetMessageEventData } from '@agentdeskbot/core';

function attachLifecycleListener(botId: string, callbacks: {
  onOpen?: () => void;
  onClose?: () => void;
  onReady?: () => void;
  onError?: (error: { message: string }) => void;
  onMessageSent?: (message: { text: string }) => void;
  onWidgetInjected?: () => void;
}) {
  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as Partial<WidgetMessageEventData>;
    if (data?.botId !== botId) return;

    switch (data.type) {
      case 'agentdesk-widget-open':
        callbacks.onOpen?.();
        break;
      case 'agentdesk-widget-close':
        callbacks.onClose?.();
        break;
      case 'agentdesk-widget-ready':
        callbacks.onReady?.();
        break;
      case 'agentdesk-widget-error':
        callbacks.onError?.({ message: (data as { message?: string }).message || 'Unknown error' });
        break;
      case 'agentdesk-widget-message-sent':
        callbacks.onMessageSent?.({ text: (data as { text?: string }).text || '' });
        break;
      case 'agentdesk-widget-injected':
        callbacks.onWidgetInjected?.();
        break;
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
```

### 3. Reusing types in your own components

```ts
import type { WidgetMode } from '@agentdeskbot/core';

interface ChatSurfaceProps {
  botId: string;
  mode: WidgetMode;
}

function ChatSurface({ botId, mode }: ChatSurfaceProps) {
  // ...your implementation
}
```

---

## Tree-shaking & Side Effects

This package is marked `"sideEffects": false` in its `package.json`, so bundlers like Webpack, Rollup, Vite, and esbuild can safely tree-shake it. The runtime module is tiny (< 3 KB) — unused exports are dropped from your final bundle.

You can verify this for yourself:

```bash
npx bundlephobia @agentdeskbot/core
```

---

## Build & Develop

The package is bundled with [tsup](https://tsup.egoist.dev/) and produces both ESM and CJS outputs with type declarations.

```bash
# Build once
npm run build

# Watch mode for local development
npm run dev
```

Build output (in `dist/`):

```
dist/
├── index.cjs      # CommonJS entry
├── index.js       # ESM entry
├── index.d.ts     # Type declarations
└── index.d.cts    # CJS type declarations
```

> The `dist/` folder is regenerated on every build and is the **only** folder published to npm. Source files under `src/` are not shipped.

---

## Versioning & Compatibility

`@agentdeskbot/core` follows [Semantic Versioning](https://semver.org/):

- **Patch** releases (e.g. `0.1.1`) — internal refactors, comment/doc fixes, no API change.
- **Minor** releases (e.g. `0.2.0`) — backwards-compatible additions to the public type surface.
- **Major** releases (e.g. `1.0.0`) — breaking type changes (renamed exports, narrowed unions, removed fields).

The React and Vue adapters are versioned in lock-step with this package, so upgrading one usually means upgrading the others.

---

## Contributing

Bug reports, feature requests, and pull requests are welcome.

1. Open an issue describing the change.
2. Fork the repository and create a feature branch.
3. Run `npm run build` to make sure the type bundles are clean.
4. Submit a PR with a clear description and reproduction steps.

> **Tip for adapter authors:** If you are adding a new public type, please also update the React and Vue adapters to consume it, so the three packages stay aligned.

---

## Related Packages

| Package | Description |
| --- | --- |
| [`@agentdeskbot/react`](https://www.npmjs.com/package/@agentdeskbot/react) | React & Next.js SDK for the AgentDesk widget. |
| [`@agentdeskbot/vue`](https://www.npmjs.com/package/@agentdeskbot/vue) | Vue 3 & Nuxt 3 SDK for the AgentDesk widget. |

---

## License

[MIT](./LICENSE) © AgentDesk
