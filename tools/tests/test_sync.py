import contextlib
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
import verify_sync
import report_sync


def archive(**files):
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w') as z:
        for name, text in files.items():
            z.writestr(name, text)
    return out.getvalue()


class PullTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.ns = runpy.run_path(str(TOOLS / 'gumroad-pull'))
        self.pull = self.ns['pull_product']
        self.g = self.pull.__globals__
        self.row = {'permalink': 'p', 'name': 'Guide', 'status': 'published', 'id': 1}
        self.file = {'id': 'f1', 'url': 'https://example.test/original', 'file_name': 'guide', 'extension': 'TXT', 'file_size': 4}
        self.product = {'name': 'Guide', 'files': [self.file], 'rich_content': []}
        self.g['get_edit_payload'] = lambda *a: ('external-id', self.product, 'p')
        self.data, self.status = b'abcd', 200
        self.calls = 0
        def get(*args, **kwargs):
            self.calls += 1
            return self.status, self.data, {}
        self.g['http_get'] = get

    def run_pull(self, **kwargs):
        return self.pull(self.row, 'fixture-cookie', str(self.root), delay=0, **kwargs)

    def test_download_and_cache_use_hash(self):
        _, meta = self.run_pull()
        self.assertEqual(meta['files'][0]['source_sha256'], hashlib.sha256(b'abcd').hexdigest())
        _, meta = self.run_pull()
        self.assertEqual(meta['files'][0]['status'], 'cached')
        self.assertEqual(self.calls, 1)

    def test_same_size_replacement_downloads(self):
        self.run_pull()
        self.file['id'] = 'f2'
        self.data = b'wxyz'
        self.run_pull()
        self.assertEqual((self.root / 'guide/files/guide.txt').read_bytes(), b'wxyz')
        self.assertEqual(self.calls, 2)

    def test_same_id_new_storage_url_downloads(self):
        self.run_pull()
        self.file['url'] = 'https://example.test/replacement'
        self.data = b'wxyz'
        self.run_pull()
        self.assertEqual(self.calls, 2)

    def test_local_corruption_downloads_again(self):
        self.run_pull()
        (self.root / 'guide/files/guide.txt').write_bytes(b'xxxx')
        self.run_pull()
        self.assertEqual((self.root / 'guide/files/guide.txt').read_bytes(), b'abcd')

    def test_http_failure_preserves_existing_file(self):
        self.run_pull()
        self.file['id'] = 'f2'
        self.status, self.data = 503, b'error'
        with self.assertRaisesRegex(ValueError, 'HTTP 503'):
            self.run_pull()
        self.assertEqual((self.root / 'guide/files/guide.txt').read_bytes(), b'abcd')

    def test_size_mismatch_preserves_existing_file(self):
        self.run_pull()
        self.file['id'] = 'f2'
        self.data = b'bad'
        with self.assertRaisesRegex(ValueError, 'expected 4 bytes'):
            self.run_pull()
        self.assertEqual((self.root / 'guide/files/guide.txt').read_bytes(), b'abcd')

    def test_duplicate_names_preserve_both_files_and_links(self):
        self.product['files'].append({**self.file, 'id': 'f2'})
        self.product['rich_content'] = [{'description': {'type': 'doc', 'content': [
            {'type': 'fileEmbed', 'attrs': {'id': 'f1'}},
            {'type': 'fileEmbed', 'attrs': {'id': 'f2'}},
        ]}}]
        _, meta = self.run_pull()
        names = [f['file'] for f in meta['files']]
        self.assertEqual(len(set(names)), 2)
        self.assertEqual(len(list((self.root / 'guide/files').iterdir())), 2)
        content = (self.root / 'guide/content.md').read_text()
        for name in names:
            self.assertIn(name, content)

    def test_removed_attachment_and_content_disappear(self):
        self.run_pull()
        (self.root / 'guide/content.md').write_text('old content')
        self.product['files'] = []
        self.run_pull()
        self.assertFalse((self.root / 'guide/files/guide.txt').exists())
        self.assertFalse((self.root / 'guide/content.md').exists())

    def test_retry_removes_orphan_from_a_previous_partial_product(self):
        self.run_pull()
        orphan = self.root / 'guide/files/orphan.txt'
        orphan.write_text('left by a failed attempt')
        self.run_pull()
        self.assertFalse(orphan.exists())

    def test_oversized_is_explicit_and_not_downloaded(self):
        self.file['file_size'] = 96 * 1024 * 1024
        _, meta = self.run_pull(max_file_mb=95)
        self.assertEqual(meta['files'][0]['status'], 'skipped-oversized')
        self.assertEqual(self.calls, 0)

    def test_missing_payload_is_failure(self):
        del self.product['files']
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            self.run_pull()

    def test_newly_unpublished_product_fails(self):
        self.product['is_published'] = False
        with self.assertRaisesRegex(ValueError, 'unpublished during sync'):
            self.run_pull()

    def test_malformed_listing_fails(self):
        listing = self.ns['list_products']
        listing.__globals__['inertia_page'] = lambda *a: {'component': 'Products/Index'}
        listing.__globals__['inertia_partial'] = lambda *a: {'props': {}}
        with self.assertRaisesRegex(ValueError, 'Missing product listing'):
            listing('fixture-cookie', delay=0)

    def test_product_rename_preserves_folder_link(self):
        self.run_pull()
        self.row['name'] = 'Renamed Guide'
        self.product['name'] = 'Renamed Guide'
        main = self.ns['main']
        main.__globals__['load_cookie'] = lambda: 'fixture-cookie'
        main.__globals__['list_products'] = lambda *a, **k: [self.row]
        with patch.object(sys, 'argv', ['gumroad-pull', 'pull', '--all', '--delay=0', '--out=' + str(self.root)]):
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                main()
        self.assertTrue((self.root / 'guide/meta.json').exists())
        self.assertFalse((self.root / 'renamed-guide').exists())
        self.assertEqual(json.loads((self.root / 'guide/meta.json').read_text())['name'], 'Renamed Guide')

    def test_unsafe_filename_rejected(self):
        self.file['file_name'] = '../escape'
        with self.assertRaisesRegex(ValueError, 'Unsafe'):
            self.run_pull()

    def test_main_product_exception_exits_nonzero(self):
        main = self.ns['main']
        main.__globals__['load_cookie'] = lambda: 'fixture-cookie'
        main.__globals__['list_products'] = lambda *a, **k: [self.row]
        main.__globals__['pull_product'] = lambda *a, **k: (_ for _ in ()).throw(RuntimeError('failed transfer'))
        with patch.object(sys, 'argv', ['gumroad-pull', 'pull', '--all', '--delay=0', '--out=' + str(self.root)]):
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as raised:
                    main()
        self.assertEqual(raised.exception.code, 1)
        report = json.loads((self.root / 'pull-manifest.json').read_text())
        self.assertFalse(report['results'][0]['ok'])


class VerifyBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.folder = self.root / 'resources/guide'
        (self.folder / 'files').mkdir(parents=True)
        self.index = [{'permalink': 'p', 'status': 'published', 'id': 1, 'name': 'Guide'}]
        self.make_file('guide.txt', b'abcd')

    def make_file(self, name, data):
        for p in (self.folder / 'files').iterdir():
            p.unlink()
        (self.folder / 'files' / name).write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        self.record = {'file': name, 'status': 'downloaded', 'bytes': len(data), 'expected_bytes': len(data),
                       'source_revision': 'revision-1', 'source_sha256': digest, 'local_sha256': digest}
        self.meta = {'name': 'Guide', 'permalink': 'p', 'status': 'published', 'files': [self.record], 'has_rich_content': False}
        self.report = {'results': [{'slug': 'guide', 'permalink': 'p', 'ok': True, 'files': copy.deepcopy(self.meta['files'])}]}
        self.save_meta()

    def save_meta(self):
        (self.folder / 'meta.json').write_text(json.dumps(self.meta))

    def build(self):
        (self.root / 'index.json').write_text(json.dumps(self.index))
        return subprocess.run([sys.executable, str(TOOLS / 'build_repo.py'), '--repo', str(self.root), '--index', str(self.root / 'index.json')], capture_output=True, text=True)

    def verify(self, built=False):
        return verify_sync.verify(self.root, self.index, self.report, built)

    def test_complete_download_and_build_pass(self):
        self.assertEqual(self.verify()['mirrored_products'], 1)
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.verify(True)['attachments_verified'], 1)

    def test_index_empty_duplicate_or_malformed_fails(self):
        for index in ([], self.index * 2, [{'permalink': 'p'}]):
            with self.subTest(index=index), self.assertRaises(ValueError):
                verify_sync.published(index)

    def test_unpublished_drafts_excluded(self):
        self.index.append({'permalink': 'draft', 'status': 'unpublished'})
        self.assertEqual(self.verify()['published_products'], 1)

    def test_missing_product_fails(self):
        self.index.append({'permalink': 'missing', 'status': 'published'})
        with self.assertRaisesRegex(ValueError, 'coverage'):
            self.verify()

    def test_failed_product_fails(self):
        self.report['results'][0]['ok'] = False
        with self.assertRaisesRegex(ValueError, 'download failed'):
            self.verify()

    def test_http_status_in_metadata_fails(self):
        self.record['status'] = 'failed-http-503'
        self.save_meta()
        self.report['results'][0]['files'] = copy.deepcopy(self.meta['files'])
        with self.assertRaisesRegex(ValueError, 'Bad attachment'):
            self.verify()

    def test_same_size_corruption_fails(self):
        (self.folder / 'files/guide.txt').write_bytes(b'xxxx')
        with self.assertRaisesRegex(ValueError, 'corrupt'):
            self.verify()

    def test_extra_stale_attachment_fails(self):
        (self.folder / 'files/removed.txt').write_text('stale')
        with self.assertRaisesRegex(ValueError, 'Unexpected'):
            self.verify()

    def test_missing_content_fails(self):
        self.meta['has_rich_content'] = True
        self.save_meta()
        with self.assertRaisesRegex(ValueError, 'Missing resource content'):
            self.verify()

    def test_missing_catalogue_entry_fails(self):
        self.build()
        (self.root / 'manifest.json').write_text(json.dumps({'count': 0, 'products': []}))
        with self.assertRaisesRegex(ValueError, 'Finished catalogue'):
            self.verify(True)

    def test_missing_root_link_fails(self):
        self.build()
        (self.root / 'README.md').write_text('missing link')
        with self.assertRaisesRegex(ValueError, 'Catalogue link'):
            self.verify(True)

    def test_corrupt_zip_fails_build(self):
        self.make_file('kit.zip', b'not a zip')
        self.assertNotEqual(self.build().returncode, 0)

    def test_zip_replacement_removes_old_unpacked_files(self):
        self.make_file('kit.zip', archive(old='old'))
        self.assertEqual(self.build().returncode, 0)
        self.make_file('kit.zip', archive(new='new'))
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.folder / 'unpacked/kit/old').exists())
        self.assertTrue((self.folder / 'unpacked/kit/new').exists())
        self.verify(True)

    def test_zip_path_traversal_fails(self):
        self.make_file('kit.zip', archive(**{'../outside': 'unsafe'}))
        self.assertNotEqual(self.build().returncode, 0)
        self.assertFalse((self.folder / 'outside').exists())

    def test_sanitized_file_keeps_verifiable_local_hash(self):
        self.make_file('guide.txt', ('sk-' + 'a' * 30).encode())
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.verify(True)
        meta = json.loads((self.folder / 'meta.json').read_text())
        self.assertNotEqual(meta['files'][0]['source_sha256'], meta['files'][0]['local_sha256'])

    def test_verified_status_is_visible_and_not_duplicated(self):
        self.build()
        counts = self.verify(True)
        with contextlib.redirect_stdout(io.StringIO()):
            verify_sync.write_status(self.root, counts, self.index)
            verify_sync.write_status(self.root, counts, self.index)
        self.assertEqual((self.root / 'README.md').read_text().count('Last verified sync:'), 1)
        self.assertEqual(json.loads((self.root / 'sync-status.json').read_text())['mirrored_products'], 1)


class IncidentTests(unittest.TestCase):
    @patch.dict(os.environ, {'GITHUB_REPOSITORY': 'example/repo', 'GITHUB_RUN_ID': '123'})
    def test_failure_opens_one_issue_and_repeated_failure_is_quiet(self):
        with patch.object(report_sync, 'gh', return_value='[]') as gh:
            report_sync.report('failure')
            self.assertEqual(gh.call_args_list[-1].args[:2], ('issue', 'create'))
        issues = json.dumps([{'number': 7, 'title': report_sync.FAIL_TITLE}])
        with patch.object(report_sync, 'gh', return_value=issues) as gh:
            report_sync.report('failure')
            self.assertEqual(gh.call_count, 1)

    def test_recovery_closes_both_incident_types(self):
        issues = json.dumps([{'number': 7, 'title': report_sync.FAIL_TITLE}, {'number': 8, 'title': report_sync.AUTH_TITLE}])
        with patch.object(report_sync, 'gh', return_value=issues) as gh:
            report_sync.report('success')
            self.assertEqual(gh.call_count, 3)
            self.assertEqual(gh.call_args_list[-1].args[:2], ('issue', 'close'))


class ShellTests(unittest.TestCase):
    def test_expired_auth_and_failed_pull_stop_before_build_and_clean_cookie(self):
        for mode in ('auth', 'auth_exit', 'network', 'pull'):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as d:
                root = Path(d)
                (root / 'tools').mkdir()
                (root / 'resources').mkdir()
                (root / 'bin').mkdir()
                (root / 'tools/sync.sh').write_text((TOOLS / 'sync.sh').read_text())
                fake = root / 'bin/python3'
                fake.write_text('#!' + sys.executable + '\n' + '''import json,os,sys
from pathlib import Path
args=sys.argv[1:]
with open('calls.txt','a') as f:f.write(' '.join(args)+'\\n')
if 'check' in args:
 Path('cookie-path.txt').write_text(os.environ['GUMROAD_COOKIE_FILE'])
 if os.environ['MODE']=='auth_exit':sys.exit(3)
 if os.environ['MODE']=='network':sys.exit(1)
 print(json.dumps({'ok':os.environ['MODE']!='auth'}))
elif 'products' in args:print('[]')
elif 'pull' in args:sys.exit(7)
elif '-c' in args:
 sys.exit(0 if json.load(open(args[-1]))['ok'] else 1)
''')
                fake.chmod(0o755)
                env = {**os.environ, 'PATH': str(root / 'bin') + ':' + os.environ['PATH'], 'RUNNER_TEMP': d,
                       'GUMROAD_COOKIE': 'fixture-only', 'MODE': mode}
                result = subprocess.run(['bash', 'tools/sync.sh'], cwd=root, env=env, capture_output=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn('build_repo.py', (root / 'calls.txt').read_text())
                self.assertEqual((root / '.sync-auth-failed').exists(), mode in ('auth', 'auth_exit'))
                self.assertFalse(Path((root / 'cookie-path.txt').read_text()).exists())


if __name__ == '__main__':
    unittest.main()
