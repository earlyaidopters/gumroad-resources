#!/usr/bin/env python3
"""Check prerequisites, then install this local marketplace on explicit --apply."""
import argparse, json, os, platform, shutil, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
APP_NODE = Path('/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node')

def run(argv):
    return subprocess.run(argv, text=True, capture_output=True, timeout=30)

def commands(root, home, component):
    out = [['claude', 'plugin', 'marketplace', 'add', str(root)]]
    if component in ('both', 'computer-use'):
        out += [['claude', 'mcp', 'add', '--scope', 'user', 'codex-cu', '--', str(APP_NODE), str(home / '.claude/mcp/codex-cu/launch.mjs')],
                ['claude', 'plugin', 'install', 'codex-computer-use@two-mods', '--scope', 'user']]
    if component in ('both', 'threads'):
        out += [['claude', 'plugin', 'install', 'threads@two-mods', '--scope', 'user']]
    return out

def check(home, component):
    errors = []
    if not shutil.which('claude'):
        return ['Claude Code CLI is missing. Install it and sign in before continuing.']
    result = run(['claude', 'plugin', '--help'])
    if result.returncode or 'test' not in result.stdout:
        errors.append('This Claude CLI does not expose the mod testing command. Check your mod-enabled version.')
    if component in ('both', 'threads'):
        if not shutil.which('tmux'): errors.append('tmux is missing. On a Homebrew Mac: brew install tmux')
        auth = run(['claude', 'auth', 'status'])
        try: logged = json.loads(auth.stdout).get('loggedIn') is True
        except ValueError: logged = False
        if not logged: errors.append('Terminal Claude login is not confirmed. Run: claude auth login')
    if component in ('both', 'computer-use'):
        if platform.system() != 'Darwin': errors.append('Computer Use requires macOS.')
        if not APP_NODE.is_file(): errors.append('ChatGPT computer-use Node runtime not found. Install/open the supported Mac app and enable computer use.')
        root = home / '.codex/plugins/cache/openai-bundled/unified-computer-use'
        configs = list(root.glob('*/.mcp.json')) if root.exists() else []
        if not configs: errors.append('No installed Codex computer-use plugin config found. Set up computer use in the ChatGPT/Codex app first.')
    return errors

def copy_bridge(root, home):
    dst = home / '.claude/mcp/codex-cu'
    if dst.exists(): raise FileExistsError('Existing bridge found. Nothing overwritten. See docs/INSTALL.md for migration.')
    dst.mkdir(parents=True, mode=0o700)
    for name in ['launch.mjs', 'daemon.mjs']: shutil.copy2(root / 'bridge' / name, dst / name)
    (dst / 'always-allowed.json').write_text(json.dumps({'apps': [], 'autoApproveAll': False}, indent=2) + '\n')
    os.chmod(dst / 'always-allowed.json', 0o600)

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--component', choices=['both', 'computer-use', 'threads'], default='both')
    ap.add_argument('--apply', action='store_true', help='Install after checks. Without this, read-only.')
    args = ap.parse_args(); home = Path.home()
    errors = check(home, args.component)
    print('Read-only prerequisite check' if not args.apply else 'Installation checks')
    for error in errors: print('NEEDS ATTENTION:', error)
    for cmd in commands(ROOT, home, args.component): print('Will run:', ' '.join(cmd))
    print('Threads retains the filmed bypassPermissions default. Use only a trusted scratch project for the first test; /threads mode default changes it.')
    if errors: return 1
    if not args.apply:
        print('Prerequisite check passed. This is not a live app/session test. Re-run with --apply to install.'); return 0
    # Refuse to mix this package into an existing working bridge or duplicate plugin install.
    installed = run(['claude', 'plugin', 'list', '--json'])
    if installed.returncode: print('Cannot inspect installed plugins; stopped before writing.'); return 1
    try:
        entries = json.loads(installed.stdout)
        if not isinstance(entries, list): raise ValueError()
    except ValueError: print('Unexpected plugin list format; stopped before writing.'); return 1
    wanted = {'threads'} if args.component == 'threads' else {'codex-computer-use'} if args.component == 'computer-use' else {'threads','codex-computer-use'}
    if any(str(e.get('id', e.get('name',''))).split('@')[0] in wanted for e in entries):
        print('A selected mod is already installed. Nothing changed. See docs/INSTALL.md.'); return 1
    if args.component in ('both','computer-use'):
        if (home / '.claude/mcp/codex-cu').exists():
            print('Existing bridge found. Nothing changed. See docs/INSTALL.md.'); return 1
        existing = run(['claude','mcp','get','codex-cu'])
        if existing.returncode == 0:
            print('An existing codex-cu MCP registration was found. Nothing changed. See docs/INSTALL.md.'); return 1
        copy_bridge(ROOT, home)
    for cmd in commands(ROOT, home, args.component):
        result = subprocess.run(cmd)
        if result.returncode:
            print('Stopped at the command above. Previous steps may have completed; see docs/INSTALL.md.'); return result.returncode
    print('Installed. Keep this folder in place. Open a NEW Claude chat, then follow docs/DEMO.md.')
    return 0
if __name__ == '__main__': sys.exit(main())
