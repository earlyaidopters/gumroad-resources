#!/bin/bash
cd "$(dirname "$0")"
PORT=8787
if ! lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  nohup python3 server.py $PORT >/tmp/dreamlight_player.log 2>&1 &
  sleep 0.6
fi
open "http://localhost:$PORT"
