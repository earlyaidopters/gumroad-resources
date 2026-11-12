"""Cut a reply that is still being written into pieces that can be spoken.

The agent's text arrives a few characters at a time. Waiting for the whole
reply before speaking adds seconds of silence, so each sentence is handed
to the voice as soon as it ends.
"""

from __future__ import annotations

import re

# A sentence ends at . ! or ? (plus any closing quote or bracket) followed by
# whitespace. "3.5" and "example.com" have no whitespace, so they stay whole.
_END = re.compile(r"[.!?]+[\"')\]]*(?=\s)")
# Words whose trailing period is not the end of a sentence.
_ABBREVIATION = re.compile(r"(?i)(?:\b(?:mr|mrs|ms|dr|st|vs|etc|approx|e\.g|i\.e|a\.m|p\.m)|\b[a-z])\.$")
IGNORE = re.compile(r"\W*\(?ignore\)?\W*", re.I)


class SentenceChunker:
    def __init__(self) -> None:
        self.buf = ""

    def feed(self, text: str) -> list[str]:
        """Add streamed text; return the sentences it completed."""
        self.buf += text
        out: list[str] = []
        pos = 0
        while True:
            m = _END.search(self.buf, pos)
            if m is None:
                break
            piece = self.buf[: m.end()]
            if _ABBREVIATION.search(piece) or not re.search(r"[A-Za-z0-9]", piece):
                pos = m.end()  # "Dr." or a lone emoji: keep reading
                continue
            out.append(piece.strip())
            self.buf = self.buf[m.end():]
            pos = 0
        return out

    def flush(self) -> list[str]:
        """The reply (or the text before a tool call) is complete."""
        rest, self.buf = self.buf.strip(), ""
        return [rest] if rest else []
