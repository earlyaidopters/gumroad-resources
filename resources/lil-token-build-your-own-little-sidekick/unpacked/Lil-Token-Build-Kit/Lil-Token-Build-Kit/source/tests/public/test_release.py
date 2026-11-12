"""Release regressions for local configuration, private tools and packaged assets."""
import importlib.machinery
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'brain'))
import code_tasks
import connections


def load_adapter(name):
    loader=importlib.machinery.SourceFileLoader('adapter_'+name,str(ROOT/'brain'/name))
    spec=importlib.util.spec_from_loader(loader.name,loader)
    module=importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


class Defaults(unittest.TestCase):
    def test_google_refuses_network_without_opt_in(self):
        module=load_adapter('gtool')
        with mock.patch.dict(os.environ,{'GOOGLE_ACCESS_TOKEN':'synthetic-token'},clear=True),mock.patch.object(module.urllib.request,'urlopen') as network:
            with self.assertRaises(ValueError): module.get('calendar','calendars/primary/events')
            network.assert_not_called()

    def test_business_refuses_network_without_opt_in(self):
        module=load_adapter('biz')
        with mock.patch.dict(os.environ,{'STRIPE_SECRET_KEY':'synthetic-token'},clear=True),mock.patch.object(module.urllib.request,'urlopen') as network:
            with self.assertRaises(ValueError): module.get('stripe','charges',{})
            network.assert_not_called()

    def test_composio_does_not_load_a_machine_login(self):
        with tempfile.TemporaryDirectory() as directory:
            login=Path(directory)/'login.json'
            login.write_text('{"api_key":"synthetic-personal-login"}')
            with mock.patch.dict(os.environ,{},clear=True),mock.patch.object(connections,'LOGIN_FILE',login):
                self.assertIsNone(connections.credential())

    def test_default_code_task_does_not_start(self):
        import asyncio
        with mock.patch.dict(os.environ,{},clear=True),mock.patch.object(code_tasks,'_run') as run:
            result=asyncio.run(code_tasks.start(None,'sandbox','change a file'))
            self.assertIn('disabled',result)
            run.assert_not_called()

    def test_offline_demo_needs_no_secrets(self):
        result=subprocess.run([sys.executable,str(ROOT/'examples/desk_demo.py')],env={'PATH':os.defpath},capture_output=True,text=True,check=True)
        self.assertIn('Test meeting',result.stdout)

    def test_song_identification_does_not_read_home_credentials(self):
        import music
        with mock.patch.dict(os.environ,{},clear=True),mock.patch.object(Path,'read_text',side_effect=AssertionError('unexpected file read')):
            self.assertIn('off',music.name_song('not-a-real-audio-file'))

    def test_business_fallback_respects_opt_in(self):
        import asyncio
        import skills
        with mock.patch.dict(os.environ,{},clear=True),mock.patch.object(skills,'run_claude') as run:
            result=asyncio.run(skills.ask_biz('claude','sonnet','sales','','now'))
            self.assertIn('off',result)
            run.assert_not_called()

    def test_face_payload_sizes(self):
        for name in ['default','party','classical','jazz','rock','research','google']:
            self.assertEqual((ROOT/'avatar'/f'{name}.rgb565').stat().st_size,14*160*120*2)
        for path in (ROOT/'avatar/overlays').glob('*.overlay'):
            self.assertEqual(path.stat().st_size,160*120*3)

    def test_configure_keeps_existing_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'tools').mkdir()
            import shutil
            shutil.copy2(ROOT/'tools/configure.py',root/'tools/configure.py')
            (root/'.env.example').write_text('STACKCHAN_TOKEN=\n')
            one=subprocess.run([sys.executable,str(root/'tools/configure.py')],capture_output=True,check=True)
            original=(root/'.env').read_bytes()
            self.assertEqual((root/'.env').stat().st_mode & 0o777,0o600)
            self.assertNotIn(original.split(b'=')[1].strip(),one.stdout)
            two=subprocess.run([sys.executable,str(root/'tools/configure.py')],capture_output=True)
            self.assertNotEqual(two.returncode,0)
            self.assertEqual(original,(root/'.env').read_bytes())
