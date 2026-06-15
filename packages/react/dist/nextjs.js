import dynamic from 'next/dynamic';

var AgentDeskWidget = dynamic(
  () => import('./index.js').then((mod) => ({ default: mod.AgentDeskWidget })),
  { ssr: false }
);
var nextjs_default = AgentDeskWidget;

export { AgentDeskWidget, nextjs_default as default };
//# sourceMappingURL=nextjs.js.map
//# sourceMappingURL=nextjs.js.map