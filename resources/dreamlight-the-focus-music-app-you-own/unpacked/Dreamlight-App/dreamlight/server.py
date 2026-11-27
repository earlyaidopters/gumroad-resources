#!/usr/bin/env python3
"""
Local static + Range-streaming server for Dreamlight (`web/`).

Serves web/index.html, web/tracks.json, covers, animated loops, and local audio
files with HTTP Range (206 Partial Content) support for instant seeking across
1-hour sessions. Also exposes /api/tracks backed by web/tracks.json.
"""

from __future__ import annotations

import json
import mimetypes
import re
import sys
import urllib.parse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
WEB_DIR = ROOT_DIR / "web"

mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("audio/mpeg", ".mp3")


class DreamlightHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def _serve_file_with_range(self, filepath: Path, content_type: str):
        if not filepath.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return

        file_size = filepath.stat().st_size
        range_header = self.headers.get("Range")
        start = 0
        end = file_size - 1
        status = HTTPStatus.OK

        if range_header:
            m = re.match(r"bytes=(\d*)-(\d*)", range_header.strip())
            if m:
                g_start, g_end = m.groups()
                if g_start:
                    start = int(g_start)
                if g_end:
                    end = min(int(g_end), file_size - 1)
                elif not g_start and g_end:
                    start = max(0, file_size - int(g_end))
                if start >= file_size or start > end:
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self.send_header("Content-Range", f"bytes */{file_size}")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                status = HTTPStatus.PARTIAL_CONTENT

        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        self.send_header("Access-Control-Allow-Origin", "*")
        if status == HTTPStatus.PARTIAL_CONTENT:
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.end_headers()

        if self.command == "HEAD":
            return

        chunk_size = 256 * 1024
        try:
            with open(filepath, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    data = f.read(min(chunk_size, remaining))
                    if not data:
                        break
                    self.wfile.write(data)
                    remaining -= len(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        raw_path = urllib.parse.unquote(parsed.path)

        if raw_path in ("/", "/index.html"):
            self._serve_file_with_range(WEB_DIR / "index.html", "text/html; charset=utf-8")
            return

        if raw_path == "/api/tracks":
            tracks_path = WEB_DIR / "tracks.json"
            if tracks_path.is_file():
                raw = tracks_path.read_bytes()
            else:
                raw = json.dumps({"tracks": []}).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(raw)
            return

        rel = raw_path.lstrip("/")
        candidate = (WEB_DIR / rel).resolve()
        try:
            candidate.relative_to(WEB_DIR.resolve())
        except ValueError:
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return

        if not candidate.is_file() or any(part.startswith(".") for part in Path(rel).parts):
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        ctype, _ = mimetypes.guess_type(str(candidate))
        if not ctype:
            ctype = "application/octet-stream"
        elif ctype.startswith("text/") or ctype in ("application/json", "application/manifest+json"):
            ctype += "; charset=utf-8"
        self._serve_file_with_range(candidate, ctype)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    host = "127.0.0.1"
    server = ThreadingHTTPServer((host, port), DreamlightHandler)
    print(f"Dreamlight Focus Studio running at http://localhost:{port} (serving {WEB_DIR})", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
