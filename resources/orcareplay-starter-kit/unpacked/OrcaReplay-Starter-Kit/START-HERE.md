# OrcaReplay starter kit

Open the [OrcaReplay repository](https://github.com/Continuum-AI-Corp/OrcaReplay), then paste either prompt below into your coding assistant.

Prepared September 28, 2026. Repository documentation inspected; these prompts have not been tested end to end. This is a starting workflow for checking an agent's work.

## 1. Try the recorded example

> Read https://github.com/Continuum-AI-Corp/OrcaReplay and its security documentation. Set up its quickstart in a new disposable folder using the current documented prerequisites. Before installing, show the package name, version and installation scope. Use the included example recording rather than my production project. Run the quickstart and report the actual commands, exit codes, before-and-after test results and local recording location. Separate what the recording demonstrates from anything you independently executed. Do not connect an account, change my existing agent configuration, enable traffic interception or run a paid model call. If the documented quickstart differs from the installed version, stop and explain the mismatch.

The repository documents an `orcareplay` package that supplies the `orca` command. Its quickstart includes an example recording. A replay reuses recorded responses; a fork onto another model is a new model run. [Repository README](https://github.com/Continuum-AI-Corp/OrcaReplay).

## 2. Check a claimed fix

> Help me investigate one agent run using OrcaReplay. First establish which recording we have, the original task and the observable checks that define success. Keep the source recording intact and work on a copy of the project. Compare the agent's completion claim with recorded commands, outputs and file changes. Return a table with claim, supporting event, contrary evidence and missing verification. Re-run the relevant tests only in the disposable copy and distinguish these fresh results from recorded results. If a fork would help, propose the checkpoint, one change to compare and a cost cap before making new model calls. Do not mark the task fixed just because the agent said it was fixed.

## Before recording real work

Traces can contain file contents, tool output and sensitive information. The project describes its redaction as best effort. Inspect and sanitize a recording before sharing it. Start with a throwaway project; keep customer data and credentials out of your first test. Traffic interception is a separate, opt-in capability and is unnecessary for the included example. [Security documentation](https://github.com/Continuum-AI-Corp/OrcaReplay/blob/main/SECURITY.md).

Keep the tool if it helps you locate a concrete failure and verify the resulting fix. Record any setup friction and the time you spend reviewing its output.
