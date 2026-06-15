<div align="center">

# `@agentdesk/core`

**Shared TypeScript types for the AgentDesk widget ecosystem.**

The contract layer that powers [`@agentdesk/react`](https://www.npmjs.com/package/@agentdesk/react) and [`@agentdesk/vue`](https://www.npmjs.com/package/@agentdesk/vue).

[![npm version](https://img.shields.io/npm/v/@agentdesk/core?color=cb3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@agentdesk/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentdesk/core?color=success)](https://bundlephobia.com/package/@agentdesk/core)
[![license](https://img.shields.io/npm/l/@agentdesk/core?color=blue)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Table of Contents

- [Why `@agentdesk/core`?](#why-agentdeskcore)
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

## Why `@agentdesk/core`?

The AgentDesk widget is shipped as multiple framework adapters (React, Vue, and any future adapters). To keep these adapters in lock-step — and to let **you** consume the same well-typed contract in your own integrations — all shared TypeScript surface lives here.

| Benefit | What it means for you |
| --- | --- |
| **Single source of truth** | Props, modes, and event payloads match across React, Vue, and any custom adapter. |
| **Minimal runtime** | Tiny (< 3 KB) JavaScript module — tree-shakeable, only ships what you use. |
| **Framework-agnostic** | Use it from React, Vue, Svelte, Solid, vanilla JS/TS — anything that can read `.d.ts`. |
| **Strictly typed** | Built with `strict: true` so you get full IntelliSense and compile-time safety. |

> If you just want to embed the chat widget, you probably don't need this package directly — install [`@agentdesk/react`](https://www.npmjs.com/package/@agentdesk/react) or [`@agentdesk/vue`](https://www.npmjs.com/package/@agentdesk/vue) instead. This package is for **adapter authors** and **advanced consumers** building custom integrations.

---

## Installation

```bash
# npm
npm install @agentdesk/core

# yarn
yarn add @agentdesk/core

# pnpm
pnpm add @agentdesk/core
```

**Requirements**

- Node.js `>= 18`
- TypeScript `>= 4.7` (recommended `>= 5.x`)

This package ships a **tiny runtime module** (< 3 KB) alongside type definitions. It handles widget instance ref-counting, mode synchronization, and cross-origin postMessage. The bundle is tree-shakeable — if your bundler supports side-effect detection, unused exports will not appear in your production build.

---

## Exports

The package exposes a single, stable surface area from its root entry:

```ts
export type WidgetMode = 'launcher' | 'inline';

export interface WidgetMessageEventData {
  type: 'agentdesk-widget-open' | 'agentdesk-widget-close';
  botId: string;
}
```

### `WidgetMode`

Controls how the widget is rendered on the host page.

| Value | Behavior |
| --- | --- |
| `'launcher'` *(default)* | A floating launcher bubble anchored to the bottom-right corner. Clicking it opens the chat surface. |
| `'inline'` | The widget fills the nearest positioned ancestor element — useful for embedding the chat directly inside a page section, modal, or side panel. |

```ts
import type { WidgetMode } from '@agentdesk/core';

const mode: WidgetMode = 'inline';
```

### `WidgetMessageEventData`

The shape of the payload posted by the AgentDesk widget IIFE to `window` via `postMessage` whenever the user opens or closes the chat surface.

| Field | Type | Description |
| --- | --- | --- |
| `type` | `'agentdesk-widget-open' \| 'agentdesk-widget-close'` | The lifecycle event being broadcast. |
| `botId` | `string` | The bot ID this event pertains to — useful when multiple bots are mounted on the same page. |

```ts
import type { WidgetMessageEventData } from '@agentdesk/core';

window.addEventListener('message', (event: MessageEvent) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data as WidgetMessageEventData;
  if (data?.botId !== 'YOUR_BOT_ID') return;

  if (data.type === 'agentdesk-widget-open') {
    console.log('Chat opened for bot', data.botId);
  } else if (data.type === 'agentdesk-widget-close') {
    console.log('Chat closed for bot', data.botId);
  }
});
```

> **Security note:** Always validate `event.origin` and the payload shape before acting on a postMessage event. The official React and Vue adapters do this for you.

---

## Usage

### 1. As a type-only dependency in your own adapter

If you are building a custom framework adapter (Svelte, Solid, vanilla, etc.) and want to stay consistent with the official ones:

```ts
// my-agentdesk-adapter/src/index.ts
import type { WidgetMode, WidgetMessageEventData } from '@agentdesk/core';

export interface MyAdapterProps {
  botId: string;
  mode?: WidgetMode;
  onOpen?: () => void;
  onClose?: () => void;
}
```

### 2. Listening to widget lifecycle events

```ts
import type { WidgetMessageEventData } from '@agentdesk/core';

function attachLifecycleListener(botId: string) {
  const handler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data as Partial<WidgetMessageEventData>;
    if (data?.botId !== botId) return;

    switch (data.type) {
      case 'agentdesk-widget-open':
        // chat opened
        break;
      case 'agentdesk-widget-close':
        // chat closed
        break;
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
```

### 3. Reusing the type in your own chat surface

```ts
import type { WidgetMode } from '@agentdesk/core';

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
npx bundlephobia @agentdesk/core
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

`@agentdesk/core` follows [Semantic Versioning](https://semver.org/):

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
| [`@agentdesk/react`](https://www.npmjs.com/package/@agentdesk/react) | React & Next.js SDK for the AgentDesk widget. |
| [`@agentdesk/vue`](https://www.npmjs.com/package/@agentdesk/vue) | Vue 3 & Nuxt 3 SDK for the AgentDesk widget. |

---

## License

[MIT](./LICENSE) © AgentDesk
