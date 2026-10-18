#!/usr/bin/env python3
"""One actionable issue per incident; close only after a verified push succeeds."""
import argparse
import json
import os
from pathlib import Path
import subprocess

AUTH_TITLE = 'Gumroad API authentication failed — sync paused'
FAIL_TITLE = 'Gumroad resource sync failed — updates paused'
VIDEO_TITLE = 'YouTube pairing refresh failed — resource files are current'


def gh(*args):
    return subprocess.check_output(['gh', *args], text=True)


def report(outcome, auth_failed=False, video_failed=False):
    issues = json.loads(gh('issue', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title'))
    existing = {i['title']: str(i['number']) for i in issues}
    if outcome == 'success':
        for title in (AUTH_TITLE, FAIL_TITLE, "Gumroad session cookie expired — sync paused"):
            if title in existing:
                gh('issue', 'close', existing[title], '--comment',
                   'A complete download, catalogue verification, and GitHub push have succeeded. See sync-status.json for the verified run.')
        if not video_failed and VIDEO_TITLE in existing:
            gh('issue', 'close', existing[VIDEO_TITLE], '--comment', 'YouTube pairing refresh recovered.')
        return
    title = VIDEO_TITLE if video_failed else AUTH_TITLE if auth_failed else FAIL_TITLE
    if title in existing:
        return  # No repeated comments or duplicate issues for an unchanged failure.
    run = f'https://github.com/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{os.environ["GITHUB_RUN_ID"]}'
    reason = ('The Gumroad API authentication check failed. '
              'Check the GUMROAD_ACCESS_TOKEN repository secret; instructions are in tools/README.md.' if auth_failed else
              'The download, verification, build, or push failed. Inspect the linked run before retrying.')
    if video_failed:
        reason = 'Resource files and catalog were published successfully, but refreshing YouTube links failed. The next sync retries pairing independently.'
    body = (f'{reason}\n\nRun: {run}\n\nThe previous verified catalogue remains available. '
            'The last successful check is recorded in sync-status.json. This issue closes automatically only after a verified sync is pushed.')
    gh('issue', 'create', '--title', title, '--body', body)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('outcome', choices=['success', 'failure'])
    a = ap.parse_args()
    report(a.outcome, Path('.sync-auth-failed').exists(),
           Path('.sync-video-failed').exists() and (a.outcome == 'success' or os.environ.get('RESOURCE_PUBLISHED') == 'true'))
