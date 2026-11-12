"""Musical taste (brain/music.py): the decision rules, not the audio model."""

import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

import numpy as np

os.environ["LILTOKEN_AGENT"] = "0"
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "brain"))

import agent  # noqa: E402
import music  # noqa: E402


class Decide(unittest.TestCase):
    def scores(self, **kw):
        base = {k: 0.0 for k in music.DESCRIPTIONS}
        base.update(kw)
        return base

    def test_a_clear_winner(self):
        self.assertEqual(music.decide(self.scores(jazz=0.9, pop=0.05))[0], "jazz")

    def test_a_weak_or_close_call_is_unsure(self):
        self.assertEqual(music.decide(self.scores(pop=0.30, rock=0.25, jazz=0.2))[0], "unsure")
        self.assertEqual(music.decide(self.scores(hiphop=0.48, ambient=0.45))[0], "unsure")

    def test_every_kind_has_a_look(self):
        from brain import FACES
        for kind in list(music.DESCRIPTIONS) + ["unsure"]:
            with self.subTest(kind=kind):
                self.assertIn(music.PERSONAS[kind]["face"], FACES)
                self.assertTrue(FACES[music.PERSONAS[kind]["face"]].exists())

    def test_quiet_music_gets_a_quiet_reaction(self):
        for kind in ("ambient", "unsure"):  # and "pop" is the plain reaction for unplaced music
            self.assertIsNone(music.PERSONAS[kind]["line"])
            self.assertEqual(music.PERSONAS[kind]["style"], "sway")
        self.assertEqual(music.PERSONAS["arabic"]["face"], "party")   # the tarboush is for Arabic music only


class Teaching(unittest.TestCase):
    def test_marks_words_map_to_a_look(self):
        self.assertEqual(music.kind_for("this is rap"), "hiphop")
        self.assertEqual(music.kind_for("tarboush music"), "arabic")
        self.assertEqual(music.kind_for("that's lo-fi"), "ambient")
        self.assertEqual(music.kind_for("Jazz"), "jazz")
        self.assertIsNone(music.kind_for("polka"))

    def test_a_taught_clip_wins_next_time(self):
        g = music.Genre()
        a = np.zeros(8, dtype=np.float32); a[0] = 1
        near = a.copy(); near[1] = 0.2; near /= np.linalg.norm(near)
        far = np.zeros(8, dtype=np.float32); far[3] = 1
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(music, "TAUGHT_FILE", Path(tmp) / "taught.json"):
            with mock.patch.object(g, "embed", lambda path: a):
                self.assertIn("jazz", g.teach("clip.wav", "this is jazz"))
                self.assertIn("do not have a look", g.teach("clip.wav", "polka"))
            self.assertEqual(g.match_taught(near)[0], "jazz")
            self.assertIsNone(g.match_taught(far))

    def test_teaching_needs_marks_own_words(self):
        self.assertTrue(agent.allowed_write("teach", "this is jazz"))
        self.assertTrue(agent.allowed_write("teach", "that's hip hop, learn it"))
        self.assertFalse(agent.allowed_write("teach", "what's the weather"))


class HearingMusic(unittest.IsolatedAsyncioTestCase):
    """brain.heard_music: when a sound in the room becomes a reaction."""

    async def asyncSetUp(self):
        import datetime as real_dt
        import brain as brain_mod

        self.b = brain_mod.Brain()
        self.b.last_dance_end = -1e9
        self.started = []
        self.b.start_turn = lambda wake: (self.started.append(wake) or True)
        self.verdict = {"is_music": True, "kind": "jazz", "confidence": 0.9, "music_share": 0.95, "taught": False}
        self.b.genre.classify = lambda clip: dict(self.verdict)
        self.clip = tempfile.NamedTemporaryFile(suffix=".wav")
        self.addCleanup(self.clip.close)
        midday = real_dt.datetime(2026, 11, 9, 12, 0)   # taken before the class is patched
        noon = mock.patch.object(brain_mod.dt, "datetime", mock.Mock(now=lambda *a: midday))
        noon.start()
        self.addCleanup(noon.stop)

    def event(self, kind="music_candidate"):
        return {"event": kind, "clip": self.clip.name, "bpm": 100, "score": 0.1}

    async def test_sound_without_a_beat_needs_two_agreeing_checks(self):
        self.assertFalse(await self.b.heard_music(self.event()))
        self.assertEqual(self.started, [])
        self.assertTrue(await self.b.heard_music(self.event()))
        self.assertEqual(self.started[0]["kind"], "jazz")

    async def test_a_beat_is_enough_on_its_own(self):
        self.assertTrue(await self.b.heard_music(self.event("music")))

    async def test_talk_and_fans_never_start_a_reaction(self):
        self.verdict = {"is_music": False, "kind": "unsure", "confidence": 0.3, "music_share": 0.2, "taught": False}
        for _ in range(4):
            self.assertFalse(await self.b.heard_music(self.event("music")))
        self.assertEqual(self.started, [])

    async def test_music_it_cannot_place_gets_the_plain_reaction(self):
        self.verdict["kind"] = "unsure"
        await self.b.heard_music(self.event())
        await self.b.heard_music(self.event())
        self.assertEqual(self.started[0]["kind"], "pop")

    async def test_not_again_within_the_gap(self):
        self.b.last_dance_end = time.monotonic()
        self.assertFalse(await self.b.heard_music(self.event("music")))


if __name__ == "__main__":
    unittest.main()
