#!/usr/bin/env python3
"""Create private local settings without overwriting an existing configuration."""
from pathlib import Path
import os
import secrets

root = Path(__file__).resolve().parents[1]
target = root / '.env'
content = (root / '.env.example').read_text().replace('STACKCHAN_TOKEN=\n', 'STACKCHAN_TOKEN=' + secrets.token_urlsafe(32) + '\n')
try:
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    raise SystemExit('.env already exists. Edit it locally to keep your settings.')
with os.fdopen(fd, 'w') as output:
    output.write(content)
print('Created private .env. Add your provider keys and your own Fish voice ID.')
