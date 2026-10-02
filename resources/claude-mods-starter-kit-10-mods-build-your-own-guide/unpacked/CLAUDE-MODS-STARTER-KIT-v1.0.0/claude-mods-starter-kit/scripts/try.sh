#!/usr/bin/env bash
set -euo pipefail
kit_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
selection=${1:-terminal-pet}
mods=(terminal-pet coral-skin context-meter repo-heatmap flight-recorder model-router output-tray changes-receipt session-bookmarks auto-handoff)
if [[ "$selection" != all ]]; then
 found=false
 for mod in "${mods[@]}"; do [[ "$mod" != "$selection" ]] || found=true; done
 if [[ "$found" != true ]]; then echo 'Unknown mod; choose a plugin folder name or all.' >&2; exit 2; fi
 mods=("$selection")
fi
command -v claude >/dev/null || { echo 'Install Claude Code first.' >&2; exit 1; }
command -v python3 >/dev/null || { echo 'Python 3 is required to copy the safe demo.' >&2; exit 1; }
demo_dir=$(mktemp -d "${TMPDIR:-/tmp}/claude-mods-demo.XXXXXX")
python3 - "$kit_dir/demo-project" "$demo_dir" <<'COPY'
import shutil,sys
shutil.copytree(sys.argv[1], sys.argv[2], dirs_exist_ok=True)
COPY
export SESSION_BOOKMARKS_FILE="$demo_dir/.demo-bookmarks/bookmarks.json"
printf 'New demo: %s
No existing demo was reset. Type /exit to finish.
' "$demo_dir"
cd -- "$demo_dir"
args=()
for mod in "${mods[@]}"; do args+=(--plugin-dir "$kit_dir/plugins/$mod"); done
exec claude "${args[@]}"
