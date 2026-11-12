"""Speaking first (brain/proactive.py), the announce queue and coding runs."""

import asyncio
import datetime as dt
import os
import sys
import time
import unittest
from pathlib import Path
from unittest import mock

os.environ["LILTOKEN_AGENT"] = "0"
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "brain"))

import agent  # noqa: E402
import brain  # noqa: E402
import code_tasks  # noqa: E402
import proactive  # noqa: E402
import skills  # noqa: E402


class Milestones(unittest.TestCase):
    def test_crossing(self):
        self.assertEqual(proactive.crossed(58_000, 60_500), None)
        self.assertEqual(proactive.crossed(49_900, 50_010), 50_000)
        self.assertEqual(proactive.crossed(900, 12_000), 10_000)   # only the biggest one passed
        self.assertEqual(proactive.crossed(50_000, 50_400), None)  # already past it

    def test_said_the_way_it_is_spoken(self):
        self.assertEqual(proactive.spoken_number(50_000), "fifty thousand")
        self.assertEqual(proactive.spoken_number(1_000_000), "a million")


class SignIn(unittest.TestCase):
    def test_warns_only_when_the_end_is_near(self):
        now = dt.datetime(2026, 11, 9, 22, 0, tzinfo=dt.timezone.utc)
        status = lambda ends, logged=True: '{"loggedIn": %s, "loginExpiresAt": "%s"}' % (str(logged).lower(), ends)
        self.assertIsNone(proactive.sign_in_line(status("2026-11-20T10:00:00Z"), now))
        self.assertIn("tomorrow", proactive.sign_in_line(status("2026-11-10T20:00:00Z"), now))
        self.assertIn("ended", proactive.sign_in_line(status("2026-11-10T20:00:00Z", False), now))
        self.assertIsNone(proactive.sign_in_line("not json", now))


class Sales(unittest.TestCase):
    def sale(self, amount, product="The Agent Course"):
        return {"id": f"s:{amount}", "amount": amount, "product": product, "currency": "USD", "at": 0}

    def test_small_sales_stay_quiet(self):
        self.assertIsNone(proactive.sale_line([self.sale(9), self.sale(27)], big=100))
        self.assertIsNone(proactive.sale_line([], big=100))

    def test_a_big_sale_gets_a_line(self):
        self.assertIn("The Agent Course", proactive.sale_line([self.sale(497)], big=100))
        line = proactive.sale_line([self.sale(9, "Prompt Pack"), self.sale(497), self.sale(27)], big=100)
        self.assertIn("3 new sales", line)
        self.assertIn("The Agent Course", line)


class Lights(unittest.TestCase):
    def test_goodnight_needs_a_real_drop_late_in_the_evening(self):
        said = []
        fake = mock.Mock()
        fake.announce = lambda text, **kw: said.append(text)
        p = proactive.Proactive(fake)
        late = dt.datetime(2026, 11, 9, 22, 30)
        with mock.patch.object(proactive.dt, "datetime", mock.Mock(now=lambda *a: late)), \
             mock.patch.object(proactive.dt, "date", mock.Mock(today=lambda: late.date())):
            for value in (1, 2, 1, 2, 1):      # a sensor with no range never says goodnight
                p.check_lights(value)
            self.assertEqual(said, [])
            for value in (40, 42, 41, 3):      # lamp on, then off
                p.check_lights(value)
            self.assertEqual(len(said), 1)
            p.check_lights(2)
            self.assertEqual(len(said), 1)     # once a night


class Announce(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.brain = brain.Brain()
        self.turns = []
        self.brain.start_turn = lambda wake: (self.turns.append(wake) or True)

    async def test_the_same_line_is_not_queued_twice(self):
        self.assertTrue(self.brain.announce("Claude finished in demo."))
        self.assertFalse(self.brain.announce("Claude finished in demo."))
        self.assertEqual(len(self.brain.announcements), 1)

    async def test_queued_lines_are_said_together_when_idle(self):
        self.brain.announce("One.", urgent=True)
        self.brain.announce("Two.", urgent=True, leds=(0, 200, 60))
        self.brain.say_announcements()
        self.assertEqual(self.turns[0]["say"], "One. Two.")
        self.assertEqual(self.turns[0]["leds"], (0, 200, 60))
        self.assertEqual(self.brain.announcements, [])

    async def test_ordinary_lines_wait_out_the_quiet_hours(self):
        self.brain.announce("A sale came in.")
        with mock.patch.object(skills, "quiet_hours", lambda now: True):
            self.brain.say_announcements()
        self.assertEqual(self.turns, [])
        with mock.patch.object(skills, "quiet_hours", lambda now: False):
            self.brain.say_announcements()
        self.assertEqual(len(self.turns), 1)

    async def test_stale_lines_are_dropped(self):
        self.brain.announce("Old news.")
        self.brain.announcements[0]["at"] = time.time() - 3600
        with mock.patch.object(skills, "quiet_hours", lambda now: False):
            self.brain.say_announcements()
        self.assertEqual(self.turns, [])


class CodeRuns(unittest.TestCase):
    def test_only_listed_folders(self):
        with mock.patch.object(code_tasks, "folders", lambda: {"sandbox": Path("/tmp")}):
            self.assertEqual(code_tasks.pick("the Sandbox")[0], "sandbox")
            self.assertEqual(code_tasks.pick("sandbox")[0], "sandbox")
            self.assertIsNone(code_tasks.pick("my home folder"))
            self.assertIsNone(code_tasks.pick("../etc"))

    def test_summary_is_the_last_plain_paragraph(self):
        out = "I looked at the code.\n\n```python\nx = 1\n```\n\nFixed the discount so it is a percentage. Both tests pass now."
        self.assertEqual(code_tasks.spoken_summary(out), "Fixed the discount so it is a percentage. Both tests pass now.")

    def test_cli_notices_are_not_read_out(self):
        out = "Warning: this sign-in ends soon. Run claude auth login.\nFixed the discount. Both tests pass."
        self.assertEqual(code_tasks.spoken_summary(out), "Fixed the discount. Both tests pass.")

    def test_a_run_needs_marks_own_words(self):
        self.assertTrue(agent.allowed_write("code", "tell Claude to fix the failing test in the sandbox"))
        self.assertFalse(agent.allowed_write("code", "what's the weather"))
        self.assertTrue(agent.allowed_write("code", "yes do it", "Want me to hand that bug to Claude?"))


if __name__ == "__main__":
    unittest.main()
