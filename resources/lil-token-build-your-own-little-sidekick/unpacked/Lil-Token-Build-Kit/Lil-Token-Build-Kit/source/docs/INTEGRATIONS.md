# Add your own integrations

Each feature should be tested on its own before you add it to the voice loop. `.env` belongs to your checkout and is ignored by Git.

## Search

Set `FIRECRAWL_API_KEY` to your own key. Ask a narrow question, inspect the returned sources and confirm that the answer follows them. Provider rate limits and failed requests should produce a short error instead of an invented answer.

## Read-only Google

Set `LILTOKEN_GOOGLE=1` and supply `GOOGLE_ACCESS_TOKEN` with only the read scopes you need. The public adapter uses Google’s REST APIs for Calendar, Gmail and Drive. Use a separate test account first. Access tokens expire and must be refreshed through your own OAuth application or credential flow.

`primary`, `all`, `pa` and `d2g` resolve to this one explicitly configured token for compatibility with the original prompts. They do not select stored accounts. The adapter implements calendar, inbox, message read and Drive search. Draft creation and sending are absent from the public adapter.

## Composio

```bash
uv pip install --python .venv/bin/python composio==0.32.0
```

Supply `COMPOSIO_API_KEY`, set `LILTOKEN_COMPOSIO=read` and restrict `LILTOKEN_COMPOSIO_TOOLKITS` to the apps you need. The default is `off`. The source also retains the original `ask` mode, which can permit writes after recognized spoken intent. Spoken intent matching is an additional check, not a security boundary against every attack. Keep the mode read-only for an account with important data.

## Business data

Set `LILTOKEN_BUSINESS=1` and your own Stripe or Gumroad token. The public adapter retrieves a bounded first page and labels that scope in its result. Use restricted read-only credentials where the provider supports them. Totals based on a partial page must not be presented as complete accounting.

## Music and presence

```bash
uv pip install --python .venv/bin/python -r brain/requirements-optional.txt
```

Set `LILTOKEN_MUSIC=1` for local CLAP classification. This downloads model weights on first use. The shipped genre prototypes come from synthetic music used during development. Train on your own room and speaker setup before trusting the labels.

For presence checks, obtain the YuNet model from the [OpenCV Zoo face-detection project](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet), inspect its license, and put `face_detection_yunet_2023mar.onnx` in `brain/models/`. Set `LILTOKEN_PRESENCE=1` and optionally `LILTOKEN_EYE_CONTACT=1`. Presence uses the camera locally. Visual questions deliberately send a photo to Claude.

Optional song identification sends a short audio clip to Google. It requires both `LILTOKEN_SONG_NAME=1` and your own `GOOGLE_API_KEY`. Leave it off to keep genre classification local.

## Your voice and wake phrase

Use a Fish voice you have rights to use. A custom voice requires that provider’s enrollment process. The package contains the face art and speech code. Your voice recordings and enrolled profiles are created locally.

The default wake check uses local Whisper and fuzzy matching for “Hey Lil Token”. The optional classifier can be trained with `tools/wake/`. That training process needs your own permitted audio and optional audio-model dependencies. The personal wake classifier from the recording is excluded.

## Coding by voice

The code-task implementation is included for study. It is off by default and the allowed-folder map starts empty. If you experiment with it, use a disposable checkout, add that absolute folder to your private `config/code_folders.json`, and set `LILTOKEN_CODE_TASKS=1`.

It can write files and run tests. Tests can execute code. The allowlist limits the intended project and tools; use OS or container isolation for a genuine sandbox. Never point it at your home folder, important working repo or credential directories.

## Notifications

Local code-completion hooks are also off by default. Inspect `tools/claude_hook.py` before registering it with Claude Code. Turn on `LILTOKEN_HOOK=1` only in sessions you want announced. The hook uses this checkout’s token and never opens a public endpoint.
