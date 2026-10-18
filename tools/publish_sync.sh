#!/usr/bin/env bash
# Reconcile against new main after a concurrent source-package publication.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "${GITHUB_ACTIONS:-}" != true ]; then
  echo 'This publisher runs only inside the isolated GitHub Actions checkout.' >&2
  exit 1
fi
git config user.name 'gumroad-sync[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
for attempt in 1 2 3; do
  git add README.md manifest.json sync-status.json resources tools/youtube_map.json tools/categories.json
  if ! git diff --cached --quiet; then
    git commit -m "sync: verify Gumroad resources ($(date -u +%Y-%m-%d))"
  fi
  if git push origin HEAD:main; then
    exit 0
  fi
  if [ "$attempt" = 3 ]; then
    echo 'Push failed after three fresh reconciliations.' >&2
    exit 1
  fi
  # Preserve remote publications; never force-push or overwrite another writer.
  git fetch origin main
  git reset --hard origin/main
  bash tools/sync.sh
done
