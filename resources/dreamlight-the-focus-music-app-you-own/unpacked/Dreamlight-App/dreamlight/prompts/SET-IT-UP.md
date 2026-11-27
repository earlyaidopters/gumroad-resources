# Set up Dreamlight with one prompt

Paste this into Claude Code, Codex, or any AI agent that can run commands on your computer. It does the setup for you and asks before installing anything.

```text
Set up Dreamlight for me, the free focus music app at
https://github.com/promptadvisers/dreamlight

I'm not technical, so please do every step yourself, explain each one in a sentence of
plain English, and ask me before you install anything on my computer.

1. Check that I have git and Python 3. If something is missing, tell me what it is and
   install it once I say yes. On Windows, Python may be called "python" instead of
   "python3".
2. Download the project into a folder called dreamlight in my home folder. If I already
   unzipped Dreamlight-App.zip, use that folder instead.
3. Get the music by running "python3 get_music.py" inside that folder. It's about
   2.2 GB, so tell me roughly how long that will take on my connection.
4. Start the player with "python3 server.py 8787", open http://localhost:8787 in my
   browser, and check that a track plays.
5. Then ask me which of these I want, and do the ones I pick.
   a) A desktop app that plays offline. Install Node.js if I don't have it. In the
      desktop folder run "npm install", then "npm run install:mac" on a Mac (Dreamlight
      goes in my Applications folder) or "npm run install:win" on Windows (Dreamlight
      goes in my Start menu and on my desktop). On Linux, run "npm start" instead.
   b) A website I can open on my phone. Deploy the web folder to Vercel, helping me sign
      in or make a free account. The music is 2.2 GB and Vercel's free plan may refuse
      an upload that big. If it does, deploy the player without web/audio, put the MP3s
      on storage that allows cross-origin requests (Cloudflare R2's free tier fits),
      point the "url" fields in web/tracks.json at them and redeploy. Then give me the
      link and walk me through adding it to my home screen.
   c) My Google Calendar, connected through Composio, so I can add focus sessions to my
      calendar and have music start after my meetings. This works in the desktop app, so
      set up a) first if I haven't. Follow the "Connect your calendar" section of the
      README. Never show my Composio key on screen or save it inside the project folder.
6. Finish with a short summary of what's installed, where it lives, and how to open it
   next time.
```
