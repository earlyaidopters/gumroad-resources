import contextlib
import importlib.util
import io
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("installer", Path(__file__).resolve().parents[1] / "scripts/install_skills.py")
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve() / "project"
        self.root.mkdir()

    def run_install(self, **kwargs):
        with contextlib.redirect_stdout(io.StringIO()):
            return installer.install(self.root, **kwargs)

    def test_preview_writes_nothing(self):
        self.run_install()
        self.assertEqual(list(self.root.iterdir()), [])

    def test_both_targets_and_idempotence(self):
        self.run_install(apply=True)
        before = {str(p): p.stat().st_mtime_ns for p in self.root.rglob("SKILL.md")}
        self.assertEqual(len(before), 4)
        self.run_install(apply=True)
        self.assertEqual(before, {str(p): p.stat().st_mtime_ns for p in self.root.rglob("SKILL.md")})

    def test_single_target(self):
        self.run_install(target="codex", apply=True)
        self.assertFalse((self.root / ".claude").exists())
        self.assertEqual(len(list(self.root.rglob("SKILL.md"))), 2)

    def test_conflict_preflight_prevents_partial_install(self):
        old = self.root / ".agents/skills/prime/SKILL.md"
        old.parent.mkdir(parents=True)
        old.write_text("existing private skill")
        with self.assertRaises(ValueError):
            self.run_install(apply=True)
        self.assertFalse((self.root / ".claude").exists())
        self.assertEqual(old.read_text(), "existing private skill")

    def test_symlink_directory_refused(self):
        outside = self.root.parent / "outside"
        outside.mkdir()
        (self.root / ".agents").symlink_to(outside, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.run_install(apply=True)
        self.assertEqual(list(outside.iterdir()), [])

    def test_dangling_symlink_refused(self):
        (self.root / ".claude").symlink_to(self.root / "missing")
        with self.assertRaises(ValueError):
            self.run_install(apply=True)

    def test_extra_skill_files_refused(self):
        folder = self.root / ".claude/skills/handoff"
        folder.mkdir(parents=True)
        (folder / "private.md").write_text("do not overwrite")
        with self.assertRaises(ValueError):
            self.run_install(apply=True)
        self.assertFalse((folder / "SKILL.md").exists())

    def test_missing_project_refused(self):
        with self.assertRaises(OSError):
            installer.plan_install(self.root / "missing", "both")

    def test_non_directory_parent_refused(self):
        (self.root / ".agents").write_text("existing")
        with self.assertRaises(ValueError):
            self.run_install(apply=True)


if __name__ == "__main__":
    unittest.main()
