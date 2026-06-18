---
"@agentdeskbot/react": major
"@agentdeskbot/vue": major
---

Update default hosted endpoints

The default `scriptSrc` and `apiOrigin` values have been updated from relative paths (assuming same-origin) to point to the official hosted Vercel deployment (`https://agentdeskbot.vercel.app/widget.js` and `https://agentdeskbot.vercel.app` respectively).

If you are self-hosting the backend or reverse-proxying the widget script, you must now explicitly pass your `scriptSrc` and `apiOrigin` props to the component to override the new hosted defaults.
