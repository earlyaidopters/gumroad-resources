// Minimal teaching example. Counter is scoped to this module instance.
export function register(on) {
  let count = 0;
  on("session.start", async ($, e, next) => {
    const result = await next(e);
    count = 0;
    await $.command.register({ name: "readcount", description: "Show successful reads observed by this example" });
    return result;
  });
  on("tool.call", { tool: "Read" }, async ($, e, next) => {
    const result = await next(e);
    if (!result.isError && result.deny === undefined) count += 1;
    return result;
  });
  on("command.run", { command: "readcount" }, async () => ({ text: `Successful reads observed: ${count}` }));
}
