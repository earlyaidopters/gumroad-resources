"""Composio (other apps) stays inside Lil Token's rules.

Nothing here talks to Composio: the client is a stub.

Run: brain/.venv/bin/python -m unittest discover -s tests/brain -v
"""

import asyncio
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

os.environ["LILTOKEN_AGENT"] = "0"  # never start a Claude session from a test
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "brain"))

import agent  # noqa: E402
import connections  # noqa: E402


class Mcp:
    type = "http"
    url = "https://backend.composio.dev/tool_router/abc/mcp"
    headers = {"x-api-key": "secret"}


class Session:
    def __init__(self, session_id="s1", link="https://connect.composio.dev/link/abc"):
        self.session_id, self.mcp, self.link = session_id, Mcp(), link

    def authorize(self, slug):
        self.asked = slug
        return mock.Mock(redirect_url=self.link)


class Client:
    def __init__(self, reusable=True, link="https://connect.composio.dev/link/abc"):
        self.created, self.used, self.reusable, self.link = [], [], reusable, link
        self.sessions = self

    def create(self, **kwargs):
        self.created.append(kwargs)
        return Session(f"s{len(self.created)}", self.link)

    def use(self, session_id, mcp=False):
        if not self.reusable:
            raise RuntimeError("gone")
        self.used.append(session_id)
        return Session(session_id, self.link)


class Rules(unittest.TestCase):
    def test_read_mode_switches_off_everything_that_writes(self):
        kw = connections.session_kwargs("read", [])
        self.assertEqual(set(kw["tags"]["disable"]), {"createHint", "updateHint", "destructiveHint"})
        self.assertEqual(kw["sandbox"], {"enable": False})
        self.assertIs(kw["proxy_execute"], False)
        self.assertNotIn("toolkits", kw)

    def test_ask_mode_still_never_deletes(self):
        self.assertEqual(connections.session_kwargs("ask", [])["tags"]["disable"], ["destructiveHint"])

    def test_toolkits_limit_the_session(self):
        self.assertEqual(connections.session_kwargs("read", ["notion", "slack"])["toolkits"], ["notion", "slack"])

    def test_off_without_a_key(self):
        with mock.patch.dict(os.environ, {}, clear=False), mock.patch.object(connections, "LOGIN_FILE", Path("/nonexistent/x.json")):
            os.environ.pop("COMPOSIO_API_KEY", None)
            self.assertFalse(connections.enabled())
            self.assertIsNone(connections.mcp_config(Client()))

    def cred(self, **env):
        clean = {k: v for k, v in os.environ.items() if not k.startswith("COMPOSIO_")}
        with mock.patch.dict(os.environ, {**clean, **env}, clear=True), \
                mock.patch.object(connections, "LOGIN_FILE", Path("/nonexistent/x.json")):
            return connections.credential()

    def test_a_project_key_wins(self):
        self.assertEqual(self.cred(COMPOSIO_API_KEY="ak_x", COMPOSIO_USER_API_KEY="uak_y", COMPOSIO_ORG_ID="o", COMPOSIO_PROJECT_ID="p"),
                         {"api_key": "ak_x"})

    def test_a_user_key_is_scoped_to_one_project(self):
        self.assertEqual(self.cred(COMPOSIO_USER_API_KEY="uak_y", COMPOSIO_ORG_ID="o", COMPOSIO_PROJECT_ID="p"),
                         {"disable_api_key": True, "user_api_key": "uak_y", "org_id": "o", "project_id": "p"})

    def test_a_user_key_alone_is_not_enough(self):
        self.assertIsNone(self.cred(COMPOSIO_USER_API_KEY="uak_y"))
        self.assertIsNone(self.cred(COMPOSIO_USER_API_KEY="uak_y", COMPOSIO_ORG_ID="o"))

    def test_off_when_switched_off(self):
        with mock.patch.dict(os.environ, {"COMPOSIO_API_KEY": "k"}), mock.patch.object(connections, "MODE", "off"):
            self.assertFalse(connections.enabled())


class Writes(unittest.TestCase):
    def test_searching_and_describing_are_reads(self):
        for name in ("mcp__composio__COMPOSIO_SEARCH_TOOLS", "mcp__composio__COMPOSIO_GET_TOOL_SCHEMAS",
                     "mcp__composio__COMPOSIO_MANAGE_CONNECTIONS"):
            self.assertEqual(connections.writes_in(name, {"queries": [{"use_case": "send an email"}]}), [])

    def test_execute_with_only_reads_passes(self):
        call = {"tools": [{"tool_slug": "GITHUB_LIST_ISSUES", "arguments": {}}, {"tool_slug": "NOTION_SEARCH_NOTION_PAGE"}]}
        self.assertEqual(connections.writes_in("mcp__composio__COMPOSIO_MULTI_EXECUTE_TOOL", call), [])

    def test_execute_names_the_writes(self):
        call = {"tools": [{"tool_slug": "GITHUB_LIST_ISSUES"}, {"tool_slug": "SLACK_SEND_MESSAGE"},
                          {"tool_slug": "GMAIL_DELETE_MESSAGE"}]}
        self.assertEqual(connections.writes_in("mcp__composio__COMPOSIO_MULTI_EXECUTE_TOOL", call),
                         ["SLACK_SEND_MESSAGE", "GMAIL_DELETE_MESSAGE"])

    def test_execute_that_names_nothing_counts_as_a_write(self):
        self.assertEqual(connections.writes_in("mcp__composio__COMPOSIO_MULTI_EXECUTE_TOOL", {"payload": "x"}),
                         ["(unnamed tool)"])

    def test_direct_tools(self):
        self.assertEqual(connections.writes_in("mcp__composio__GMAIL_FETCH_EMAILS", {}), [])
        self.assertEqual(connections.writes_in("mcp__composio__NOTION_CREATE_PAGE", {}), ["NOTION_CREATE_PAGE"])


class Sessions(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.patches = [mock.patch.object(connections, "STATE", Path(self.tmp.name) / "state" / "composio.json"),
                        mock.patch.dict(os.environ, {"COMPOSIO_API_KEY": "k"}),
                        mock.patch.object(connections, "MODE", "read")]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in reversed(self.patches):
            p.stop()
        self.tmp.cleanup()

    def test_makes_a_session_then_reuses_it(self):
        client = Client()
        first = connections.mcp_config(client)
        self.assertEqual(first, {"type": "http", "url": Mcp.url, "headers": Mcp.headers})
        self.assertTrue(client.created[0]["mcp"])
        connections.mcp_config(client)
        self.assertEqual(len(client.created), 1)
        self.assertEqual(client.used, ["s1"])

    def test_new_rules_mean_a_new_session(self):
        client = Client()
        connections.mcp_config(client)
        with mock.patch.object(connections, "MODE", "ask"):
            connections.mcp_config(client)
        self.assertEqual(len(client.created), 2)
        self.assertEqual(client.created[1]["tags"]["disable"], ["destructiveHint"])

    def test_a_dead_stored_session_is_replaced(self):
        connections.mcp_config(Client())
        client = Client(reusable=False)
        self.assertIsNotNone(connections.mcp_config(client))
        self.assertEqual(len(client.created), 1)

    def test_composio_down_means_carry_on_without_it(self):
        broken = mock.Mock()
        broken.sessions.create.side_effect = RuntimeError("no network")
        self.assertIsNone(connections.mcp_config(broken))

    def test_connect_link_must_be_composio(self):
        self.assertTrue(connections.connect_link("Notion", Client()).startswith("https://connect.composio.dev/"))
        with self.assertRaises(ValueError):
            connections.connect_link("notion", Client(link="https://evil.example/link"))
        with self.assertRaises(ValueError):
            connections.connect_link("!!!", Client())


class Gate(unittest.TestCase):
    def gate(self, heard, call, mode="ask", last=""):
        a = agent.Agent(mock.Mock())
        a.heard, a.last_answer, a.round = heard, last, {}
        with mock.patch.object(connections, "MODE", mode):
            out = asyncio.run(a._apps_gate({"tool_name": "mcp__composio__COMPOSIO_MULTI_EXECUTE_TOOL", "tool_input": call}, "t1", None))
        return out, a.round

    WRITE = {"tools": [{"tool_slug": "NOTION_CREATE_PAGE"}]}
    READ = {"tools": [{"tool_slug": "NOTION_SEARCH_NOTION_PAGE"}]}

    def test_reads_always_pass(self):
        for mode in ("read", "ask"):
            self.assertEqual(self.gate("what's in my notion", self.READ, mode)[0], {})

    def test_a_write_mark_asked_for_passes_in_ask_mode(self):
        out, rec = self.gate("add a page to my notion called video ideas", self.WRITE)
        self.assertEqual(out, {})
        self.assertEqual(rec["app_writes"], ["NOTION_CREATE_PAGE"])

    def test_a_write_nobody_asked_for_is_refused(self):
        out, rec = self.gate("what's in my notion", self.WRITE)
        self.assertEqual(out["hookSpecificOutput"]["permissionDecision"], "deny")
        self.assertEqual(rec["blocked"], ["apps"])

    def test_yes_to_an_offer_counts(self):
        out, _ = self.gate("yeah go ahead", self.WRITE, last="Want me to create that page in Notion?")
        self.assertEqual(out, {})

    def test_read_mode_refuses_every_write_even_when_asked(self):
        out, _ = self.gate("add a page to my notion", self.WRITE, mode="read")
        self.assertEqual(out["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_connecting_needs_his_words(self):
        self.assertTrue(agent.allowed_write("connect", "connect my notion"))
        self.assertFalse(agent.allowed_write("connect", "what's the weather"))


class Options(unittest.TestCase):
    def test_without_composio_nothing_changes(self):
        a = agent.Agent(mock.Mock())
        opts = a._options()
        self.assertEqual(list(opts.mcp_servers), ["lt"])
        self.assertEqual(len(opts.allowed_tools), 14)
        self.assertNotIn("{apps}", opts.system_prompt)
        self.assertNotIn("Composio", opts.system_prompt)
        self.assertIsNone(opts.hooks)
        self.assertTrue(opts.strict_mcp_config)  # never the Claude account's own connectors

    def test_with_composio_the_gate_is_on(self):
        a = agent.Agent(mock.Mock())
        a.apps = {"type": "http", "url": Mcp.url, "headers": Mcp.headers}
        with mock.patch.object(connections, "MODE", "read"):
            opts = a._options()
        self.assertEqual(set(opts.mcp_servers), {"lt", "composio"})
        self.assertIn("mcp__lt__connect_app", opts.allowed_tools)
        self.assertIn("only READ", opts.system_prompt)
        self.assertEqual(opts.hooks["PreToolUse"][0].matcher, "mcp__composio__.*")


if __name__ == "__main__":
    unittest.main()
