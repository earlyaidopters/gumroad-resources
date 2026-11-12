"""The brain's conversation rules and safety gates.

Phrases come from docs/BUILD-LOG.md. No robot, no network and no model
calls: these only exercise pure functions and the turn-start guard.

Run: brain/.venv/bin/python -m unittest discover -s tests/brain -v
"""

import asyncio
import os
import sys
import unittest
from pathlib import Path

os.environ["LILTOKEN_AGENT"] = "0"  # never start a Claude session from a test
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "brain"))

import agent  # noqa: E402
import brain  # noqa: E402

RESUMES = [
    "okay, try it now", "Okay, try it now.", "try again", "how about now", "what about this one",
    "can you see it now", "look again", "is this better", "and now?",
]
NOT_RESUMES = [
    "what's the weather tomorrow",
    "now I need to send that email to Jon",
    "can you see my calendar for tomorrow",
    "I think we should try again later with the whole team",
]

# 9 November 2026: "Can you look at my recent emails?" opened the live camera
# view for 15 s over the Gmail answer.
NOT_CAMERA = [
    "Can you look at my recent emails?",
    "look at my inbox",
    "can you look into my Gmail",
    "look at my calendar for tomorrow",
    "show me my sales today",
    "look up the weather in Toronto",
    "take a closer look at my Stripe numbers",
    "can you look at the news about Anthropic",
    "look at how my latest video is doing",
    "turn off your camera",
    "what's two plus two",
]
CAMERA = [
    "what do you see",
    "can you see me",
    "what am I holding",
    "what's this in my hand",
    "look at this",
    "look at me",
    "how do I look",
    "take a picture",
    "turn on your camera",
    "look at this email on my phone",
    "can you see this document I'm holding",
    "look at my desk",
    "what is this",
    "look at the mug",
]

GOODBYES = [
    "thanks", "Thanks, that's it.", "that's all", "never mind", "bye",
    "it's fine for now", "no thanks",
    "Okay, thanks. That's actually all I needed to know.",  # 21 October: used to get a long chat reply
]
NOT_GOODBYES = [
    "thanks, but can you also check my calendar",
    "what time is it in Tokyo",
    "how was your night",
    "remind me to say thanks to Jon",  # a reminder, not a goodbye
    # Short lines that only contain a goodbye word. Found by this test on
    # 9 November 2026: they used to end the chat.
    "Thanks. What about tomorrow?",
    "what's on my calendar later today",
]

WAIT_LONGER = [
    "Hold it a bit closer.", "I can't quite see it, try again.", "Let me take a closer look.",
    "Do you want me to draft a reply?",
]
NORMAL_WAIT = ["It's three p m in Tokyo.", "You have two meetings tomorrow."]


class Camera(unittest.TestCase):
    def test_screen_things_do_not_open_the_camera(self):
        for q in NOT_CAMERA:
            self.assertFalse(brain.wants_camera(q), q)

    def test_physical_things_open_the_camera(self):
        for q in CAMERA:
            self.assertTrue(brain.wants_camera(q), q)

    def test_fallback_route_sends_mail_to_google_not_the_camera(self):
        b = brain.Brain()
        self.assertEqual(b.pick_route("Can you look at my recent emails?", ""), "google")
        self.assertEqual(b.pick_route("what am I holding", ""), "vision")


class ConversationRules(unittest.TestCase):
    def test_resume_without_wake_word(self):
        for text in RESUMES:
            with self.subTest(text=text):
                self.assertTrue(brain.RESUME.match(text))
        for text in NOT_RESUMES:
            with self.subTest(text=text):
                self.assertFalse(brain.RESUME.match(text))

    def test_goodbye(self):
        for text in GOODBYES:
            with self.subTest(text=text):
                self.assertTrue(brain.is_goodbye(text))
        for text in NOT_GOODBYES:
            with self.subTest(text=text):
                self.assertFalse(brain.is_goodbye(text))

    def test_answers_that_ask_mark_to_act_get_a_longer_window(self):
        for text in WAIT_LONGER:
            with self.subTest(text=text):
                self.assertTrue(brain.EXPECT_MORE.search(text))
        for text in NORMAL_WAIT:
            with self.subTest(text=text):
                self.assertFalse(brain.EXPECT_MORE.search(text))

    def test_ignore_marker(self):
        self.assertEqual(brain.clean_for_speech("**Hello** https://example.com there"), "Hello there")


class WriteGate(unittest.TestCase):
    """Memory, reminders and drafts only when the owner's own words asked."""

    def test_mark_asks_directly(self):
        ok = agent.allowed_write
        self.assertTrue(ok("remember", "remember that my flight is at six"))
        self.assertTrue(ok("remember", "hey, don't forget I moved the call to Friday"))
        self.assertTrue(ok("forget", "forget what I said about the flight"))
        self.assertTrue(ok("draft", "can you reply to Jon and say yes"))
        self.assertTrue(ok("draft", "draft him a short no"))
        self.assertTrue(ok("remind", "remind me in ten minutes to stretch"))
        self.assertTrue(ok("remind", "set a timer for five minutes"))

    def test_a_question_alone_never_unlocks_a_write(self):
        # The injection case: the owner asks something harmless, and the text of an
        # email or web page tells the model to save or draft something.
        for heard in ("who emailed me today", "what's the latest on the Fable launch",
                      "check my calendar", "summarise that repo", ""):
            for kind in ("remember", "forget", "draft", "remind"):
                with self.subTest(heard=heard, kind=kind):
                    self.assertFalse(agent.allowed_write(kind, heard))

    def test_yes_only_counts_after_lil_token_offered(self):
        ok = agent.allowed_write
        self.assertTrue(ok("remember", "yes please", "Want me to remember that?"))
        self.assertTrue(ok("draft", "yeah, go ahead", "Jon wants an answer by Friday. Should I draft a reply?"))
        self.assertFalse(ok("remember", "yes", "It is sunny and twelve degrees."))
        self.assertFalse(ok("draft", "sure", "You have two meetings tomorrow."))
        self.assertFalse(ok("remember", "what else", "Want me to remember that?"))


class TurnStart(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.brain = brain.Brain()
        self.started = []

        async def fake_turn(wake):
            try:
                async with self.brain.busy:
                    self.brain.starting = False
                    self.started.append(wake)
                    await asyncio.sleep(0.05)
            finally:
                self.brain.starting = False

        self.brain.turn = fake_turn

    async def test_two_wake_signals_start_one_conversation(self):
        # A tap and the wake phrase arrive in the same instant, before the
        # first conversation has taken the lock.
        self.assertTrue(self.brain.start_turn({"event": "wake", "wake_word": "tap"}))
        self.assertFalse(self.brain.start_turn({"event": "utterance", "wake": True}))
        await asyncio.sleep(0)  # the first one now holds the lock
        self.assertFalse(self.brain.start_turn({"event": "wake", "wake_word": "tap"}))
        await asyncio.sleep(0.1)
        self.assertEqual(len(self.started), 1)
        self.assertFalse(self.brain.engaged())
        self.assertTrue(self.brain.start_turn({"event": "wake"}))  # free again afterwards
        await asyncio.sleep(0.1)
        self.assertEqual(len(self.started), 2)

    async def test_a_failed_turn_does_not_leave_the_robot_deaf(self):
        fresh = brain.Brain()

        async def boom(wake):
            raise RuntimeError("gateway down")

        fresh._turn = boom
        fresh.starting = True
        with self.assertRaises(RuntimeError):
            await fresh.turn({"event": "wake"})
        self.assertFalse(fresh.engaged())


if __name__ == "__main__":
    unittest.main()
