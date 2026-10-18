#!/usr/bin/env bash
# Publish only after download and finished-catalogue verification both pass.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f .sync-auth-failed .sync-video-failed resources/pull-manifest.json
sync_tmp=$(mktemp -d "${RUNNER_TEMP:-/tmp}/gumroad-sync.XXXXXX")
trap 'rm -rf "$sync_tmp"' EXIT
if [ -n "${GUMROAD_COOKIE:-}" ]; then
  umask 077
  export GUMROAD_COOKIE_FILE="$sync_tmp/cookies"
  printf '%s' "$GUMROAD_COOKIE" > "$GUMROAD_COOKIE_FILE"
  unset GUMROAD_COOKIE
fi

if [ "${GITHUB_ACTIONS:-}" = "true" ] && [ -z "${GUMROAD_ACCESS_TOKEN:-}" ]; then
  touch .sync-auth-failed
  echo "::error::GUMROAD_ACCESS_TOKEN is missing from repository secrets"
  exit 3
fi

echo "==> checking Gumroad authentication"
if python3 tools/gumroad-pull check > "$sync_tmp/check.json"; then
  :
else
  check_exit=$?
  if [ "$check_exit" -eq 3 ]; then touch .sync-auth-failed; fi
  echo "Gumroad authentication check failed (exit $check_exit); see the error above."
  exit "$check_exit"
fi
if ! python3 -c 'import json,sys; sys.exit(0 if json.load(open(sys.argv[1])).get("ok") is True else 1)' "$sync_tmp/check.json"; then
  touch .sync-auth-failed
  exit 1
fi

echo "==> building and validating the live product index"
export SYNC_INDEX_OBSERVED_AT
SYNC_INDEX_OBSERVED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
python3 tools/gumroad-pull products --delay=0.3 > "$sync_tmp/products_index.json"
python3 tools/verify_sync.py --index "$sync_tmp/products_index.json"

echo "==> pulling every published product from the same index snapshot"
python3 tools/gumroad-pull pull --all --published-only --out=resources --delay=0.3 --max-file-mb=95 --index="$sync_tmp/products_index.json"
python3 tools/verify_sync.py --index "$sync_tmp/products_index.json" --pull resources/pull-manifest.json

if [ -n "${YOUTUBE_API_KEY:-}" ]; then
  echo "==> refreshing YouTube pairings"
  if ! GUMROAD_INDEX="$sync_tmp/products_index.json" python3 tools/youtube_map.py; then
    touch .sync-video-failed
    echo "::warning::Video pairing refresh failed; publishing verified resources with existing pairings"
  fi
else
  if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    touch .sync-video-failed
    echo "::warning::YOUTUBE_API_KEY is missing; resource publication can still proceed"
  fi
  echo "==> no YOUTUBE_API_KEY, keeping existing pairings for local verification"
fi

echo "==> rebuilding and checking the finished catalogue"
python3 tools/build_repo.py --repo . --index "$sync_tmp/products_index.json"
python3 tools/verify_sync.py --index "$sync_tmp/products_index.json" --pull resources/pull-manifest.json --built --write-status
rm -f resources/pull-manifest.json
echo "==> complete: safe to commit the verified mirror"
