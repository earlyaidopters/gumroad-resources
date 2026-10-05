import importlib.util,json,tempfile,unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('setup',p/'scripts/setup.py');setup=importlib.util.module_from_spec(spec);spec.loader.exec_module(setup)
class SetupTests(unittest.TestCase):
 def test_copy_starts_without_approvals(self):
  with tempfile.TemporaryDirectory() as d:
   h=Path(d);setup.copy_bridge(p,h)
   self.assertEqual(json.loads((h/'.claude/mcp/codex-cu/always-allowed.json').read_text()),{'apps':[],'autoApproveAll':False})
   self.assertEqual((h/'.claude/mcp/codex-cu/daemon.mjs').read_bytes(),(p/'bridge/daemon.mjs').read_bytes())
 def test_existing_bridge_is_untouched(self):
  with tempfile.TemporaryDirectory() as d:
   h=Path(d);dest=h/'.claude/mcp/codex-cu';dest.mkdir(parents=True);(dest/'keep').write_text('existing')
   with self.assertRaises(FileExistsError):setup.copy_bridge(p,h)
   self.assertEqual(list(dest.iterdir()),[dest/'keep'])
 def test_paths_with_spaces_are_single_arguments(self):
  cs=setup.commands(Path('/test/a folder'),Path('/home/a user'),'both')
  self.assertIn('/test/a folder',cs[0]);self.assertIn('/home/a user/.claude/mcp/codex-cu/launch.mjs',cs[1])
 def test_threads_only_has_no_computer_registration(self):
  cs=setup.commands(Path('/test'),Path('/home/tester'),'threads')
  self.assertEqual(len(cs),2);self.assertFalse(any('mcp' in c for c in cs))
if __name__=='__main__':unittest.main()
