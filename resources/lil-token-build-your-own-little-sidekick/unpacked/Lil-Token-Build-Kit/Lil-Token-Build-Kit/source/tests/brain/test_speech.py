"""Cutting a streamed reply into speakable sentences (brain/speech.py)."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "brain"))

from speech import IGNORE, SentenceChunker  # noqa: E402


def stream(text: str, size: int = 3) -> list[str]:
    """Feed text a few characters at a time, the way it arrives."""
    c = SentenceChunker()
    out: list[str] = []
    for i in range(0, len(text), size):
        out += c.feed(text[i:i + size])
    return out + c.flush()


class Chunker(unittest.TestCase):
    def test_first_sentence_is_ready_before_the_reply_ends(self):
        c = SentenceChunker()
        self.assertEqual(c.feed("😄 Doing great, the owner."), [])   # no space yet: could be "the owner.com"
        self.assertEqual(c.feed(" Desk's cozy"), ["😄 Doing great, the owner."])
        self.assertEqual(c.feed(" and I'm charged."), [])
        self.assertEqual(c.flush(), ["Desk's cozy and I'm charged."])

    def test_pieces_join_back_to_the_reply(self):
        reply = "Octopuses have three hearts and blue blood. Two pump blood through the gills! Wild, right? The third does the rest."
        for size in (1, 2, 5, 40):
            with self.subTest(size=size):
                pieces = stream(reply, size)
                self.assertEqual(len(pieces), 4)
                self.assertEqual(" ".join(pieces), reply)

    def test_numbers_and_names_are_not_split(self):
        self.assertEqual(stream("It costs 3.5 dollars at example.com today."), ["It costs 3.5 dollars at example.com today."])
        self.assertEqual(stream("Dr. Chen emailed at 3 p.m. about the edit."), ["Dr. Chen emailed at 3 p.m. about the edit."])

    def test_a_lone_emoji_is_not_a_sentence(self):
        self.assertEqual(stream("😮! Webb found a new galaxy."), ["😮! Webb found a new galaxy."])

    def test_the_line_before_a_tool_call_is_flushed(self):
        c = SentenceChunker()
        self.assertEqual(c.feed("Checking your inbox."), [])
        self.assertEqual(c.flush(), ["Checking your inbox."])   # content block ended
        self.assertEqual(c.flush(), [])

    def test_ignore_marker_is_recognised_whole(self):
        for text in ("(ignore)", "(ignore).", " ignore "):
            with self.subTest(text=text):
                self.assertTrue(all(IGNORE.fullmatch(p) for p in stream(text)))
        self.assertFalse(IGNORE.fullmatch("Ignore that, here is the answer."))


if __name__ == "__main__":
    unittest.main()
