#!/bin/zsh
# Lil Token brain (launchd: com.liltoken.brain). Answers wake events.
set -a
eval "$(grep -E '^(STACKCHAN_TOKEN|FIRECRAWL_API_KEY|COMPOSIO_API_KEY|COMPOSIO_USER_API_KEY|COMPOSIO_ORG_ID|COMPOSIO_PROJECT_ID)=' ~/.env)"
set +a
export PATH=$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
cd ~/lil-token/brain
exec ~/lil-token/brain/.venv/bin/python brain.py
