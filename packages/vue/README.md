# @agentdesk/vue

> Official Vue 3 SDK for the [AgentDesk](https://agentdesk.ai) AI chat widget.

[![npm](https://img.shields.io/npm/v/@agentdesk/vue)](https://www.npmjs.com/package/@agentdesk/vue)

---

## Installation

```bash
npm install @agentdesk/vue
# or
yarn add @agentdesk/vue
# or
pnpm add @agentdesk/vue
```

Vue 3 is required as a peer dependency.

---

## Usage

### Component import (per-file)

```vue
<script setup lang="ts">
import { AgentDeskWidget } from '@agentdesk/vue';
</script>

<template>
  <AgentDeskWidget bot-id="your-bot-id" />
</template>
```

### Plugin (global registration)

Register once in `main.ts` and use `<AgentDeskWidget>` anywhere without importing:

```ts
// main.ts
import { createApp } from 'vue';
import { AgentDeskPlugin } from '@agentdesk/vue';
import App from './App.vue';

createApp(App)
  .use(AgentDeskPlugin)
  .mount('#app');
```

```vue
<!-- Any component — no import needed -->
<template>
  <AgentDeskWidget bot-id="your-bot-id" />
</template>
```

### Nuxt 3

Create a client-only plugin so the widget isn't executed during SSR:

```ts
// plugins/agentdesk.client.ts
import { AgentDeskPlugin } from '@agentdesk/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(AgentDeskPlugin);
});
```

Then use normally in any template.

### Cross-origin / Self-hosted

```vue
<AgentDeskWidget
  bot-id="your-bot-id"
  api-origin="https://support.yourapp.com"
  script-src="https://support.yourapp.com/widget.js"
/>
```

### Listening to open/close events

```vue
<AgentDeskWidget
  bot-id="your-bot-id"
  @open="handleOpen"
  @close="handleClose"
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

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `open` | — | Emitted when the chat widget is opened. |
| `close` | — | Emitted when the chat widget is closed. |

---

## License

MIT
