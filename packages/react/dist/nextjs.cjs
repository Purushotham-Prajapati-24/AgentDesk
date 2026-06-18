'use client';
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var dynamic = require('next/dynamic');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var dynamic__default = /*#__PURE__*/_interopDefault(dynamic);

var AgentDeskWidget = dynamic__default.default(
  () => import('./index.cjs').then((mod) => ({ default: mod.AgentDeskWidget })),
  { ssr: false }
);
var nextjs_default = AgentDeskWidget;

exports.AgentDeskWidget = AgentDeskWidget;
exports.default = nextjs_default;
//# sourceMappingURL=nextjs.cjs.map
//# sourceMappingURL=nextjs.cjs.map