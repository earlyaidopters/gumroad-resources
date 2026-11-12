"""Call one Lil Token gateway tool from the shell.

Usage: tok.py <tool> '<json args>'   e.g. tok.py set_volume '{"volume": 90}'
Uses the always-on gateway at http://127.0.0.1:8767/mcp and STACKCHAN_TOKEN from the project-local .env.
"""
import asyncio, json, pathlib, os, sys
from dotenv import dotenv_values

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

env = dotenv_values(pathlib.Path(__file__).with_name('.env'), interpolate=False)
token = env.get('STACKCHAN_TOKEN') or os.environ.get('STACKCHAN_TOKEN')
if not token:
    raise SystemExit('Configure your own STACKCHAN_TOKEN first.')



async def main(tool: str, args: dict) -> None:
    async with streamablehttp_client(
        "http://127.0.0.1:8767/mcp", headers={"Authorization": f"Bearer {token}"}
    ) as (r, w, _):
        async with ClientSession(r, w) as s:
            await s.initialize()
            res = await s.call_tool(tool, args)
            print("".join(getattr(c, "text", "") for c in res.content))


asyncio.run(main(sys.argv[1], json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}))
