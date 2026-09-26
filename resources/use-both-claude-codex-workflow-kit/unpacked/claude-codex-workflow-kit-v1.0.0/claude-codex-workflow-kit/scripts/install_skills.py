#!/usr/bin/env python3
"""Install this kit's project-local skills, with preview and conflict checks."""
import argparse
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parents[1]
TARGETS = {"claude": ".claude/skills", "codex": ".agents/skills"}
SKILLS = ("handoff", "prime")


def checked_path(root, relative):
    path = root
    for part in Path(relative).parts:
        path = path / part
        if path.is_symlink():
            raise ValueError(f"Refusing symlink: {path}")
    if not path.resolve().is_relative_to(root):
        raise ValueError(f"Destination escapes project: {path}")
    return path


def plan_install(project, target):
    supplied = Path(project).expanduser().absolute()
    if any(p.is_symlink() for p in (supplied, *supplied.parents)):
        raise ValueError("Project path must not contain symlinks; use its real path.")
    root = supplied.resolve(strict=True)
    if not root.is_dir() or root == Path.home().resolve() or root == Path(root.anchor):
        raise ValueError("Choose an existing project directory, not home or filesystem root.")
    selected = tuple(TARGETS) if target == "both" else (target,)
    plan = []
    for client in selected:
        for skill in SKILLS:
            relative = f"{TARGETS[client]}/{skill}/SKILL.md"
            destination = checked_path(root, relative)
            source = KIT / "skills" / skill / "SKILL.md"
            data = source.read_bytes()
            for parent in destination.parents:
                if parent == root:
                    break
                if parent.exists() and not parent.is_dir():
                    raise ValueError(f"Expected a directory: {parent}")
            if destination.parent.exists():
                extras = set(destination.parent.iterdir()) - {destination}
                if extras:
                    raise ValueError(f"Existing skill directory has other files: {destination.parent}")
            if destination.exists():
                if not destination.is_file() or destination.read_bytes() != data:
                    raise ValueError(f"Existing skill differs; no files changed: {destination}")
                state = "unchanged"
            else:
                state = "create"
            plan.append((root, relative, data, state))
    return plan


def install(project, target="both", apply=False):
    plan = plan_install(project, target)
    for root, relative, data, state in plan:
        print(f"{state.upper():9} {root / relative}")
    if not apply:
        print("Preview only. Re-run with --apply to install. Global skills are not checked or changed.")
        return plan
    for root, relative, data, state in plan:
        if state == "unchanged":
            continue
        destination = checked_path(root, relative)
        destination.parent.mkdir(parents=True, exist_ok=True)
        checked_path(root, relative)
        # Exclusive creation prevents overwriting a file created since preflight.
        with destination.open("xb") as handle:
            handle.write(data)
    print("Installed. Open a fresh session and check skill names before use.")
    return plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True, help="Existing project directory")
    parser.add_argument("--target", choices=("claude", "codex", "both"), default="both")
    parser.add_argument("--apply", action="store_true", help="Write files after preflight")
    args = parser.parse_args()
    try:
        install(args.project, args.target, args.apply)
    except (ValueError, OSError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
