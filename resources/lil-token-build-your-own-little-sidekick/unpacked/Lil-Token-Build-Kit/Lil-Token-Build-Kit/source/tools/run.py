#!/usr/bin/env python3
"""Run one service with project-local configuration. Never reads a home .env."""
import os
import sys
from pathlib import Path
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
SAFE_ENV = {'PATH', 'HOME', 'USER', 'TMPDIR', 'LANG', 'LC_ALL', 'SSL_CERT_FILE', 'SSL_CERT_DIR',
            'SYSTEMROOT', 'DYLD_FALLBACK_LIBRARY_PATH', 'HF_HOME'}
PREFIXES = ('LILTOKEN_', 'STACKCHAN_', 'MCP_HTTP_', 'VISION_', 'COMPOSIO_')
KEYS = {'ANTHROPIC_API_KEY', 'FISH_AUDIO_API_KEY', 'FIRECRAWL_API_KEY', 'GOOGLE_ACCESS_TOKEN',
        'GOOGLE_API_KEY', 'STRIPE_SECRET_KEY', 'GUMROAD_ACCESS_TOKEN', 'YOUTUBE_ACCESS_TOKEN', 'HOST', 'WS_PORT', 'CAPTURE_PORT'}


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    if mode not in ('gateway', 'brain', 'doctor'):
        raise SystemExit('Usage: python tools/run.py gateway|brain|doctor')
    # No interpolation: values cannot expand or import unrelated shell secrets.
    local = {k: v for k, v in dotenv_values(ROOT / '.env', interpolate=False).items() if v is not None}
    accepted = lambda key: key in KEYS or key.startswith(PREFIXES)
    env = {k: v for k, v in os.environ.items() if k in SAFE_ENV or accepted(k)}
    env.update({k: v for k, v in local.items() if accepted(k)})
    if mode == 'doctor':
        for key in ('STACKCHAN_TOKEN', 'ANTHROPIC_API_KEY', 'FISH_AUDIO_API_KEY', 'STACKCHAN_FISH_VOICE_OWNER'):
            print(key + (' configured' if env.get(key) else ' missing'))
        print('Upstream source ' + ('present' if (ROOT / 'src/gateway').is_dir() else 'missing'))
        return
    if len(env.get('STACKCHAN_TOKEN', '')) < 32:
        raise SystemExit('Create a strong device token with python tools/configure.py first.')
    if mode == 'brain' and not env.get('ANTHROPIC_API_KEY'):
        raise SystemExit('Add your own ANTHROPIC_API_KEY to .env for the agent.')
    if mode == 'gateway' and not all(env.get(k) for k in ('FISH_AUDIO_API_KEY', 'STACKCHAN_FISH_VOICE_OWNER')):
        raise SystemExit('Add your Fish API key and your own voice ID to .env.')
    env['PATH'] = str(Path(sys.executable).parent) + os.pathsep + env.get('PATH', '')
    env['PYTHONPATH'] = str(ROOT / 'src/gateway')
    env.update({'STACKCHAN_TTS_ENGINE': 'fish', 'STACKCHAN_AUDIO_HOOK_MODE': 'wake',
                'STACKCHAN_AUDIO_HOOK_URL': 'http://127.0.0.1:8771/wake',
                'STACKCHAN_EVENTS_HOOK_URL': 'http://127.0.0.1:8771/event',
                'STACKCHAN_EARS_HOOK_URL': 'http://127.0.0.1:8771/utterance',
                'STACKCHAN_EARS': '1', 'STACKCHAN_EARS_MODEL': 'small.en', 'STACKCHAN_LISTEN_GATE': '1'})
    os.chdir(ROOT)
    command = [sys.executable, str(ROOT / 'brain/brain.py')] if mode == 'brain' else [str(Path(sys.executable).parent / 'stackchan-mcp'), 'serve', '--transport', 'streamable-http']
    os.execve(command[0], command, env)


if __name__ == '__main__':
    main()
