#!/usr/bin/env python3
"""Durable private source outbox; publish free, live resources without re-downloading assets."""
import argparse
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import runpy
import shutil
import subprocess
import sys
import tempfile
import time

TOOLS = Path(__file__).resolve().parent
REPO_URL = 'https://github.com/earlyaidopters/gumroad-resources.git'
DEFAULT_STATE = Path.home() / '.local/state/gumroad-mirror'


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with tempfile.NamedTemporaryFile('w', dir=path.parent, delete=False) as f:
        json.dump(value, f, indent=2)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
        name = f.name
    os.chmod(name, 0o600)
    os.replace(name, path)
    descriptor = os.open(str(path.parent), os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def enqueue(root, product_id, files, expected_file_ids):
    if not product_id or not files:
        raise ValueError('A product ID and at least one source file are required')
    if len(expected_file_ids) != len(files) or len(set(expected_file_ids)) != len(files):
        raise ValueError('One distinct uploaded attachment identity is required per source file')
    records = []
    for path in files:
        path = Path(path).resolve(strict=True)
        if not path.is_file():
            raise ValueError('Source must be a regular file')
        records.append({'name': path.name, 'bytes': path.stat().st_size, 'sha256': digest(path), 'path': path})
    if len({r['name'] for r in records}) != len(records):
        raise ValueError('Source filenames must be unique')
    identity = [{'name': r['name'], 'bytes': r['bytes'], 'sha256': r['sha256']} for r in records]
    fingerprint = hashlib.sha256(json.dumps({"files": identity, "uploaded_file_ids": sorted(expected_file_ids)}, sort_keys=True).encode()).hexdigest()
    item = root / 'outbox' / hashlib.sha256(product_id.encode()).hexdigest()[:24]
    manifest_path = item / 'manifest.json'
    if manifest_path.exists():
        old = json.loads(manifest_path.read_text())
        if old['fingerprint'] == fingerprint and old['product_id'] == product_id:
            return old
    target = item / fingerprint
    target.mkdir(parents=True, exist_ok=True, mode=0o700)
    for i, record in enumerate(records):
        dest = target / str(i)
        temp = target / (str(i) + '.part')
        shutil.copyfile(record.pop('path'), temp)
        os.chmod(temp, 0o600)
        with temp.open('rb') as backup:
            os.fsync(backup.fileno())
        if digest(temp) != record['sha256']:
            temp.unlink()
            raise ValueError('Source changed during backup')
        os.replace(temp, dest)
        record['stored'] = str(dest.relative_to(item))
    manifest = {'schema_version': 1, 'product_id': product_id, 'fingerprint': fingerprint,
                'enqueued_at': datetime.now(timezone.utc).isoformat(), 'files': records,
                'expected_file_ids': sorted(expected_file_ids)}
    atomic_json(manifest_path, manifest)
    return manifest


def validate_sources(item, manifest):
    result = {}
    for record in manifest['files']:
        source = (item / record['stored']).resolve()
        if not source.is_relative_to(item.resolve()) or source.is_symlink():
            raise ValueError('Invalid private source path')
        if not source.is_file() or source.stat().st_size != record['bytes'] or digest(source) != record['sha256']:
            raise ValueError('Private source backup failed checksum verification')
        result[record['name']] = source
    return result


def cmd(args, cwd=None, binary=False):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=not binary, timeout=180)
    if result.returncode:
        # Do not leak signed URLs or credentials from subprocess output.
        raise RuntimeError(f'{Path(args[0]).name} {args[1] if len(args)>1 else ""} failed (exit {result.returncode})')
    return result.stdout


def prepare_checkout(root):
    checkout = root / 'checkout'
    if not checkout.exists():
        root.mkdir(parents=True, exist_ok=True, mode=0o700)
        cmd(['git', 'clone', '--quiet', '--depth=1', REPO_URL, str(checkout)])
        (root / 'managed-checkout').write_text(REPO_URL)
    if not (root / 'managed-checkout').is_file() or (root / 'managed-checkout').read_text() != REPO_URL:
        raise ValueError('Refusing to reset an unmanaged checkout')
    if cmd(['git', 'remote', 'get-url', 'origin'], checkout).strip() != REPO_URL:
        raise ValueError('Private checkout has an unexpected remote')
    cmd(['git', 'fetch', '--quiet', 'origin', 'main'], checkout)
    cmd(['git', 'reset', '--hard', 'origin/main'], checkout)
    cmd(['git', 'clean', '-fd'], checkout)
    return checkout


def source_mapping(product, sources):
    mapping = {}
    for file in product['files']:
        name = (file['file_name'] + '.' + file.get('extension', '').lower()).rstrip('.')
        matches = [p for n, p in sources.items()
                   if str(Path(n).with_suffix(Path(n).suffix.lower())) == name
                   and p.stat().st_size == file['file_size']]
        if len(matches) != 1:
            raise ValueError(f'Local package does not match published attachment: {name}')
        mapping[file['id']] = matches[0]
    if len(mapping) != len(sources):
        raise ValueError('Local package and published attachment counts differ')
    return mapping


def import_source(checkout, manifest, sources, pull, token):
    product_id = manifest['product_id']
    raw = pull['api_get']('/v2/products/' + pull['urllib'].parse.quote(product_id, safe=''), token)['product']
    if raw.get('published') is not True:
        return {'status': 'waiting-for-publication'}
    if raw.get('price') != 0:
        return {'status': 'excluded-paid-product'}
    if sorted(f['id'] for f in raw.get('files', [])) != manifest.get('expected_file_ids'):
        raise ValueError('Published attachment identities changed after the package was queued')
    old_manifest = json.loads((checkout / 'manifest.json').read_text())
    index = []
    slug = None
    for entry in old_manifest['products']:
        meta = json.loads((checkout / 'resources' / entry['slug'] / 'meta.json').read_text())
        # Git does not retain empty directories for content-only resources.
        (checkout / 'resources' / entry['slug'] / 'files').mkdir(exist_ok=True)
        row = {'name': meta['name'], 'permalink': meta['permalink'], 'status': meta['status'],
               'url': meta.get('url'), '_archived': meta.get('archived', False),
               'id': entry.get('numeric_id', 0)}
        if meta['external_id'] == product_id:
            slug = entry['slug']
            row['_api_id'] = product_id
        index.append(row)
    url = raw.get('short_url') or raw.get('url')
    permalink = (next(r['permalink'] for r in index if r.get('_api_id') == product_id)
                 if slug else url.split('/l/')[-1].split('?')[0])
    row = {'name': raw['name'], 'permalink': permalink, '_api_id': product_id,
           'status': 'published', 'url': url, 'price_formatted': raw.get('formatted_price')}
    if slug:
        row['_slug'] = slug
    # Reuse the validated seller payload; all attachment bytes come from the outbox.
    original_get = pull['api_payload'].__globals__['api_get']
    pull['api_payload'].__globals__['api_get'] = lambda *args: {'product': raw}
    try:
        _, normalized, _ = pull['api_payload'](row, token)
        mapping = source_mapping(normalized, sources)
        if not slug:
            slug = pull['slugify'](raw['name'])
            if (checkout / 'resources' / slug).exists():
                slug += '-' + hashlib.sha256(product_id.encode()).hexdigest()[:8]
            row['_slug'] = slug
        pull['pull_product'](row, token, str(checkout / 'resources'), skip_existing=False,
                             delay=0, max_file_mb=95, source_files=mapping)
    finally:
        pull['api_payload'].__globals__['api_get'] = original_get
    if any(r['permalink'] == permalink for r in index):
        index = [row if r['permalink'] == permalink else r for r in index]
    else:
        index.insert(0, row)
    for i, r in enumerate(index):
        r['_source_order'] = i
    old_readme = (checkout / 'README.md').read_text()
    start, end = '<!-- sync-status:start -->', '<!-- sync-status:end -->'
    block = (old_readme[old_readme.index(start):old_readme.index(end) + len(end)]
             if start in old_readme and end in old_readme else '')
    with tempfile.NamedTemporaryFile('w', suffix='.json') as f:
        json.dump(index, f); f.flush()
        cmd([sys.executable, str(TOOLS / 'build_repo.py'), '--repo', str(checkout), '--index', f.name])
    sys.path.insert(0, str(TOOLS))
    import verify_sync
    results = []
    for r in index:
        if r['status'] != 'published' or r.get('_archived'):
            continue
        entry = next(e for e in json.loads((checkout / 'manifest.json').read_text())['products']
                     if e['permalink'] == r['permalink'])
        meta = json.loads((checkout / 'resources' / entry['slug'] / 'meta.json').read_text())
        results.append({'permalink': r['permalink'], 'slug': entry['slug'], 'ok': True, 'files': meta['files']})
    verify_sync.verify(checkout, index, {'results': results}, built=True)
    text = (checkout / 'README.md').read_text()
    if block:
        # A one-product publication must not advance the full-catalog verification time.
        text = text.replace('## 🆕 Latest 10 drops', block + '\n\n## 🆕 Latest 10 drops', 1)
        (checkout / 'README.md').write_text(text)
    meta = json.loads((checkout / 'resources' / slug / 'meta.json').read_text())
    receipt = {'schema_version': 1, 'product_id': product_id, 'fingerprint': manifest['fingerprint'],
               'source_saved_at': manifest['enqueued_at'], 'source': 'private-original-package',
               'files': [{'file': f['file'], 'source_sha256': f.get('source_sha256'),
                          'mirrored_sha256': f.get('local_sha256'), 'status': f['status']}
                         for f in meta['files']]}
    (checkout / 'resources' / slug / 'source-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return {'status': 'ready', 'slug': slug, 'receipt': receipt}


def publish_one(root, item, manifest, pull, token):
    sources = validate_sources(item, manifest)
    for attempt in range(3):
        checkout = prepare_checkout(root)
        result = import_source(checkout, manifest, sources, pull, token)
        if result['status'] != 'ready':
            return result
        current = pull['api_get']('/v2/products/' + pull['urllib'].parse.quote(manifest['product_id'], safe=''), token)['product']
        if current.get('published') is not True or current.get('price') != 0:
            return {'status': 'waiting-for-free-publication'}
        if sorted(f['id'] for f in current.get('files', [])) != manifest['expected_file_ids']:
            raise ValueError('Published attachment identities changed before GitHub commit')
        cmd(['git', 'add', 'resources', 'README.md', 'manifest.json'], checkout)
        changed = subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=checkout).returncode
        if changed:
            cmd(['git', '-c', 'user.name=gumroad-source-mirror', '-c',
                 'user.email=gumroad-source-mirror@users.noreply.github.com', 'commit', '-m',
                 'mirror: publish verified original resource package'], checkout)
            try:
                cmd(['git', 'push', 'origin', 'HEAD:main'], checkout)
            except RuntimeError:
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
                continue
        cmd(['git', 'fetch', '--quiet', 'origin', 'main'], checkout)
        prefix = 'resources/' + result['slug'] + '/'
        remote = json.loads(cmd(['git', 'show', 'origin/main:' + prefix + 'source-receipt.json'], checkout))
        if remote['fingerprint'] != manifest['fingerprint']:
            raise ValueError('Remote source receipt did not verify')
        for file in remote['files']:
            if file['status'] == 'skipped-oversized':
                continue
            data = cmd(['git', 'show', 'origin/main:' + prefix + 'files/' + file['file']], checkout, binary=True)
            if hashlib.sha256(data).hexdigest() != file['mirrored_sha256']:
                raise ValueError('Remote source bytes did not verify')
        return {'status': 'published', 'commit': cmd(['git', 'rev-parse', 'origin/main'], checkout).strip(),
                'slug': result['slug'], 'fingerprint': manifest['fingerprint']}
    raise RuntimeError('Concurrent pushes prevented source publication after three attempts')


def drain(root, product_id=None):
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (root / 'worker.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return [{'status': 'worker-already-active'}]
        pending = list((root / 'outbox').glob('*/manifest.json'))
        if not pending:
            return []
        pull = runpy.run_path(str(TOOLS / 'gumroad-pull'))
        token = pull['load_token']()
        if not token:
            raise ValueError('Source publication needs the existing Gumroad API token to verify publication status')
        pull['verify_account'](token)
        outcomes = []
        for path in sorted(pending):
            manifest = json.loads(path.read_text())
            if product_id and manifest['product_id'] != product_id:
                continue
            receipt_path = path.parent / 'delivery.json'
            old = json.loads(receipt_path.read_text()) if receipt_path.exists() else {}
            if old.get('fingerprint') == manifest['fingerprint'] and old.get('status') == 'published':
                continue
            try:
                outcome = publish_one(root, path.parent, manifest, pull, token)
            except Exception as error:
                outcome = {'status': 'retry-pending', 'error': str(error), 'error_type': type(error).__name__}
            outcome.update({'product_id': manifest['product_id'], 'fingerprint': manifest['fingerprint'],
                            'checked_at': datetime.now(timezone.utc).isoformat()})
            atomic_json(receipt_path, outcome)
            outcomes.append(outcome)
        if any(o['status'] == 'published' for o in outcomes):
            try:
                cmd(['gh', 'workflow', 'run', 'sync.yml', '-R', 'earlyaidopters/gumroad-resources', '--ref', 'main'])
            except Exception:
                pass  # The independent hourly watchdog also triggers full reconciliation.
        return outcomes


def main():
    os.umask(0o077)
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--state', type=Path, default=DEFAULT_STATE)
    sub = ap.add_subparsers(dest='command', required=True)
    en = sub.add_parser('enqueue')
    en.add_argument('--product-id', required=True)
    en.add_argument('--file', action='append', type=Path, required=True)
    en.add_argument('--expected-file-id', action='append')
    dr = sub.add_parser('drain')
    dr.add_argument('--product-id')
    sub.add_parser('status')
    a = ap.parse_args()
    if a.command == 'enqueue':
        ids = a.expected_file_id
        if ids is None:
            pull = runpy.run_path(str(TOOLS / 'gumroad-pull'))
            token = pull['load_token']()
            pull['verify_account'](token)
            product = pull['api_get']('/v2/products/' + pull['urllib'].parse.quote(a.product_id, safe=''), token)['product']
            ids = [f['id'] for f in product['files']]
        m = enqueue(a.state, a.product_id, a.file, ids)
        print(json.dumps({'status': 'queued', 'product_id': m['product_id'], 'fingerprint': m['fingerprint']}))
    elif a.command == 'drain':
        results = drain(a.state, a.product_id)
        print(json.dumps(results))
        return 1 if any(r['status'] == 'retry-pending' for r in results) else 0
    else:
        for path in sorted((a.state / 'outbox').glob('*/manifest.json')):
            m = json.loads(path.read_text())
            receipt = path.parent / 'delivery.json'
            print(json.dumps({'product_id': m['product_id'], 'fingerprint': m['fingerprint'],
                              'delivery': json.loads(receipt.read_text()) if receipt.exists() else {'status': 'queued'}}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
