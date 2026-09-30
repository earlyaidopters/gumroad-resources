#!/usr/bin/env python3
"""Fail closed on missing products, bad downloads, missing files or stale builds."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import os
from zoneinfo import ZoneInfo


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def published(index):
    if not isinstance(index, list) or not index:
        raise ValueError('Empty or malformed Gumroad index; refusing to replace the catalogue')
    if any(not r.get('permalink') or r.get('status') not in ('published', 'unpublished') for r in index):
        raise ValueError('Malformed product identity or publication status')
    ids = [r['permalink'] for r in index]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate product identity in Gumroad index')
    live = {r['permalink']: r for r in index if r['status'] == 'published' and not r.get('_archived')}
    if not live:
        raise ValueError('No published products; refusing an unexpected empty catalogue')
    return live


def verify(repo, index, pull, built=False):
    live = published(index)
    results = pull.get('results', [])
    pulled = [r.get('permalink') for r in results]
    if len(set(pulled)) != len(pulled) or set(pulled) != set(live):
        raise ValueError(f'Pull coverage differs from published products: missing={sorted(set(live)-set(pulled))}')
    counts = Counter()
    folders = {}
    for r in results:
        if r.get('ok') is not True:
            raise ValueError(f'Product download failed: {r.get("permalink")}')
        slug = r.get('slug', '')
        if not slug or Path(slug).name != slug:
            raise ValueError('Invalid resource folder')
        folder = repo / 'resources' / slug
        meta = json.loads((folder / 'meta.json').read_text())
        if meta.get('name') != live[r['permalink']]['name']:
            raise ValueError(f'Product name changed during sync or metadata is stale: {slug}')
        if meta.get('permalink') != r['permalink'] or meta.get('status') != 'published':
            raise ValueError(f'Wrong or stale product metadata: {slug}')
        if meta.get('files') != r.get('files') and not built:
            raise ValueError(f'Pull report differs from product files: {slug}')
        if built:
            identity = lambda fs: [(f['file'], f.get('source_revision'), f.get('source_sha256')) for f in fs]
            if identity(meta.get('files', [])) != identity(r.get('files', [])):
                raise ValueError(f'Build changed source file identity: {slug}')
        names = [f['file'] for f in meta.get('files', [])]
        if len(names) != len(set(names)):
            raise ValueError(f'Colliding attachment names: {slug}')
        expected_files = set()
        for f in meta.get('files', []):
            name, status = f['file'], f.get('status')
            if Path(name).name != name:
                raise ValueError('Invalid file path')
            counts[status] += 1
            if status == 'skipped-oversized':
                if (f.get('bytes') or 0) <= 95 * 1024 * 1024:
                    raise ValueError(f'Invalid oversized exception: {slug}/{name}')
                if built and name not in (folder / 'README.md').read_text():
                    raise ValueError(f'Oversized attachment has no download guidance: {slug}/{name}')
                continue
            if status not in ('downloaded', 'cached'):
                raise ValueError(f'Bad attachment status: {slug}/{name}: {status}')
            path = folder / 'files' / name
            if not path.is_file() or not f.get('local_sha256') or digest(path) != f['local_sha256']:
                raise ValueError(f'Missing or corrupt attachment: {slug}/{name}')
            if not built and status == 'downloaded' and f.get('expected_bytes') is not None and path.stat().st_size != f['expected_bytes']:
                raise ValueError(f'Incorrect attachment size: {slug}/{name}')
            if built and name.lower().endswith('.zip'):
                if f.get('unpacked_sha256') != digest(path) or not (folder / 'unpacked' / name[:-4]).is_dir():
                    raise ValueError(f'Stale unpacked archive: {slug}/{name}')
            expected_files.add(name)
        actual_files = {p.name for p in (folder / 'files').iterdir() if p.is_file()}
        if actual_files != expected_files:
            raise ValueError(f'Unexpected or missing attachments: {slug}')
        if meta.get('has_rich_content') and not (folder / 'content.md').is_file():
            raise ValueError(f'Missing resource content: {slug}')
        if built and not (folder / 'README.md').is_file():
            raise ValueError(f'Missing resource README: {slug}')
        folders[r['permalink']] = slug
    if built:
        manifest = json.loads((repo / 'manifest.json').read_text())
        if manifest.get('count') != len(manifest['products']):
            raise ValueError('Manifest count does not match entries')
        entries = [p for p in manifest['products'] if not p.get('archived')]
        ids = [p['permalink'] for p in entries]
        if len(ids) != len(set(ids)) or set(ids) != set(live):
            raise ValueError('Finished catalogue differs from published Gumroad products')
        root_readme = (repo / 'README.md').read_text()
        for entry in entries:
            slug = folders[entry['permalink']]
            if entry['slug'] != slug or f'(resources/{slug}/)' not in root_readme:
                raise ValueError(f'Catalogue link missing or incorrect: {slug}')
            meta = json.loads((repo / 'resources' / slug / 'meta.json').read_text())
            expected = [f['file'] for f in meta['files'] if f['status'] != 'skipped-oversized']
            if entry['files'] != expected:
                raise ValueError(f'Catalogue file list differs: {slug}')
    return {'published_products': len(live), 'mirrored_products': len(folders),
            'attachments_verified': counts['downloaded'] + counts['cached'],
            'oversized_attachments_on_gumroad': counts['skipped-oversized']}


def write_status(repo, counts, index):
    now = datetime.now(timezone.utc)
    run_url = (f'https://github.com/{os.environ["GITHUB_REPOSITORY"]}/actions/runs/{os.environ["GITHUB_RUN_ID"]}'
               if os.environ.get('GITHUB_RUN_ID') else None)
    status = {'schema_version': 1, 'verified_at': now.isoformat(),
              'source_index_observed_at': os.environ.get('SYNC_INDEX_OBSERVED_AT'),
              'run_url': run_url, **counts,
              'manifest_sha256': digest(repo / 'manifest.json')}
    (repo / 'sync-status.json').write_text(json.dumps(status, indent=2) + '\n')
    stamp = now.astimezone(ZoneInfo('America/Toronto')).strftime('%B %d, %Y at %I:%M %p %Z')
    label = f'**Last verified sync: {stamp}**'
    if run_url:
        label = f'[{label}]({run_url})'
    summary = (f'{label} · {counts["mirrored_products"]}/{counts["published_products"]} published resources accounted for; '
               f'{counts["attachments_verified"]} mirrored attachments verified. '
               f'Oversized attachments available on Gumroad: {counts["oversized_attachments_on_gumroad"]}. '
               '[Sync details](sync-status.json).\n\n')
    p = repo / 'README.md'
    text = p.read_text()
    start, end = '<!-- sync-status:start -->', '<!-- sync-status:end -->'
    if start in text:
        text = text[:text.index(start)] + text[text.index(end) + len(end):].lstrip('\n')
    marker = '## 🆕 Latest 10 drops'
    if marker not in text:
        raise ValueError('Missing latest-resources section')
    p.write_text(text.replace(marker, f'{start}\n{summary}{end}\n\n{marker}', 1))
    print(json.dumps(status))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', type=Path, default=Path('.'))
    ap.add_argument('--index', type=Path, required=True)
    ap.add_argument('--pull', type=Path)
    ap.add_argument('--built', action='store_true')
    ap.add_argument('--write-status', action='store_true')
    a = ap.parse_args()
    index = json.loads(a.index.read_text())
    if a.pull is None:
        print(json.dumps({'published_products': len(published(index))}))
        return
    counts = verify(a.repo, index, json.loads(a.pull.read_text()), built=a.built)
    if a.write_status:
        if not a.built:
            raise ValueError('Status requires finished-build verification')
        write_status(a.repo, counts, index)
    else:
        print(json.dumps(counts))


if __name__ == '__main__':
    main()
