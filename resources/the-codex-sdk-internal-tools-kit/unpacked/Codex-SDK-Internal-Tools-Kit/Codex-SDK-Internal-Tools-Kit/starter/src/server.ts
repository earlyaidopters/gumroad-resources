import "dotenv/config";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { ZodError } from "zod";
import { createBackend } from "./backends/index.js";
import { loadConfig } from "./config.js";
import { parseTaskRequest } from "./types.js";

const config = loadConfig();
const backend = createBackend(config);
const publicDirectory = path.resolve(process.cwd(), "public");
const bodyLimitBytes = 64 * 1024;
let activeJobs = 0;

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  if (!(request.headers["content-type"] ?? "").startsWith("application/json")) {
    throw new TypeError("Send JSON with Content-Type: application/json.");
  }

  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > bodyLimitBytes) throw new RangeError("The request is too large.");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requestIsSameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  return origin === `http://${config.host}:${config.port}`;
}

async function runTask(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!requestIsSameOrigin(request)) {
    sendJson(response, 403, { error: "Cross-origin requests are not allowed." });
    return;
  }
  if (activeJobs >= config.maxConcurrentJobs) {
    sendJson(response, 429, { error: "The local worker is busy. Try again shortly." });
    return;
  }

  activeJobs += 1;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.jobTimeoutMs);
  timer.unref();

  try {
    const task = parseTaskRequest(await readJson(request));
    const result = await backend.runTask(task, { signal: controller.signal });
    console.info(JSON.stringify({
      event: "job.completed",
      backend: result.backend,
      inputBytes: Buffer.byteLength(task.input),
    }));
    sendJson(response, 200, result);
  } catch (error) {
    const status = error instanceof ZodError || error instanceof SyntaxError || error instanceof TypeError
      ? 400
      : error instanceof RangeError
        ? 413
        : controller.signal.aborted
          ? 504
          : 500;
    const message = controller.signal.aborted
      ? "The job timed out. Shorten the input or try again."
      : error instanceof ZodError
        ? "Check the task type and input length."
        : error instanceof Error && /auth|login|credential/i.test(error.message)
          ? "Codex is not signed in. Run `codex login`, choose ChatGPT sign-in, then retry."
          : status < 500 && error instanceof Error
            ? error.message
            : "The local worker could not finish this job.";
    console.error(JSON.stringify({ event: "job.failed", backend: backend.name, status }));
    sendJson(response, status, { error: message });
  } finally {
    clearTimeout(timer);
    activeJobs -= 1;
  }
}

async function serveStatic(requestPath: string, response: ServerResponse): Promise<void> {
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const requested = path.resolve(publicDirectory, relative);
  if (!requested.startsWith(`${publicDirectory}${path.sep}`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const info = await stat(requested);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "content-type": contentTypes[path.extname(requested)] ?? "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
    });
    createReadStream(requested).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${config.host}:${config.port}`);
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, backend: backend.name });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/run") {
    await runTask(request, response);
    return;
  }
  if (request.method === "GET") {
    await serveStatic(url.pathname, response);
    return;
  }
  response.writeHead(405, { allow: "GET, POST" }).end();
});

server.listen(config.port, config.host, () => {
  console.info(`Switchboard is ready at http://${config.host}:${config.port}`);
  console.info(`AI backend: ${backend.name}`);
});
