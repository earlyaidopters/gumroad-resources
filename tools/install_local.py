#!/usr/bin/env python3
"""Install the source outbox hook and hourly local watchdog, preserving publisher backups."""
import os
from pathlib import Path
import plistlib
import shlex
import shutil
import subprocess
import sys
import time

TOOLS = Path(__file__).resolve().parent
LABEL = 'com.markkashef.gumroad-mirror-watchdog'


def patch_publisher(source):
    if '# gumroad-mirror source backup' in source:
        return source
    required = ['import base64, hashlib', '    # 5) publish\n', '    return {"permalink": permalink,']
    if any(marker not in source for marker in required):
        raise ValueError('Publisher changed; refusing an unverified patch')
    source = source.replace('import base64, hashlib',
                            'from gumroad_mirror_hook import queue_originals, finish_mirror\nimport base64, hashlib', 1)
    source = source.replace('    # 5) publish\n',
                            '    # gumroad-mirror source backup: durable before a free resource goes live.\n'
                            '    mirror_queue = queue_originals(ext_id, files, entries, price)\n\n    # 5) publish\n', 1)
    source = source.replace('    return {"permalink": permalink,',
                            '    mirror_result = finish_mirror(mirror_queue, ext_id, publish)\n'
                            '    if mirror_result.get("status") == "retry-pending":\n'
                            '        print("  Gumroad published; GitHub delivery remains queued for automatic retry", file=sys.stderr)\n'
                            '    return {"id": ext_id, "mirror": mirror_result, "permalink": permalink,', 1)
    return source


def main():
    home = Path.home()
    state = home / '.local/state/gumroad-mirror'
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(state, 0o700)
    bindir = home / '.local/bin'
    bindir.mkdir(parents=True, exist_ok=True)
    wrapper = bindir / 'gumroad-mirror'
    wrapper.write_text('#!/bin/sh\nexec ' + shlex.quote(sys.executable) + ' ' +
                       shlex.quote(str(TOOLS / 'source_mirror.py')) + ' "$@"\n')
    wrapper.chmod(0o755)
    hook = bindir / 'gumroad_mirror_hook.py'
    if hook.is_symlink() or hook.exists():
        if hook.resolve() != TOOLS / 'publish_hook.py':
            raise ValueError('Unexpected existing publisher hook')
    else:
        hook.symlink_to(TOOLS / 'publish_hook.py')
    publisher = bindir / 'gumroad-push'
    source = publisher.read_text()
    patched = patch_publisher(source)
    compile(patched, str(publisher), 'exec')
    if patched != source:
        backup = state / ('gumroad-push-before-hook-' + str(int(time.time())) + '.py')
        backup.write_text(source); backup.chmod(0o600)
        publisher.write_text(patched)
        publisher.chmod(0o755)
    config = {'Label': LABEL, 'ProgramArguments': [sys.executable, str(TOOLS / 'local_watchdog.py')],
              'StartInterval': 3600, 'RunAtLoad': True,
              'EnvironmentVariables': {'PATH': str(bindir) + ':/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'},
              'StandardOutPath': str(state / 'watchdog.log'),
              'StandardErrorPath': str(state / 'watchdog-error.log')}
    plist = home / 'Library/LaunchAgents' / (LABEL + '.plist')
    plist.parent.mkdir(parents=True, exist_ok=True)
    with plist.open('wb') as f:
        plistlib.dump(config, f)
    target = 'gui/' + str(os.getuid())
    subprocess.run(['launchctl', 'bootout', target + '/' + LABEL], capture_output=True)
    subprocess.run(['launchctl', 'bootstrap', target, str(plist)], check=True)
    print('Installed durable source hook and hourly local watchdog.')


if __name__ == '__main__':
    main()
