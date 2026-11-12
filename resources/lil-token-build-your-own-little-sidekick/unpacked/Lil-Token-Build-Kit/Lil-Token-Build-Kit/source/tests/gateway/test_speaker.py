"""The gateway speech queue (speaker.py): order, sessions, errors, the gate.

No robot and no network: the engine is a fake and send_pcm_stream is
replaced by a recorder that drains the audio it is handed.
"""

import asyncio
import types
import unittest
from unittest import mock

from stackchan_mcp import speaker as speaker_mod
from stackchan_mcp.tts import orchestrator
from stackchan_mcp.tts.base import get_registry


class FakeEngine:
    name = "fake"
    supports_emoji_style = False

    def __init__(self):
        self.delays = {}   # text -> seconds before its audio arrives
        self.fail = set()

    async def synthesize_stream(self, text, **opts):
        await asyncio.sleep(self.delays.get(text, 0))
        if text in self.fail:
            raise RuntimeError("engine down")
        for part in (text[: len(text) // 2], text[len(text) // 2:]):
            yield part.encode().ljust(8000, b".")  # two chunks per line, past the pre-roll


class SpeakerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = FakeEngine()
        get_registry().register(self.engine)
        self.gateway = types.SimpleNamespace(esp32=types.SimpleNamespace(device_connected=True))
        self.sessions = []   # one list of spoken text per TTS session
        self.faces = []

        async def fake_stream(gateway, chunks, **kw):
            heard = b""
            async for chunk in chunks:
                heard += chunk
            words = [w.decode() for w in heard.replace(b"\x00", b"").split(b".") if w]
            self.sessions.append(words)
            return {"frame_count": len(heard) // 1920, "duration_ms": len(heard) // 32}

        async def fake_face(gateway, face):
            self.faces.append(face)
            return True, None

        for name, fake in (("send_pcm_stream", fake_stream), ("_try_set_avatar_face", fake_face),
                           ("_try_set_avatar_face_with_tts_lock", fake_face)):
            p = mock.patch.object(orchestrator, name, fake)
            p.start()
            self.addCleanup(p.stop)
        self.speaker = speaker_mod.Speaker(self.gateway)

    def push(self, text):
        return self.speaker.push({"text": text, "voice": "fake"})

    def spoken(self):
        return ["".join(words) for words in self.sessions]

    async def test_lines_play_in_the_order_pushed_even_if_a_later_one_is_ready_first(self):
        self.engine.delays = {"first": 0.15, "second": 0.0}
        self.push("first")
        self.push("second")
        result = await self.speaker.wait(5)
        self.assertTrue(result["done"])
        self.assertEqual(self.spoken(), ["firstsecond"])           # one session, right order
        self.assertEqual([ln["text"] for ln in result["lines"]], ["first", "second"])

    async def test_push_returns_before_anything_is_spoken(self):
        self.engine.delays = {"slow": 0.2}
        out = self.push("slow")
        self.assertEqual(out["queued"], 1)
        self.assertEqual(self.sessions, [])
        await self.speaker.wait(5)
        self.assertEqual(self.spoken(), ["slow"])

    async def test_a_pause_longer_than_the_linger_starts_a_new_session(self):
        self.push("one")
        await self.speaker.wait(5)
        self.push("two")
        await self.speaker.wait(5)
        self.assertEqual(self.spoken(), ["one", "two"])

    async def test_one_failed_line_does_not_silence_the_rest(self):
        self.engine.fail = {"broken"}
        for text in ("before", "broken", "after"):
            self.push(text)
        result = await self.speaker.wait(5)
        self.assertEqual(self.spoken(), ["beforeafter"])
        self.assertEqual([bool(ln.get("error")) for ln in result["lines"]], [False, True, False])

    async def test_speech_waits_for_a_device_command_in_flight(self):
        gate = speaker_mod.device_gate(self.gateway)
        await gate.acquire()                 # e.g. a face-set download
        self.push("hello")
        await asyncio.sleep(0.1)
        self.assertEqual(self.sessions, [])  # synthesised, but not played
        gate.release()
        await self.speaker.wait(5)
        self.assertEqual(self.spoken(), ["hello"])

    async def test_face_emoji_sets_the_face_and_is_not_spoken(self):
        self.push("😄 hi")
        await self.speaker.wait(5)
        self.assertEqual(self.spoken(), ["hi"])
        self.assertIn("happy", self.faces)

    async def test_stop_cuts_speech_and_drops_what_was_queued(self):
        self.engine.delays = {"long": 0.0, "never": 0.3}
        self.push("long")
        self.push("never")
        await asyncio.sleep(0.05)
        self.assertEqual(self.speaker.stop()["stopped"] >= 1, True)
        result = await self.speaker.wait(5)
        self.assertTrue(result["done"])
        self.assertNotIn("never", "".join(self.spoken()))
        self.push("after")                      # it can talk again afterwards
        await self.speaker.wait(5)
        self.assertIn("after", "".join(self.spoken()))

    async def test_empty_text_is_rejected(self):
        with self.assertRaises(ValueError):
            self.push("   ")


if __name__ == "__main__":
    unittest.main()
