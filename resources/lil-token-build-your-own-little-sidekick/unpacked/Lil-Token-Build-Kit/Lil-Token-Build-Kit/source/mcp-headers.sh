#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/.venv/bin/python" -c 'import json,sys; from dotenv import dotenv_values; v=dotenv_values(sys.argv[1],interpolate=False); print(json.dumps({"Authorization":"Bearer "+v.get("STACKCHAN_TOKEN","")}))' "$ROOT/.env"
