"""Whose voice was that (brain/voice.py): the rules around the model."""

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np

os.environ["LILTOKEN_AGENT"] = "0"
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "brain"))

import agent  # noqa: E402
import voice  # noqa: E402

MARK = np.array([1, 0, 0, 0], dtype=np.float32)
GUEST = np.array([0, 1, 0, 0], dtype=np.float32)


class VoiceRules(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        for target, value in ((voice, "VOICE_FILE"),):
            p = mock.patch.object(target, value, Path(self.tmp.name) / "voice.json")
            p.start()
            self.addCleanup(p.stop)
        self.v = voice.Voice()
        self.who = {"mark1.wav": MARK, "mark2.wav": MARK, "mark3.wav": MARK, "guest.wav": GUEST, "short.wav": GUEST}
        self.v.embed = lambda path: self.who[Path(path).name]
        seconds = mock.patch.object(voice, "clip_seconds", lambda p: 0.6 if "short" in p else 3.0)
        seconds.start()
        self.addCleanup(seconds.stop)
        exists = mock.patch.object(Path, "exists", lambda self: True)
        exists.start()
        self.addCleanup(exists.stop)

    def test_nobody_is_ignored_before_mark_enrolls(self):
        self.assertFalse(self.v.enrolled)
        self.assertTrue(self.v.is_owner("guest.wav"))

    def test_enrolling_needs_enough_speech(self):
        self.assertIn("need a bit more", self.v.enroll(["mark1.wav", "short.wav"]))
        self.assertFalse(self.v.enrolled)
        self.assertIn("Learned", self.v.enroll(["mark1.wav", "mark2.wav", "mark3.wav"]))
        self.assertTrue(self.v.enrolled)

    def test_after_enrolling_other_voices_are_ignored(self):
        self.v.enroll(["mark1.wav", "mark2.wav"])
        self.assertTrue(self.v.is_owner("mark3.wav"))
        self.assertFalse(self.v.is_owner("guest.wav"))
        self.assertTrue(self.v.is_owner("short.wav"))     # too short to judge: let it through
        self.assertTrue(self.v.is_owner(""))              # no clip: let it through

    def test_it_survives_a_restart_and_can_be_forgotten(self):
        self.v.enroll(["mark1.wav", "mark2.wav"])
        again = voice.Voice()
        self.assertTrue(again.enrolled)
        again.forget()
        self.assertFalse(voice.Voice().enrolled)

    def test_voice_settings_need_marks_own_words(self):
        self.assertTrue(agent.allowed_write("voice", "learn my voice"))
        self.assertTrue(agent.allowed_write("voice", "only listen to me from now on"))
        self.assertFalse(agent.allowed_write("voice", "what's on my calendar"))


if __name__ == "__main__":
    unittest.main()
