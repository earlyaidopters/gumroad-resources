#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PYTHON="${PYTHON:-$ROOT/.venv/bin/python}"
export PYTHONPATH="$ROOT/src/gateway"
"$PYTHON" -m unittest discover -s tests/brain "$@"
"$PYTHON" -m unittest discover -s tests/gateway "$@"
"$PYTHON" -m unittest discover -s tests/public "$@"
