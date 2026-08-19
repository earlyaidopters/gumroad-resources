const form = document.querySelector("#task-form");
const runButton = document.querySelector("#run");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const output = document.querySelector("#output");
const backendBadge = document.querySelector("#backend");
const copyButton = document.querySelector("#copy");

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    backendBadge.textContent = health.backend === "codex-subscription"
      ? "Private Codex · ChatGPT sign-in"
      : "OpenAI API · usage billed";
  } catch {
    backendBadge.textContent = "Local worker unavailable";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  runButton.disabled = true;
  result.hidden = true;
  status.textContent = "The local bridge accepted the job. The back room is working…";

  const formData = new FormData(form);
  const body = {
    kind: formData.get("kind"),
    input: document.querySelector("#input").value,
    direction: document.querySelector("#direction").value || undefined,
  };

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The job failed.");
    output.textContent = payload.output;
    result.hidden = false;
    status.textContent = `Finished through ${payload.backend}. Review before using it.`;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "The job failed.";
  } finally {
    runButton.disabled = false;
  }
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.textContent || "");
  copyButton.textContent = "Copied";
  setTimeout(() => { copyButton.textContent = "Copy"; }, 1200);
});

loadHealth();

