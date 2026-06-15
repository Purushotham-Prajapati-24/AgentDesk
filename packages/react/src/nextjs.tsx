'use client';

/**
 * @agentdesk/react — Next.js subpath export
 *
 * This entry point wraps the AgentDeskWidget in Next.js `dynamic()` with
 * `ssr: false` to prevent "window is not defined" errors during server-side
 * rendering. Import from this path when using the App Router or Pages Router
 * in Next.js.
 *
 * @example
 * ```tsx
 * // app/layout.tsx  (App Router)
 * import { AgentDeskWidget } from '@agentdesk/react/nextjs';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <AgentDeskWidget botId="your-bot-id" />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // pages/_app.tsx  (Pages Router)
 * import { AgentDeskWidget } from '@agentdesk/react/nextjs';
 *
 * export default function MyApp({ Component, pageProps }) {
 *   return (
 *     <>
 *       <Component {...pageProps} />
 *       <AgentDeskWidget botId="your-bot-id" />
 *     </>
 *   );
 * }
 * ```
 */

// Re-export types so consumers don't need two imports
export type { AgentDeskWidgetProps, WidgetMode } from './index';

// Lazy load to guarantee no SSR execution
import type { AgentDeskWidgetProps } from './index';


// We use a manual lazy wrapper instead of next/dynamic so this file has
// no hard dependency on Next.js — it works in any SSR framework.
import React, { lazy, Suspense } from 'react';

const LazyWidget = lazy(() =>
  import('./index').then((mod) => ({ default: mod.AgentDeskWidget }))
);

export function AgentDeskWidget(props: AgentDeskWidgetProps): React.ReactElement | null {
  // During SSR, React.lazy is skipped automatically (Suspense with no fallback = null)
  return (
    <Suspense fallback={null}>
      <LazyWidget {...props} />
    </Suspense>
  );
}
