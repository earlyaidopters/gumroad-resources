"""Start the gateway over stdio, wait for Lil Token to connect, then call a few tools."""
import asyncio, json, os, sys
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

LAUNCHER = os.path.expanduser("~/lil-token/run-gateway.sh")

async def main(calls):
    params = StdioServerParameters(command=LAUNCHER, args=[])
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            tools = [t.name for t in (await s.list_tools()).tools]
            print("tools:", len(tools))
            for _ in range(45):
                st = await s.call_tool("get_status", {})
                txt = st.content[0].text
                if '"connected": true' in txt or "'connected': True" in txt or 'connected": true' in txt:
                    break
                await asyncio.sleep(2)
            print("status:", txt[:400])
            for name, args in calls:
                res = await s.call_tool(name, args)
                out = " ".join(getattr(c, "text", f"<{c.type}>") for c in res.content)
                print(f"{name}: {out[:300]}")

calls = json.loads(sys.argv[1]) if len(sys.argv) > 1 else []
asyncio.run(main(calls))
