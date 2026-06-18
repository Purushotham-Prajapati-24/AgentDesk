---
"@agentdeskbot/react": "major"
"@agentdeskbot/vue": "major"
---

Refactored React and Vue SDK prop defaults (`scriptSrc` and `apiOrigin`) to point directly to the Vercel hosted environment (`https://agentdeskbot.vercel.app`) to support botId-only embeds out of the box. This is a breaking change for self-hosted deployments who relied on same-origin fallbacks without passing explicit props.
