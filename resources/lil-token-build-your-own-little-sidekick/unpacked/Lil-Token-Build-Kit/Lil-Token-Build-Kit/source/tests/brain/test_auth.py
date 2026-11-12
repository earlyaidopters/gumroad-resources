"""The brain's endpoints let nobody in without the token.

Run: brain/.venv/bin/python -m unittest discover -s tests/brain -v
"""

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

os.environ["LILTOKEN_AGENT"] = "0"  # never start a Claude session from a test
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "brain"))

import brain  # noqa: E402


class Request:
    def __init__(self, header: str | None = None) -> None:
        self.headers = {} if header is None else {"Authorization": header}


class Authorized(unittest.TestCase):
    def setUp(self) -> None:
        self.brain = brain.Brain()

    def test_right_token_is_let_in(self) -> None:
        with mock.patch.object(brain, "TOKEN", "s3cret"):
            self.assertTrue(self.brain.authorized(Request("Bearer s3cret")))

    def test_wrong_or_missing_token_is_refused(self) -> None:
        with mock.patch.object(brain, "TOKEN", "s3cret"):
            for header in (None, "", "Bearer", "Bearer nope", "s3cret", "bearer s3cret"):
                self.assertFalse(self.brain.authorized(Request(header)), header)

    def test_no_token_configured_refuses_everyone(self) -> None:
        # This used to let every request through.
        with mock.patch.object(brain, "TOKEN", ""):
            for header in (None, "", "Bearer ", "Bearer anything"):
                self.assertFalse(self.brain.authorized(Request(header)), header)

    def test_refuses_to_start_without_a_token(self) -> None:
        with mock.patch.object(brain, "TOKEN", ""), mock.patch.object(brain.web, "run_app") as run_app:
            with self.assertRaises(SystemExit) as stop:
                brain.main()
            self.assertEqual(stop.exception.code, 78)
            run_app.assert_not_called()


if __name__ == "__main__":
    unittest.main()
