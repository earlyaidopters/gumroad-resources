"""Audit a working directory for an existing Claude Code setup.

Read-only. Never modifies anything. Returns JSON describing what's already
present so the silver-platter interview can skip questions about it.

Usage:
    python3 audit_existing_folder.py [path]   # defaults to cwd

Output: pretty-printed JSON to stdout.
"""
import json
import sys
from pathlib import Path


def safe_count_lines(p: Path) -> int:
    try:
        return sum(1 for _ in p.read_text(encoding="utf-8").splitlines())
    except Exception:
        return 0


def list_md(d: Path) -> list[str]:
    if not d.is_dir():
        return []
    return sorted(p.stem for p in d.glob("*.md") if p.is_file())


def list_subdirs(d: Path) -> list[str]:
    if not d.is_dir():
        return []
    return sorted(p.name for p in d.iterdir() if p.is_dir())


def settings_has_hooks(p: Path) -> bool:
    if not p.is_file():
        return False
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        hooks = data.get("hooks", {})
        return bool(hooks)
    except Exception:
        return False


def audit(root: Path) -> dict:
    claude_dir = root / ".claude"
    data_dir = root / "data"
    silver_platters = root / "silver_platters"
    outputs = root / "outputs"

    detections = {
        "claude_md": {
            "exists": (claude_dir / "CLAUDE.md").is_file() or (root / "CLAUDE.md").is_file(),
            "lines": (
                safe_count_lines(claude_dir / "CLAUDE.md")
                if (claude_dir / "CLAUDE.md").is_file()
                else safe_count_lines(root / "CLAUDE.md")
                if (root / "CLAUDE.md").is_file()
                else 0
            ),
            "path": (
                str((claude_dir / "CLAUDE.md").relative_to(root))
                if (claude_dir / "CLAUDE.md").is_file()
                else (
                    str((root / "CLAUDE.md").relative_to(root))
                    if (root / "CLAUDE.md").is_file()
                    else None
                )
            ),
        },
        "settings_json": {
            "exists": (claude_dir / "settings.json").is_file(),
            "has_hooks": settings_has_hooks(claude_dir / "settings.json"),
        },
        "skills": {
            "count": len(list_subdirs(claude_dir / "skills")),
            "names": list_subdirs(claude_dir / "skills"),
        },
        "agents": {
            "count": len(list_md(claude_dir / "agents")),
            "names": list_md(claude_dir / "agents"),
        },
        "rules": {
            "count": len(list_md(claude_dir / "rules")),
            "names": list_md(claude_dir / "rules"),
        },
        "data_namespaces": list_subdirs(data_dir),
        "silver_platters": [
            p.name
            for p in (silver_platters.glob("*.md") if silver_platters.is_dir() else [])
        ],
        "audit_log": {
            "exists": (outputs / "audit_log.md").is_file(),
            "line_count": safe_count_lines(outputs / "audit_log.md"),
        },
        "raw_dropzone": {
            "exists": (data_dir / "raw_dropzone").is_dir(),
            "file_count": (
                len(list((data_dir / "raw_dropzone").iterdir()))
                if (data_dir / "raw_dropzone").is_dir()
                else 0
            ),
        },
        "converted": {
            "exists": (data_dir / "converted").is_dir(),
            "file_count": (
                len(list((data_dir / "converted").iterdir()))
                if (data_dir / "converted").is_dir()
                else 0
            ),
        },
    }

    has_anything = (
        detections["claude_md"]["exists"]
        or detections["settings_json"]["exists"]
        or detections["skills"]["count"] > 0
        or detections["agents"]["count"] > 0
        or detections["rules"]["count"] > 0
        or len(detections["data_namespaces"]) > 0
        or len(detections["silver_platters"]) > 0
    )
    mode = "audit-existing" if has_anything else "greenfield"

    skip_questions = []
    if detections["skills"]["count"] > 0 or detections["agents"]["count"] > 0:
        skip_questions.append("Are you using Claude Code?")
    for skill_name in detections["skills"]["names"]:
        if "cfo" in skill_name.lower():
            skip_questions.append("Do you have a CFO bot?")
        if "cmo" in skill_name.lower():
            skip_questions.append("Do you have a CMO bot?")
        if "ea" in skill_name.lower() or "orchestrator" in skill_name.lower():
            skip_questions.append("Do you have an orchestrator?")
    if detections["silver_platters"]:
        skip_questions.append("Do you already have weekly silver platters?")
    if detections["raw_dropzone"]["exists"]:
        skip_questions.append("Do you have a conversion hook for non-text files?")

    return {"mode": mode, "detections": detections, "skip_questions": skip_questions}


def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
    print(json.dumps(audit(root), indent=2))


if __name__ == "__main__":
    main()
