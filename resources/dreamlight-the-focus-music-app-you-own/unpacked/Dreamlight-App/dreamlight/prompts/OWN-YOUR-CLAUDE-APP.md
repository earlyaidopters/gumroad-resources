# Turn any Claude app into one you own

A Claude app comes with your connections, but it only opens inside Claude, online and signed in. To get the same thing as an app you own, you need three pieces.

1. **Somewhere to keep your data.** A database that lives on your computer, or a hosted one like Supabase.
2. **Somewhere to host it.** Vercel, Railway or Hostinger all have Claude connectors, so it's one click to hook them up.
3. **Your connections.** [Composio](https://composio.dev) links your app to Google Calendar and over two thousand other apps. For something like Dreamlight, the free plan is plenty.

First get your app's code out of Claude. Open the artifact, use its copy or download option, and save the code in a new empty folder. Then open Claude Code or Codex (agents that can run commands on your computer) in that folder and send this prompt. Codex deploys with Vercel's command-line tool instead of the connector, which ends up in the same place.

```text
Rebuild this Claude app as a web app I own. Save its data in a database, either a local file or Supabase. Deploy it with the Vercel connector. Use Composio to connect my Google Calendar so it can read my schedule and add events. Then tell me exactly what to click to finish setup.
```

It sets those three pieces up for you. Expect to click through a few sign-ins (Vercel, Supabase if you pick it, Composio and Google) along the way.

Want it on your desktop and playing offline too? Follow up with this.

```text
Wrap this website into a desktop app with Electron, with its own icon.
```

Dreamlight's own desktop app in [`desktop/`](../desktop/) is a finished example of the result, including the Composio calendar connection and play-after-meetings.
