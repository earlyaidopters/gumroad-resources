# Your first conversation

## Before you begin

Use an M5Stack StackChan with the ESP32-S3 board and the matching upstream firmware target. The launcher is designed for macOS. The offline demo works on any computer with Python 3.10 or later.

For the physical build you need Python 3.12, Git, `uv`, a USB data cable, a private Wi-Fi network, libopus and your own Claude and Fish Audio credentials. Search and app connections are optional. Provider usage is billed to your accounts.

Install `uv` from [its official instructions](https://docs.astral.sh/uv/getting-started/installation/). On a Homebrew Mac, install the audio library with `brew install opus`. For source firmware builds, also install Docker and follow [the firmware guide](FIRMWARE.md).

## 1. Reconstruct the source

```bash
git clone https://github.com/promptadvisers/lil-token-robot.git
cd lil-token-robot
bash tools/bootstrap-src.sh
uv venv .venv --python 3.12
uv pip install --python .venv/bin/python -r brain/requirements.txt
uv pip install --python .venv/bin/python -e 'src/gateway[tts-elevenlabs,stt-faster-whisper,stt-openai]'
```

The bootstrap checks out the upstream commit recorded in `fork/UPSTREAM_BASE`, applies this release’s patch and copies the generated firmware face frames. It stops if `src/` already exists.

The gateway’s `tts-elevenlabs` extra provides the MP3 decoder also used by the Fish adapter. Speech synthesis is selected as Fish by the launcher.

## 2. Give this checkout its own settings

```bash
.venv/bin/python tools/configure.py
```

This creates `.env` with a fresh device token and private file permissions. Open it in your editor and fill in the blank values below.

| Setting | Where it comes from |
| --- | --- |
| `ANTHROPIC_API_KEY` | Your Claude Console API key |
| `FISH_AUDIO_API_KEY` | Your Fish Audio API key |
| `STACKCHAN_FISH_VOICE_OWNER` | A voice ID you are allowed to use |
| `STACKCHAN_FISH_MODEL` | A model available to your Fish account |
| `HOST` | Your Mac’s private LAN address for the robot connection |
| `VISION_HOST` | The same private LAN address |
| `LILTOKEN_TIMEZONE` | Your IANA timezone, such as `Europe/London` |
| `FIRECRAWL_API_KEY` | Optional, for web research |

Keep `MCP_HTTP_HOST=127.0.0.1`. The agent’s control ports stay on your computer. Only the device gateway and capture endpoint bind to the LAN address you choose.

The source example retains `drama-3`, the model used in the video. If your account rejects that model, set a supported Fish model and test a short line. The [Fish documentation](https://docs.fish.audio/features/text-to-speech) describes current model and voice settings. The [Claude Agent SDK quick start](https://code.claude.com/docs/en/agent-sdk/quickstart) describes supported authentication.

```bash
.venv/bin/python tools/run.py doctor
```

The doctor reports whether required settings exist without printing their values.

## 3. Prepare the robot

Follow [the firmware guide](FIRMWARE.md) before flashing. Make a private backup of your own device, check its flash size and hardware target, and retain that backup for recovery.

In the robot’s network setup, enter your Wi-Fi details and the gateway address `ws://YOUR_MAC_LAN_IP:8765/`. Use the same device token stored in your checkout’s `.env`. The exact configuration screen depends on the installed firmware.

## 4. Start the gateway, then the agent

In terminal one, from the checkout root:

```bash
.venv/bin/python tools/run.py gateway
```

In terminal two:

```bash
.venv/bin/python tools/run.py brain
```

The gateway downloads the local speech-recognition model the first time it needs it. Let that finish before judging response time.

```bash
curl http://127.0.0.1:8771/health
```

A healthy process returns `{"ok": true, ...}`. Then say “Hey Lil Token, say hello.” A short answer should come from your chosen Fish voice. Ask a follow-up. Pat the robot’s head during speech to check interruption.

## 5. Add one feature at a time

- Search needs `FIRECRAWL_API_KEY`.
- Music and presence use the [optional dependency setup](INTEGRATIONS.md).
- Email, app and business access each require your explicit local configuration.
- The face files work independently of any cloud account.

## Stop and remove

Press Ctrl+C in both terminals. Remove the checkout’s `.env` to remove its saved credentials and revoke unused provider keys in your account dashboards. Local memory is in `brain/memory.md`, runtime state in `brain/state/`, and optional recordings in your gateway cache. Delete those if you no longer want them. The setup does not install a background service. Restore your own firmware backup if you want the original robot software back.
