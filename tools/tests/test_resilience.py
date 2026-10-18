import copy
from datetime import datetime, timedelta, timezone
import hashlib
import html
import json
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
import watchdog
import source_mirror
import publish_hook


class PublicMonitorTests(unittest.TestCase):
    def page(self, count=2):
        data = {'component': 'Users/Show', 'props': {'sections': [{'search_results': {
            'total': count, 'products': [{'id': 'p1', 'name': 'Guide', 'permalink': 'guide'}]}}]}}
        return '<div data-page="' + html.escape(json.dumps(data), quote=True) + '"></div>'

    def test_signed_out_listing_and_count_are_parsed(self):
        calls = []
        def fetch(url):
            calls.append(url)
            return self.page()
        result = watchdog.public_catalog(fetch)
        self.assertEqual(result['public_total'], 2)
        self.assertEqual(result['visible_products'][0]['id'], 'p1')
        self.assertEqual(calls, ['https://markkashef.gumroad.com?sort=newest'])

    def test_unavailable_or_malformed_page_never_looks_healthy(self):
        for page in ['<html>blocked</html>', self.page(0)]:
            with self.assertRaises(ValueError):
                watchdog.public_catalog(lambda _: page)

    def test_stale_missing_product_and_corrupt_file_are_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            folder = root / 'resources/guide'
            (folder / 'files').mkdir(parents=True)
            (folder / 'README.md').write_text('guide')
            (folder / 'files/guide.txt').write_bytes(b'bad')
            (folder / 'meta.json').write_text(json.dumps({'external_id': 'p1', 'files': [
                {'file': 'guide.txt', 'status': 'cached', 'local_sha256': hashlib.sha256(b'good').hexdigest()}]}))
            (root / 'manifest.json').write_text(json.dumps({'products': [
                {'slug': 'guide', 'status': 'published', 'archived': False}]}))
            at = datetime.now(timezone.utc)
            (root / 'sync-status.json').write_text(json.dumps({
                'verified_at': (at - timedelta(hours=13)).isoformat(),
                'manifest_sha256': hashlib.sha256((root / 'manifest.json').read_bytes()).hexdigest()}))
            observation = {'public_total': 2, 'visible_products': [{'id': 'missing', 'name': 'New'}]}
            result = watchdog.inspect(root, observation, at)
            self.assertFalse(result['healthy'])
            self.assertEqual(len(result['faults']), 4)

    def test_active_sync_is_not_duplicated(self):
        calls = []
        def call(*args):
            calls.append(args)
            if args[0] == 'issue' and args[1] == 'list': return '[]'
            if args[0] == 'run' and args[1] == 'list':
                return json.dumps([{'databaseId': 1, 'status': 'in_progress',
                                    'createdAt': datetime.now(timezone.utc).isoformat()}])
            return ''
        report = {'healthy': False, 'faults': ['stale']}
        watchdog.repair(report, call)
        self.assertFalse(any(c[:2] == ('workflow', 'run') for c in calls))

    def test_no_active_sync_dispatches_recovery(self):
        calls = []
        def call(*args):
            calls.append(args)
            return '[]' if args[1] == 'list' else ''
        report = {'healthy': False, 'faults': ['stale']}
        watchdog.repair(report, call)
        self.assertTrue(any(c[:2] == ('workflow', 'run') for c in calls))


class SourceOutboxTests(unittest.TestCase):
    def test_source_survives_original_deletion_and_detects_corruption(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            file = root / 'guide.txt'
            file.write_text('original')
            state = root / 'state'
            manifest = source_mirror.enqueue(state, 'product', [file], ['file1'])
            item = next((state / 'outbox').iterdir())
            file.unlink()
            sources = source_mirror.validate_sources(item, manifest)
            self.assertEqual(sources['guide.txt'].read_text(), 'original')
            sources['guide.txt'].write_text('tampered')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                source_mirror.validate_sources(item, manifest)

    def test_repeated_enqueue_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            file = root / 'guide.txt'
            file.write_text('original')
            first = source_mirror.enqueue(root / 'state', 'product', [file], ['f1'])
            second = source_mirror.enqueue(root / 'state', 'product', [file], ['f1'])
            self.assertEqual(first, second)

    def test_duplicate_names_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for dirname in ['a', 'b']:
                (root / dirname).mkdir()
                (root / dirname / 'same.txt').write_text(dirname)
            with self.assertRaisesRegex(ValueError, 'unique'):
                source_mirror.enqueue(root / 'state', 'p', [root/'a/same.txt', root/'b/same.txt'], ['a','b'])

    def test_draft_and_paid_products_never_publish(self):
        for raw, expected in [({'published': False}, 'waiting-for-publication'),
                              ({'published': True, 'price': 43}, 'excluded-paid-product')]:
            pull = {'api_get': lambda *a: {'product': raw}, 'urllib': __import__('urllib')}
            result = source_mirror.import_source(Path('/unused'), {'product_id': 'p'}, {}, pull, 'token')
            self.assertEqual(result['status'], expected)

    def test_changed_upstream_file_ids_cannot_be_overwritten(self):
        pull = {'api_get': lambda *a: {'product': {'published': True, 'price': 0, 'files': [{'id': 'new'}]}},
                'urllib': __import__('urllib')}
        with self.assertRaisesRegex(ValueError, 'identities changed'):
            source_mirror.import_source(Path('/unused'), {'product_id': 'p', 'expected_file_ids': ['old']}, {}, pull, 'token')

    def test_local_import_never_downloads_assets(self):
        ns = runpy.run_path(str(TOOLS / 'gumroad-pull'))
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'original.txt'; source.write_bytes(b'abcd')
            product = {'name': 'Guide', 'is_published': True, 'files': [
                {'id': 'f', 'file_name': 'guide', 'extension': 'txt', 'file_size': 4, 'url': 'https://files.invalid/a'}]}
            ns['pull_product'].__globals__['get_edit_payload'] = lambda *a: ('p', product, 'p')
            ns['pull_product'].__globals__['http_get'] = lambda *a, **k: self.fail('Network download attempted')
            _, meta = ns['pull_product']({'permalink': 'p','status': 'published'}, '', str(root/'out'),
                                         delay=0, source_files={'f': source})
            self.assertEqual(meta['files'][0]['source_sha256'], hashlib.sha256(b'abcd').hexdigest())


class PublisherHookTests(unittest.TestCase):
    def test_failed_backup_blocks_before_publication(self):
        with patch.object(publish_hook.subprocess, 'run', side_effect=OSError('offline')):
            with self.assertRaisesRegex(RuntimeError, 'remains a draft'):
                publish_hook.queue_originals('id', ['file'], [{'id':'f'}], 0)

    def test_post_publication_failure_stays_queued_without_recreating(self):
        with patch.object(publish_hook.subprocess, 'run', side_effect=OSError('offline')):
            result = publish_hook.finish_mirror({'status':'queued'}, 'p', True)
            self.assertEqual(result['status'], 'retry-pending')

    def test_paid_product_is_not_enqueued(self):
        with patch.object(publish_hook.subprocess, 'run') as run:
            self.assertEqual(publish_hook.queue_originals('id', ['file'], [], 10)['status'], 'not-a-free-resource')
            run.assert_not_called()

    def test_wrong_seller_is_rejected(self):
        ns = runpy.run_path(str(TOOLS / 'gumroad-pull'))
        ns['verify_account'].__globals__['api_get'] = lambda *a: {'user': {'url': 'https://wrong.gumroad.com'}}
        with self.assertRaisesRegex(ValueError, 'unexpected storefront'):
            ns['verify_account']('token')
