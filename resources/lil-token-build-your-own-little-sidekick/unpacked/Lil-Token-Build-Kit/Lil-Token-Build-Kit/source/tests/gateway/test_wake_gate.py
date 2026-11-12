"""When the ears are allowed to transcribe (ears.py gate and attention)."""

import time
import types
import unittest
from unittest import mock

from stackchan_mcp import ears as ears_mod


def make_ears(spotter=None, gate=True):
    with mock.patch("stackchan_mcp.wake_spotter.WakeSpotter.load", return_value=spotter):
        e = ears_mod.Ears(types.SimpleNamespace(esp32=None))
    e.gate = gate and spotter is not None
    return e


class Spotter:
    def __init__(self, heard=False):
        self.heard = heard

    def heard_within(self, seconds):
        return self.heard


class Gate(unittest.TestCase):
    def test_idle_room_talk_is_not_transcribed(self):
        e = make_ears(Spotter(heard=False))
        self.assertFalse(e._wanted(3.0))

    def test_the_wake_phrase_earns_a_transcription(self):
        e = make_ears(Spotter(heard=True))
        self.assertTrue(e._wanted(3.0))

    def test_during_a_conversation_everything_is_heard(self):
        e = make_ears(Spotter(heard=False))
        state = e.attention(12)
        self.assertTrue(e._wanted(3.0))
        self.assertGreater(state["attentive_for_s"], 10)
        e.attention_until = time.monotonic() - 1     # the window has passed
        self.assertFalse(e._wanted(3.0))

    def test_without_a_spotter_model_nothing_changes(self):
        e = make_ears(None)
        self.assertFalse(e.gate)                     # the gate cannot be on without a spotter


if __name__ == "__main__":
    unittest.main()
