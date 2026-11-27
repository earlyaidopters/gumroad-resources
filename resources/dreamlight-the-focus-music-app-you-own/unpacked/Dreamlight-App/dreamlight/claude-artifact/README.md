# Dreamlight as a Claude app

This folder is the Claude version of the same player, published as a Claude artifact and installed with **Install as app**. It shares the web player's sessions, playback, visuals and art. Four files differ.

| File | What changes |
|---|---|
| `index.html` | Declares the Claude permissions it asks for (menu bar, shortcuts, notifications) and adds the Install as app button and the desktop switches |
| `player.js` | The player without the Electron-only calendar code |
| `player.css` | Styles for the Claude window chrome and the switches |
| `claude-bridge.js` | Talks to Claude's app APIs for the menu bar, shortcut, notifications and calendar |

## Build it

```bash
python3 get_music.py              # from the repo root, if you haven't already
./claude-artifact/build.sh        # writes claude-artifact/dist
```

Claude caps each uploaded file at 20 MB and each artifact version at 256 MB, plus a 1 GB allowance for larger assets. A one-hour MP3 is about 82 MB, so `build.sh` re-encodes every track to HE-AAC at 40 kbps (about 18 MB per hour) with both ear channels kept separate for the binaural beats. Encoding needs an `ffmpeg` with `aac_at` (built in on macOS) or `libfdk_aac`.

## Publish it

Publishing goes through Claude's artifact tools, for example from Claude Code with the Claude artifacts connector turned on. Ask it something like this.

```text
Publish the folder claude-artifact/dist as a Claude artifact called Dreamlight. Keep index.html as the entry page. The 25 audio files will not all fit in one version, so upload the ones that don't fit as assets and point their "url" fields in tracks.json at the asset links. Then give me the artifact link.
```

Open the link in Claude Desktop, then choose **Install as app** from the artifact's menu. It opens in its own window.

## What to expect

- It opens only while you're online and signed in to Claude, and it's a window of Claude Desktop rather than its own program.
- If the artifact is deleted, or someone stops sharing it with you, the installed app stops opening.
- The tracks are about a fifth of the original size. They sound close, and the left and right tones stay separate, but the MP3s in the owned app are the full-quality versions.

For a copy you own outright that plays offline, use the [desktop app](../desktop/) or the setup prompt in the [main README](../README.md#set-it-up-with-one-prompt).
