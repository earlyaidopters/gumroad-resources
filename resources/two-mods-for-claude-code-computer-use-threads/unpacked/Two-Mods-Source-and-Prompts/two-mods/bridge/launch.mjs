// Launches Codex's computer-use MCP server (cua_repl) from the newest cached
// unified-computer-use plugin, to avoid pinning registration to an old folder; compatibility can still change.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const root = join(homedir(), '.codex/plugins/cache/openai-bundled/unified-computer-use');
const cmp = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
};
const versions = existsSync(root)
  ? readdirSync(root).filter(v => existsSync(join(root, v, '.mcp.json'))).sort(cmp)
  : [];
if (!versions.length) {
  process.stderr.write(`codex-cu: no unified-computer-use plugin found in ${root}. Open the ChatGPT/Codex app once.\n`);
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(join(root, versions.at(-1), '.mcp.json'), 'utf8')).mcpServers.cua_repl;
const child = spawn(cfg.command, cfg.args || [], {
  stdio: 'inherit',
  env: { ...process.env, ...(cfg.env || {}) },
});
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, sig) => process.exit(sig ? 1 : code ?? 0));
