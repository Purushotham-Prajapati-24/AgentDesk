import { AgentDeskWidgetProps } from './index.mjs';
export { WidgetMode } from '@agentdeskbot/core';
import { ComponentType } from 'react';

/**
 * @agentdeskbot/react — Next.js subpath export
 *
 * This entry point wraps the AgentDeskWidget in Next.js `dynamic()` with
 * `ssr: false` to prevent "window is not defined" errors during server-side
 * rendering. Import from this path when using the App Router or Pages Router
 * in Next.js.
 *
 * Why `next/dynamic` and not `React.lazy`?
 * - `React.lazy` still pre-renders the inner component on the server when
 *   wrapped in `<Suspense>`, and on some older Node runtimes it can throw
 *   because `Suspense` server semantics are not implemented.
 * - `next/dynamic` with `ssr: false` is the only reliable way to guarantee
 *   the widget module is never executed on the server. Next.js's bundler
 *   recognizes the call and emits a Client Component boundary.
 *
 * @example
 * ```tsx
 * // app/layout.tsx  (App Router)
 * import { AgentDeskWidget } from '@agentdeskbot/react/nextjs';
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
 * import { AgentDeskWidget } from '@agentdeskbot/react/nextjs';
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

/**
 * `AgentDeskWidget` — Next.js-friendly wrapper that disables SSR for the
 * underlying React widget by deferring the inner module load to the client.
 *
 * `next` is declared as an optional peer dependency in `package.json` and
 * is `external` in the tsup config, so this module preserves the import
 * at runtime. If you are bundling for a non-Next.js environment, import
 * from `@agentdeskbot/react` instead.
 */
declare const AgentDeskWidget: ComponentType<AgentDeskWidgetProps>;

export { AgentDeskWidget, AgentDeskWidgetProps, AgentDeskWidget as default };
