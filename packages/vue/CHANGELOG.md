# @agentdeskbot/vue

## 1.0.0

### Major Changes

- 03f010a: Refactored React and Vue SDK prop defaults (`scriptSrc` and `apiOrigin`) to point directly to the Vercel hosted environment (`https://agentdeskbot.vercel.app`) to support botId-only embeds out of the box. This is a breaking change for self-hosted deployments who relied on same-origin fallbacks without passing explicit props.
- 7052d7e: Update default hosted endpoints

  The default `scriptSrc` and `apiOrigin` values have been updated from relative paths (assuming same-origin) to point to the official hosted Vercel deployment (`https://agentdeskbot.vercel.app/widget.js` and `https://agentdeskbot.vercel.app` respectively).

  If you are self-hosting the backend or reverse-proxying the widget script, you must now explicitly pass your `scriptSrc` and `apiOrigin` props to the component to override the new hosted defaults.
