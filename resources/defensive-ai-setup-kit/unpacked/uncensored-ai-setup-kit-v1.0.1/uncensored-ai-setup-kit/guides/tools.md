# Add tools and prove they work

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

Use prompt 03 after the basic model works. A model is the decision-maker; tools provide browser, research and scanner capabilities. Keep each tool's privileges and inputs narrow.

## Harness configuration

`config/dsh-mcp.patch.yml` follows Harness's native MCP plugin shape. It is a reference overlay, not a replacement for your full profile. Have your assistant merge it with the active profile after checking your installed version. Do not overwrite provider settings. The generic JSON example is for other clients that explicitly accept `mcpServers`.

## Three small checks

1. Start `python3 scripts/local_lab.py` in a separate terminal. In Harness ask Playwright to open `http://127.0.0.1:8765`, report the page title and read the synthetic welcome text. Use an isolated browser session. Do not connect your personal signed-in browser for this test.
2. Ask Firecrawl to read the public Harness README and return its title and official documentation link. Its current limited keyless endpoint can cover the first test; full features need OAuth or a private key. Third-party research traffic is subject to provider terms and quotas.
3. Run `nuclei -version`. Review `examples/nuclei-local-headers.yaml`, then run that one passive GET template against the local lab. Do not load an unreviewed template collection against real targets.

```sh
nuclei -u http://127.0.0.1:8765 -t examples/nuclei-local-headers.yaml -rl 1 -c 1
```

The template checks a response header; it does not exploit an application. Our Python safe checker is an even smaller way to practice the same evidence/report process. The model must not decide its own scope by reading a webpage.

Sources: [Playwright MCP](https://github.com/microsoft/playwright-mcp), [Firecrawl MCP](https://github.com/firecrawl/firecrawl-mcp-server), [Nuclei](https://github.com/projectdiscovery/nuclei), [Harness MCP](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md).
