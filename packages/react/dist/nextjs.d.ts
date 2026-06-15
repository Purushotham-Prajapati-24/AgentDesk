import { AgentDeskWidgetProps } from './index.js';
export { WidgetMode } from './index.js';
import React from 'react';

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

declare function AgentDeskWidget(props: AgentDeskWidgetProps): React.ReactElement | null;

export { AgentDeskWidget, AgentDeskWidgetProps };
