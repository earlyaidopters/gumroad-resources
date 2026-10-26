#!/usr/bin/env python3
"""Read-only prerequisite check. Never reads keys or private configuration."""
import json,platform,shutil,subprocess,sys

def version(cmd):
    if not shutil.which(cmd[0]):return 'not installed'
    try:return subprocess.run(cmd,capture_output=True,text=True,timeout=10).stdout.strip().splitlines()[0]
    except Exception:return 'installed; version check failed'
if __name__=='__main__':
 print(json.dumps({'python':platform.python_version(),'os':platform.system(),'architecture':platform.machine(),'python_supported':sys.version_info>=(3,10),'node':version(['node','--version']),'dsh':version(['dsh','--version']),'nuclei':version(['nuclei','-version']),'lms_available':bool(shutil.which('lms')),'note':'Read the chosen route guide before installing anything.'},indent=2))
