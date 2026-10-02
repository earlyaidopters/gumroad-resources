#!/usr/bin/env bash
set -euo pipefail
action=${1:-}; scope=${2:-}; selection=${3:-}
case "$action" in install|enable|disable|uninstall) ;; *) echo 'Usage: bash manage.sh install|enable|disable|uninstall user|project|local MOD|all' >&2; exit 2;; esac
case "$scope" in user|project|local) ;; *) echo 'Choose user, project, or local scope.' >&2; exit 2;; esac
mods=(terminal-pet coral-skin context-meter repo-heatmap flight-recorder model-router output-tray changes-receipt session-bookmarks auto-handoff)
if [[ "$selection" != all ]]; then
 found=false
 for mod in "${mods[@]}"; do [[ "$mod" != "$selection" ]] || found=true; done
 if [[ "$found" != true ]]; then echo 'Unknown mod. Use a folder name from plugins/ or all.' >&2; exit 2; fi
 mods=("$selection")
fi
command -v claude >/dev/null || { echo 'Install Claude Code first.' >&2; exit 1; }
failed=0
for mod in "${mods[@]}"; do
 args=(plugin "$action" "$mod@claude-mods-kit" --scope "$scope")
 [[ "$action" != uninstall ]] || args+=(--keep-data)
 if ! claude "${args[@]}"; then echo "Failed: $action $mod at $scope scope" >&2; failed=1; fi
done
if [[ $failed == 0 ]]; then echo 'Commands succeeded. Close old sessions and start a fresh Claude Code session.'; fi
exit "$failed"
