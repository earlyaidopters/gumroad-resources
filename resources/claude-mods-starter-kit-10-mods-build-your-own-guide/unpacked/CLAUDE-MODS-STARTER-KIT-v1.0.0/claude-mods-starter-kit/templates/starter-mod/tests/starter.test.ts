import { test, expect } from "claude-code/testing";
test("counts successful reads and excludes failed ones", async ($, on) => {
  on("session.start", ($, e) => ({ cwd: e.cwd }));
  on("command.register", ($, e) => ({ value: { command: e.name } }));
  on("tool.call", ($, e) => e.file_path === "/missing" ? { isError: true, result: "missing", text: "missing" } : { result: {}, text: "ok" });
  await $.session.start({ surface: "terminal", isInteractive: true, cwd: "/work" } as any);
  await $.tool.call({ tool: "Read", file_path: "/file" } as any);
  await $.tool.call({ tool: "Read", file_path: "/missing" } as any);
  const r = await $.command.run({ command: "readcount", args: "", origin: { kind: "composer" }, presentation: { isFullscreen: false, columns: 100 } } as any);
  expect(r.text).toBe("Successful reads observed: 1");
});
