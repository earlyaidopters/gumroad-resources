"""Filming capture in the Fish Audio engine: while the flag file exists, every
line skips the cache, is fetched as a full-quality MP3 and saved with its text,
and the robot plays that same take. No network, as in test_fish_cache.py.
"""

import array
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import httpx

from stackchan_mcp.tts import fish_audio as fish

PCM = array.array("h", [(i % 100) - 50 for i in range(480)]).tobytes()


class FishSave(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        root = Path(self.dir.name)
        self.flag, self.out, self.cache = root / "save_voice", root / "takes", root / "cache"
        env = {k: v for k, v in os.environ.items() if not k.startswith(("STACKCHAN_FISH", "FISH_AUDIO"))}
        env.update({"FISH_AUDIO_API_KEY": "test-key", "STACKCHAN_FISH_VOICE_OWNER": "a" * 32,
                    "STACKCHAN_FISH_CACHE_DIR": str(self.cache), "STACKCHAN_FISH_SAVE_FLAG": str(self.flag)})
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

    def takes(self):
        return sorted(p.name for p in self.out.glob("*.mp3")) if self.out.exists() else []

    async def test_off_by_default_nothing_saved(self):
        await self.engine.synthesize("What's up?", speaker_name="owner")
        self.assertEqual(self.takes(), [])

    async def test_on_saves_the_mp3_and_its_text(self):
        self.flag.write_text(str(self.out))
        await self.engine.synthesize("[dizzy, protesting] Hey! Easy, I'm getting dizzy.", speaker_name="owner")
        names = self.takes()
        self.assertEqual(len(names), 1)
        self.assertTrue(names[0].endswith("-hey-easy-i-m-getting-dizzy.mp3"), names[0])
        self.assertEqual((self.out / names[0]).read_bytes(), b"ID3fake-mp3")
        row = json.loads((self.out / "index.jsonl").read_text().splitlines()[0])
        self.assertEqual(row["text"], "[dizzy, protesting] Hey! Easy, I'm getting dizzy.")
        self.assertEqual(json.loads(self.requests[0].content)["format"], "mp3")

    async def test_on_skips_the_cache_so_every_take_is_fresh(self):
        await self.engine.synthesize("Smooth landing.", speaker_name="owner")  # cached while off
        self.flag.write_text(str(self.out))
        await self.engine.synthesize("Smooth landing.", speaker_name="owner")
        self.assertEqual(len(self.requests), 2)
        self.assertEqual(len(self.takes()), 1)

    async def test_stream_plays_the_saved_take(self):
        self.flag.write_text(str(self.out))
        chunks = [c async for c in self.engine.synthesize_stream("Yo, look who's back.", speaker_name="owner")]
        self.assertEqual(b"".join(chunks), PCM)
        self.assertEqual(len(self.takes()), 1)
        self.assertEqual(json.loads(self.requests[0].content)["format"], "mp3")

    async def test_removing_the_flag_turns_it_off_live(self):
        self.flag.write_text(str(self.out))
        await self.engine.synthesize("Ah. Culture.", speaker_name="owner")
        self.flag.unlink()
        await self.engine.synthesize("Turn it up!", speaker_name="owner")
        self.assertEqual(len(self.takes()), 1)


if __name__ == "__main__":
    unittest.main()
