#!/usr/bin/env python3
"""Credential-free Gumroad observation and independent GitHub mirror watchdog."""
import argparse
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import sys
import urllib.request

REPOSITORY = 'earlyaidopters/gumroad-resources'
STOREFRONT = 'https://markkashef.gumroad.com'
TITLE = 'Gumroad mirror freshness or public coverage failure'
REFRESH_TARGET_HOURS = 10


def now():
    return datetime.now(timezone.utc)


def public_catalog(fetch=None):
    if fetch is None:
        def fetch(url):
            # Deliberately no seller token, Cookie header, or cookie jar.
            req = urllib.request.Request(url, headers={'User-Agent': 'GumroadMirrorMonitor/1.0'})
            with urllib.request.urlopen(req, timeout=45) as response:
                return response.read().decode()
    source = fetch(STOREFRONT + '?sort=newest')
    match = re.search(r'data-page="([^"]+)"', source)
    if not match:
        raise ValueError('Public storefront did not return its product data')
    page = json.loads(html.unescape(match[1]))
    if page.get('component') != 'Users/Show':
        raise ValueError('Unexpected public storefront page')
    sections = [s['search_results'] for s in page.get('props', {}).get('sections', [])
                if isinstance(s.get('search_results'), dict)]
    if not sections:
        raise ValueError('Public storefront product sections missing')
    products = {}
    for section in sections:
        if not isinstance(section.get('products'), list):
            raise ValueError('Public storefront product list malformed')
        for product in section['products']:
            if not product.get('id') or not product.get('name'):
                raise ValueError('Public storefront product identity missing')
            products[product['id']] = {k: product.get(k) for k in ('id', 'name', 'permalink')}
    # Multiple profile sections can overlap. Only one section gives an unambiguous total.
    total = sections[0].get('total') if len(sections) == 1 else None
    if total is not None and (not isinstance(total, int) or total < len(products)):
        raise ValueError('Public storefront total malformed')
    if not products:
        raise ValueError('Public storefront unexpectedly empty')
    return {'observed_at': now().isoformat(), 'public_total': total,
            'visible_products': list(products.values()),
            'coverage': 'newest storefront listings; count is all storefront products'}


def inspect(repo, observation, at=None):
    at = at or now()
    status = json.loads((repo / 'sync-status.json').read_text())
    manifest_path = repo / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    products = [p for p in manifest['products'] if p.get('status') == 'published' and not p.get('archived')]
    faults, ids = [], set()
    stamp = datetime.fromisoformat(status['verified_at'])
    if stamp.tzinfo is None:
        raise ValueError('Verified sync timestamp lacks timezone')
    age = (at - stamp).total_seconds() / 3600
    if age > 12 or age < -0.1:
        faults.append(f'Last full verified sync is {age:.1f} hours old (limit: 12 hours)')
    if status.get('video_pairing_status') == 'failed':
        faults.append('Video pairing refresh failed; resources are current but video links need retry')
    if hashlib.sha256(manifest_path.read_bytes()).hexdigest() != status.get('manifest_sha256'):
        faults.append('Catalog changed since the last full source verification')
    for product in products:
        folder = repo / 'resources' / product['slug']
        meta = json.loads((folder / 'meta.json').read_text())
        ids.add(meta['external_id'])
        if not (folder / 'README.md').is_file():
            faults.append(f'Missing resource page: {product["slug"]}')
        for file in meta.get('files', []):
            if file.get('status') == 'skipped-oversized':
                continue
            path = folder / 'files' / file['file']
            if (not path.is_file() or not file.get('local_sha256')
                    or hashlib.sha256(path.read_bytes()).hexdigest() != file['local_sha256']):
                faults.append(f'Missing or corrupt file: {product["slug"]}/{file["file"]}')
    missing = [p['name'] for p in observation['visible_products'] if p['id'] not in ids]
    if missing:
        faults.append('Public resources missing from GitHub: ' + ', '.join(missing))
    total = observation.get('public_total')
    if total is not None and total != len(products):
        faults.append(f'Public storefront has {total} products; GitHub has {len(products)}')
    return {'checked_at': at.isoformat(), 'healthy': not faults, 'faults': faults,
            'last_full_sync_age_hours': round(age, 2), 'last_verified_at': status['verified_at'],
            'mirrored_products': len(products),
            'public_observation': observation}


def gh(*args):
    return subprocess.check_output(['gh', *args], text=True)


def repair(report, call=gh):
    runs = json.loads(call('run', 'list', '-R', REPOSITORY, '--workflow', 'sync.yml',
                           '--limit', '10', '--json', 'databaseId,status,conclusion,createdAt'))
    active = [r for r in runs if r['status'] in ('queued', 'in_progress', 'waiting', 'pending', 'requested')]
    if runs and runs[0].get('conclusion') in ('failure', 'timed_out'):
        last_verified = report.get('last_verified_at')
        newer_failure = not last_verified or (
            datetime.fromisoformat(runs[0]['createdAt'].replace('Z', '+00:00')) >
            datetime.fromisoformat(last_verified))
        if newer_failure:
            report['faults'].append('Latest full sync failed after the last verified catalog')
            report['healthy'] = False
    if any((now() - datetime.fromisoformat(r['createdAt'].replace('Z', '+00:00'))).total_seconds() > 50 * 60 for r in active):
        report['faults'].append('A full sync has been queued or running for over 50 minutes')
        report['healthy'] = False
    issues = json.loads(call('issue', 'list', '-R', REPOSITORY, '--state', 'open',
                             '--limit', '100', '--json', 'number,title,body'))
    incident = next((i for i in issues if i['title'] == TITLE), None)
    if report['healthy']:
        if incident:
            call('issue', 'close', str(incident['number']), '-R', REPOSITORY,
                 '--comment', 'Public storefront coverage, committed file hashes, and full-sync freshness have recovered.')
        # Leave time for hourly polling, queue delays, and the full reconciliation.
        # A preventive refresh is maintenance, not a failure notification.
        if report.get('last_full_sync_age_hours', 0) >= REFRESH_TARGET_HOURS:
            if active:
                report['recovery'] = 'sync already active'
            else:
                call('workflow', 'run', 'sync.yml', '-R', REPOSITORY, '--ref', 'main')
                report['recovery'] = 'preventive sync dispatched before the 12-hour deadline'
        return
    # The body is stable across unchanged failures; do not emit repeated comments.
    body = ('The independent signed-out monitor found:\n\n' +
            '\n'.join('- ' + f for f in report['faults']) +
            '\n\nThe previous catalog remains available. A recovery sync is requested when no sync is active. '
            'This incident closes only after public coverage, file integrity and freshness pass.')
    if not incident:
        call('issue', 'create', '-R', REPOSITORY, '--title', TITLE, '--body', body)
    elif incident.get('body') != body:
        call('issue', 'edit', str(incident['number']), '-R', REPOSITORY, '--body', body)
    fresh_active = False
    for run in active:
        age = (now() - datetime.fromisoformat(run['createdAt'].replace('Z', '+00:00'))).total_seconds()
        if age > 50 * 60:
            call('run', 'cancel', str(run['databaseId']), '-R', REPOSITORY)
        else:
            fresh_active = True
    if fresh_active:
        report['recovery'] = 'sync already active'
        return
    call('workflow', 'run', 'sync.yml', '-R', REPOSITORY, '--ref', 'main')
    report['recovery'] = 'sync dispatched'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument('--repair', action='store_true')
    ap.add_argument('--output', type=Path)
    a = ap.parse_args()
    try:
        report = inspect(a.repo, public_catalog())
    except Exception as error:
        # Never report healthy when the independent source is unavailable.
        report = {'checked_at': now().isoformat(), 'healthy': False,
                  'faults': [f'Independent verification unavailable: {type(error).__name__}: {error}']}
    if a.repair:
        try:
            repair(report)
        except Exception as error:
            report["healthy"] = False
            report["faults"].append(f"GitHub recovery request failed: {type(error).__name__}: {error}")
    if a.output:
        a.output.parent.mkdir(parents=True, exist_ok=True)
        a.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    return 0 if report['healthy'] else 1


if __name__ == '__main__':
    sys.exit(main())
