"""Wake and dance-stop phrases, taken from docs/BUILD-LOG.md.

Every line here was a real miss or a real false trigger on the robot, and
each got its own fix. These tests keep those fixes from quietly breaking.

Run: ~/.local/share/uv/tools/stackchan-mcp/bin/python -m unittest discover -s tests/gateway -v
"""

import unittest

from stackchan_mcp.ears import is_dance_stop, split_wake, split_wake_anywhere

# (what Whisper heard, the question that should be left over)
WAKES = [
    ("Hey Lil Token", ""),
    ("Hey Lil Token, what time is it in Tokyo?", "what time is it in Tokyo?"),
    ("Yo, Lil Token.", ""),
    ("Hey little token, what's 2 plus 2?", "what's 2 plus 2?"),
    ("Yo, little token", ""),
    ("Okay Lil Token, look at this", "look at this"),
    # Whisper mangling the name (16:02 live test, 20 October)
    ("hey little talking", ""),
    ("hey lil tokin", ""),
    ("hey liltok", ""),
    ("hey little Tolkien", ""),
    # "you" as a filler before the name (21 October 09:05)
    ("Hey, you little token", ""),
    # "a" is Whisper's spelling of "hey"; the name itself is intact
    ("A little token", ""),
]

NOT_WAKES = [
    # talked about, not talked to (14:54 live session, 20 October)
    "Lil Token is cool",
    "Lil Token looks for these topics every morning",
    "the little tokens are worth a lot",
    # 21 October 19:53
    "little tiny things they actually matter a lot",
    # 22 October 11:06
    "a little bit, even if we're exaggerating",
    # ordinary speech
    "I think the latest model uses fewer tokens",
    "okay so the meeting is at three",
]

DANCE_STOPS = [
    "stop dancing", "Stop dancing.", "stop the dance", "that's enough", "okay enough", "Okay, that's enough.",
    "enough dancing", "quit dancing", "stop", "Stop.", "enough", "chill", "freeze", "halt",
    "Lil Token, stop",
    "May the token stop",  # how Whisper heard "Lil Token, stop" over music
    "not dancing", "done dancing", "stopped dancing",
]

LYRICS = [
    "don't stop", "can't stop the feeling", "won't stop", "never stop", "I will not stop",
    "ain't stop till we get enough of this tonight",
    "we are gonna dance all night long until the morning comes",
    "",
]


class Wake(unittest.TestCase):
    def test_wakes(self):
        for text, rest in WAKES:
            with self.subTest(text=text):
                wake, question = split_wake(text)
                self.assertTrue(wake)
                self.assertEqual(question.lower(), rest.lower())

    def test_not_wakes(self):
        for text in NOT_WAKES:
            with self.subTest(text=text):
                self.assertFalse(split_wake(text)[0])

    def test_wake_inside_a_longer_segment_over_music(self):
        wake, question = split_wake_anywhere("la la la all night. Hey Lil Token, what's the weather")
        self.assertTrue(wake)
        self.assertEqual(question, "what's the weather")
        self.assertFalse(split_wake_anywhere("dancing all night with the little things we love")[0])


class DanceStop(unittest.TestCase):
    def test_stops(self):
        for text in DANCE_STOPS:
            with self.subTest(text=text):
                self.assertTrue(is_dance_stop(text))

    def test_lyrics_do_not_stop_it(self):
        for text in LYRICS:
            with self.subTest(text=text):
                self.assertFalse(is_dance_stop(text))


if __name__ == "__main__":
    unittest.main()
