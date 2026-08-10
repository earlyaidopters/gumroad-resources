#!/usr/bin/env bash
# Cloud sync: refresh the repo from Gumroad using the seller session cookie.
# Exit 0 = synced (commit step decides if anything changed).
# Touches $RUNNER_TEMP/auth_failed and exits 1 if the cookie is dead.
set -euo pipefail
cd "$(dirname "$0")/.."

TMP="${RUNNER_TEMP:-/tmp}"
mkdir -p "$HOME/.config/gumroad"
printf '%s' "${GUMROAD_COOKIE:?GUMROAD_COOKIE secret not set}" > "$HOME/.config/gumroad/cookies"
chmod 600 "$HOME/.config/gumroad/cookies"

echo "==> checking Gumroad session"
if ! python3 tools/gumroad-pull check | tee "$TMP/check.json" | grep -q '"ok": true'; then
  echo "Gumroad session cookie is invalid or expired."
  touch "$TMP/auth_failed"
  exit 1
fi

echo "==> building product index (published + live)"
python3 tools/gumroad-pull products --delay=0.3 > "$TMP/products_index.json"

echo "==> pulling published products into resources/ (committed files cache downloads)"
python3 tools/gumroad-pull pull --all --published-only --out=resources --delay=0.3 --max-file-mb=95
rm -f resources/pull-manifest.json

echo "==> re-indexing repo (README + manifest, unpublished held back)"
python3 tools/build_repo.py --repo . --index "$TMP/products_index.json"
echo "==> done"
