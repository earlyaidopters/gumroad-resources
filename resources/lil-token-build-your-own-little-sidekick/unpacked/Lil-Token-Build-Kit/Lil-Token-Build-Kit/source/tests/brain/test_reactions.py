"""Touch and motion reactions (brain/senses.py): the lines and their voice directions."""

import asyncio
import os
import re
import sys
import unittest
from pathlib import Path
from unittest import mock

os.environ["LILTOKEN_AGENT"] = "0"
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brain"))

import senses  # noqa: E402

FISH = (ROOT / "src" / "gateway" / "stackchan_mcp" / "tts" / "fish_audio.py").read_text()
CACHE_MAX = int(re.search(r"DEFAULT_CACHE_MAX_CHARS = (\d+)", FISH).group(1))


class FakeBrain:
    def __init__(self):
        self.busy = asyncio.Lock()
        self.said = []

    async def quick_say(self, text, face="happy"):
        self.said.append((text, face))


class Reactions(unittest.TestCase):
    def test_every_line_has_a_cue_and_plain_words(self):
        for kind, (face, lines) in senses.REACTIONS.items():
            self.assertIn(face, {"happy", "surprised", "embarrassed", "sad"}, kind)
            self.assertGreaterEqual(len(lines), 2, kind)
            for cue, line in lines:
                self.assertTrue(cue.strip() and line.strip(), kind)
                for text in (cue, line):
                    self.assertNotRegex(text, r"[\[\]<>]", f"{kind}: {text!r}")

    def test_directed_puts_the_cue_in_brackets_before_the_line(self):
        self.assertEqual(senses.directed("startled", "Hey, I'm airborne!", on=True), "[startled] Hey, I'm airborne!")

    def test_directions_off_sends_the_plain_line(self):
        self.assertEqual(senses.directed("startled", "Hey, I'm airborne!", on=False), "Hey, I'm airborne!")
        self.assertEqual(senses.directed("", "Hey, I'm airborne!", on=True), "Hey, I'm airborne!")

    def test_directed_lines_still_fit_the_speech_cache(self):
        # A line past the gateway's cache limit is synthesised again on every
        # reaction, and a directed drama-3 line can take seconds.
        for kind, (_, lines) in senses.REACTIONS.items():
            for cue, line in lines:
                sent = senses.directed(cue, line, on=True)
                self.assertLessEqual(len(sent), CACHE_MAX, f"{kind}: {sent!r} is {len(sent)} characters")

    def test_a_pick_up_speaks_a_directed_line_with_the_surprised_face(self):
        brain = FakeBrain()
        s = senses.Senses(brain)
        with mock.patch.object(senses, "VOICE_DIRECTIONS", True):
            asyncio.run(s.on_robot_event({"event_type": "motion", "subtype": "picked_up"}))
        self.assertEqual(len(brain.said), 1)
        text, face = brain.said[0]
        self.assertEqual(face, "surprised")
        self.assertRegex(text, r"^\[[a-z, ]+\] \S")
        sent = {senses.directed(c, l, on=True) for c, l in senses.REACTIONS[("motion", "picked_up")][1]}
        self.assertIn(text, sent)

    def test_the_same_reaction_does_not_repeat_within_twenty_seconds(self):
        brain = FakeBrain()
        s = senses.Senses(brain)
        ev = {"event_type": "touch", "subtype": "stroke"}
        asyncio.run(s.on_robot_event(ev))
        asyncio.run(s.on_robot_event(ev))
        self.assertEqual(len(brain.said), 1)


if __name__ == "__main__":
    unittest.main()
