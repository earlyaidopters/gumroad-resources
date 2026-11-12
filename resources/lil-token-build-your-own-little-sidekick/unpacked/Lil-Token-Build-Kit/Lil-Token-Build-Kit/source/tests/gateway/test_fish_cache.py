"""The Fish Audio engine's disk cache for short lines.

No network: the HTTP layer is an httpx.MockTransport and the MP3 decoder is
replaced, the same way upstream tests the ElevenLabs engine.
"""

import array
import os
import tempfile
import unittest
from unittest import mock

import httpx

from stackchan_mcp.tts import fish_audio as fish

PCM = array.array("h", [(i % 100) - 50 for i in range(480)]).tobytes()


class FishCache(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        env = {k: v for k, v in os.environ.items() if not k.startswith(("STACKCHAN_FISH", "FISH_AUDIO"))}
        env.update({"FISH_AUDIO_API_KEY": "test-key", "STACKCHAN_FISH_VOICE_OWNER": "a" * 32,
                    "STACKCHAN_FISH_VOICE_OTHER": "b" * 32, "STACKCHAN_FISH_CACHE_DIR": self.dir.name})
        patcher = mock.patch.dict(os.environ, env, clear=True)
        patcher.start()
        self.addCleanup(patcher.stop)
        decode = mock.patch.object(fish, "_decode_mp3_to_pcm16_mono", lambda mp3: (16000, PCM))
        decode.start()
        self.addCleanup(decode.stop)
        self.requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            self.requests.append(request)
            return httpx.Response(200, content=b"ID3fake-mp3")

        self.engine = fish.FishAudioEngine(transport=httpx.MockTransport(handler))

    async def test_second_time_plays_from_disk(self):
        first = await self.engine.synthesize("What's up?", speaker_name="owner")
        second = await self.engine.synthesize("What's up?", speaker_name="owner")
        self.assertEqual(first, PCM)
        self.assertEqual(second, PCM)
        self.assertEqual(len(self.requests), 1)

    async def test_long_lines_are_never_cached(self):
        line = "This is a long answer about your calendar that will not be said the same way twice."
        await self.engine.synthesize(line, speaker_name="owner")
        await self.engine.synthesize(line, speaker_name="owner")
        self.assertEqual(len(self.requests), 2)
        self.assertEqual(os.listdir(self.dir.name), [])

    async def test_another_voice_is_not_served_the_cached_line(self):
        await self.engine.synthesize("Yeah?", speaker_name="owner")
        await self.engine.synthesize("Yeah?", speaker_name="other")
        self.assertEqual(len(self.requests), 2)

    async def test_zero_turns_the_cache_off(self):
        with mock.patch.dict(os.environ, {"STACKCHAN_FISH_CACHE_MAX_CHARS": "0"}):
            await self.engine.synthesize("Yeah?", speaker_name="owner")
            await self.engine.synthesize("Yeah?", speaker_name="owner")
        self.assertEqual(len(self.requests), 2)

    async def test_oldest_lines_are_dropped_past_the_limit(self):
        with mock.patch.dict(os.environ, {"STACKCHAN_FISH_CACHE_MAX_FILES": "2"}):
            for i, line in enumerate(("One.", "Two.", "Three.")):
                await self.engine.synthesize(line, speaker_name="owner")
                for name in os.listdir(self.dir.name):  # make the ages distinct
                    path = os.path.join(self.dir.name, name)
                    os.utime(path, (os.stat(path).st_mtime - 10, os.stat(path).st_mtime - 10))
        self.assertEqual(len(os.listdir(self.dir.name)), 2)

    async def test_stream_asks_for_raw_audio_at_the_device_rate(self):
        import json

        chunks = [c async for c in self.engine.synthesize_stream("A sentence that is too long for the cache, spoken as a stream.", speaker_name="owner")]
        self.assertEqual(b"".join(chunks), b"ID3fake-mp3")   # passed through untouched, no decoder
        body = json.loads(self.requests[0].content)
        self.assertEqual((body["format"], body["sample_rate"], body["latency"]), ("pcm", 16000, "balanced"))
        self.assertEqual(body["reference_id"], "a" * 32)

    async def test_stream_fills_and_uses_the_same_cache(self):
        first = [c async for c in self.engine.synthesize_stream("What's up?", speaker_name="owner")]
        second = [c async for c in self.engine.synthesize_stream("What's up?", speaker_name="owner")]
        self.assertEqual(len(self.requests), 1)
        self.assertEqual(b"".join(first)[:10], b"".join(second)[:10])

    async def test_stream_reports_an_api_error(self):
        engine = fish.FishAudioEngine(transport=httpx.MockTransport(lambda r: httpx.Response(402, content=b"no credit")))
        with self.assertRaises(RuntimeError):
            [c async for c in engine.synthesize_stream("This line is long enough that it will never be cached at all.", speaker_name="owner")]

    async def test_an_unwritable_cache_never_breaks_speech(self):
        with mock.patch.dict(os.environ, {"STACKCHAN_FISH_CACHE_DIR": "/dev/null/nope"}):
            self.assertEqual(await self.engine.synthesize("Yeah?", speaker_name="owner"), PCM)


if __name__ == "__main__":
    unittest.main()
