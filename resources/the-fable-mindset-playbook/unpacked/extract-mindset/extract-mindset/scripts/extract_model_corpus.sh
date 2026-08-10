#!/bin/bash
# extract_model_corpus.sh - pull every reasoning turn from ONE model out of all
# your Claude Code history, so you can study how that specific model thinks.
#
# Every assistant turn records message.model. So you can filter your whole
# history down to just the turns a given model produced.
#
# Usage:
#   ./extract_model_corpus.sh claude-fable-5   > fable_reasoning.jsonl
#   ./extract_model_corpus.sh claude-opus-4-8  > opus_reasoning.jsonl
# Then diff the two to see the discipline gap, or feed one to a strong model and
# ask it to write the operating manual (that is how Fable_Mindset.md was made).

set -euo pipefail
MODEL="${1:?usage: ./extract_model_corpus.sh <model-id>}"
HERE="$(cd "$(dirname "$0")" && pwd)"

# every session file that contains at least one turn from this model
grep -rl "\"model\":\"$MODEL\"" ~/.claude/projects/ 2>/dev/null | while read -r f; do
  python3 "$HERE/debloat_jsonl.py" "$f"
done | python3 -c "
import sys, json
M = '$MODEL'
for line in sys.stdin:
    o = json.loads(line)
    if o.get('role') == 'assistant' and o.get('model') == M:
        print(json.dumps(o, ensure_ascii=False))
"
