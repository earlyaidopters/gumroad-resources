#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$(cat "$ROOT/fork/UPSTREAM_BASE")"
if [[ -e "$ROOT/src" ]]; then
  echo 'src already exists. Use a new checkout to reconstruct a clean copy.' >&2
  exit 1
fi
git clone https://github.com/kisaragi-mochi/stackchan-mcp.git "$ROOT/src"
git -C "$ROOT/src" checkout --detach "$BASE"
git -C "$ROOT/src" apply "$ROOT/fork/lil-token.patch"
git -C "$ROOT/src" submodule update --init --recursive --depth 1
cp "$ROOT/fork/local/avatar_images.local.cc" "$ROOT/fork/local/avatar_images.local.h" "$ROOT/src/firmware/main/boards/stackchan/"
echo 'Pinned source reconstructed with the public Lil Token patch.'
