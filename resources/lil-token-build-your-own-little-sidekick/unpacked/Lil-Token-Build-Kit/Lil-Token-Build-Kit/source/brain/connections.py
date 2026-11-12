"""Other apps for Lil Token, through Composio.

One Composio session gives the agent a single MCP endpoint that can find and
run tools in the apps the owner has connected (Notion, Slack, GitHub, Sheets and
so on). The same pattern as Gratis: create a session, hand its MCP URL and
headers to the agent.

Lil Token's standing rule is that nothing can send, post, refund or buy
unless the owner asked. Two layers keep that true here:

1. On Composio's side. The session is created with every tool that deletes
   switched off, the sandbox off and raw proxy calls off. In the default
   "read" mode the tools that create or update are switched off too, so the
   agent cannot see or call them at all.
2. On this side. `writes_in()` names the app tools in a call that are not
   plainly reads, and the agent's gate (agent.py) refuses them unless the owner's
   own words asked.

Switches (environment):
  COMPOSIO_API_KEY            a project key (ak_...), read from the project-local .env by
                              run-brain.sh.
  COMPOSIO_USER_API_KEY       or, the way Gratis does it for an account with
  COMPOSIO_ORG_ID             no project key: the signed-in user's key,
  COMPOSIO_PROJECT_ID         scoped to one organization and one project.
  LILTOKEN_COMPOSIO           off | read (default) | ask
                              ask = creating and updating allowed, but only
                              when the owner asked in what he just said.
  LILTOKEN_COMPOSIO_TOOLKITS  comma list of app slugs to limit it to, for
                              example "notion,slack,github". Empty = any app
                              the owner has connected.
  LILTOKEN_COMPOSIO_USER      the Composio user id connections hang off.
"""

import hashlib
import json
import logging
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse

log = logging.getLogger("liltoken.connections")

SERVER = "composio"
STATE = Path(__file__).parent / "state" / "composio.json"
LOGIN_FILE = Path.home() / ".composio" / "user_data.json"
USER_ID = os.environ.get("LILTOKEN_COMPOSIO_USER", "lil-token")
MODE = os.environ.get("LILTOKEN_COMPOSIO", "off").strip().lower()
TOOLKITS = [t.strip().lower() for t in os.environ.get("LILTOKEN_COMPOSIO_TOOLKITS", "").split(",") if t.strip()]

# A tool slug that is plainly a read, for example GITHUB_LIST_ISSUES.
READ_SLUG = re.compile(r"(?:^|_)(GET|LIST|FETCH|SEARCH|FIND|READ|RETRIEVE|QUERY|LOOKUP|VIEW|CHECK|COUNT|DESCRIBE)(?:_|$)")
# Composio's own helper that runs app tools. Every other COMPOSIO_ helper
# only searches, describes or reports connection status.
EXECUTE = re.compile(r"EXECUTE")
SLUG = re.compile(r"^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$")


def credential() -> dict | None:
    """How to sign in to Composio, as arguments for its client, or None.
    A project key wins. Otherwise a user key needs its org and project, so
    it can only ever reach that one project (never a user key on its own)."""
    env = {k: os.environ.get(k, "").strip() for k in
           ("COMPOSIO_API_KEY", "COMPOSIO_USER_API_KEY", "COMPOSIO_ORG_ID", "COMPOSIO_PROJECT_ID")}
    if env["COMPOSIO_API_KEY"]:
        return {"api_key": env["COMPOSIO_API_KEY"]}
    if env["COMPOSIO_USER_API_KEY"] and env["COMPOSIO_ORG_ID"] and env["COMPOSIO_PROJECT_ID"]:
        return {"disable_api_key": True, "user_api_key": env["COMPOSIO_USER_API_KEY"],
                "org_id": env["COMPOSIO_ORG_ID"], "project_id": env["COMPOSIO_PROJECT_ID"]}
    return None



def has_key() -> bool:
    return credential() is not None


def enabled() -> bool:
    return MODE in ("read", "ask") and has_key()


def session_kwargs(mode: str | None = None, toolkits: list[str] | None = None) -> dict:
    """What the Composio session is allowed to do."""
    mode = MODE if mode is None else mode
    off = ["destructiveHint"] if mode == "ask" else ["createHint", "updateHint", "destructiveHint"]
    kwargs = {
        "user_id": USER_ID,
        "mcp": True,
        "tags": {"disable": off},
        "sandbox": {"enable": False},   # no remote shell or code runner
        "proxy_execute": False,         # no raw HTTP through a connected account
    }
    chosen = TOOLKITS if toolkits is None else toolkits
    if chosen:
        kwargs["toolkits"] = list(chosen)
    return kwargs


def fingerprint(kwargs: dict) -> str:
    return hashlib.sha256(json.dumps(kwargs, sort_keys=True).encode()).hexdigest()[:16]


def _client():
    from composio import Composio
    return Composio(**(credential() or {}))


def _session(client=None):
    """The stored session when its rules still match, else a new one."""
    client = client or _client()
    kwargs = session_kwargs()
    mark = fingerprint(kwargs)
    try:
        saved = json.loads(STATE.read_text())
    except Exception:
        saved = {}
    if saved.get("fingerprint") == mark and saved.get("session_id"):
        try:
            return client.sessions.use(saved["session_id"], mcp=True)
        except Exception as exc:
            log.info("composio: stored session not reusable (%s), making a new one", type(exc).__name__)
    session = client.sessions.create(**kwargs)
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps({"session_id": session.session_id, "fingerprint": mark, "mode": MODE,
                                 "toolkits": kwargs.get("toolkits", [])}))
    log.info("composio: new session (mode %s, toolkits %s)", MODE, kwargs.get("toolkits") or "any connected")
    return session


def mcp_config(client=None) -> dict | None:
    """The MCP server entry for the agent, or None when Composio is off,
    has no key, or cannot be reached. Blocking: call it from a thread.
    The headers carry the key, so never log the result."""
    if not enabled():
        return None
    try:
        mcp = _session(client).mcp
        return {"type": getattr(mcp, "type", None) or "http", "url": mcp.url, "headers": dict(mcp.headers or {})}
    except Exception as exc:
        log.warning("composio unavailable (%s); carrying on without it", type(exc).__name__)
        return None


def _slugs(value, found: list[str]) -> None:
    if isinstance(value, dict):
        for key, inner in value.items():
            if isinstance(inner, str) and ("slug" in key.lower() or key.lower() in ("tool", "tool_name", "name", "action")):
                if SLUG.match(inner.strip().upper()):
                    found.append(inner.strip().upper())
            else:
                _slugs(inner, found)
    elif isinstance(value, list):
        for inner in value:
            _slugs(inner, found)


def writes_in(tool_name: str, tool_input: dict | None) -> list[str]:
    """The app tools in this call that are not plainly reads. An execute
    call whose tools cannot be named counts as a write (fail closed)."""
    short = tool_name.split("__")[-1].upper()
    if short.startswith("COMPOSIO_"):
        if not EXECUTE.search(short):
            return []
        found: list[str] = []
        _slugs(tool_input or {}, found)
        if not found:
            return ["(unnamed tool)"]
    else:
        found = [short]
    return [slug for slug in found if not READ_SLUG.search(slug)]


def connect_link(app: str, client=None) -> str:
    """Composio's sign-in page for one app. Blocking."""
    slug = re.sub(r"[^a-z0-9_-]", "", app.strip().lower().replace(" ", ""))[:80]
    if not slug:
        raise ValueError("no app named")
    url = _session(client).authorize(slug).redirect_url
    host = (urlparse(url).hostname or "").lower()
    if urlparse(url).scheme != "https" or not (host == "composio.dev" or host.endswith(".composio.dev")):
        raise ValueError("unexpected sign-in address")
    return url


def open_on_mac(url: str) -> None:
    subprocess.run(["/usr/bin/open", url], check=False, timeout=10)
