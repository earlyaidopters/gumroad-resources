# Sources and Version Notes

Checked September 26, 2026. This kit is an independent practical adaptation of Mark Kashef's recorded workflow. Preferences and observed examples are not vendor guarantees or controlled comparisons.

- [OpenAI's Codex plugin for Claude Code](https://github.com/openai/codex-plugin-cc): optional connection and review commands. Reference snapshot: commit `db52e28f4d9ded852ab3942cea316258ae4ef346` ([pinned README](https://github.com/openai/codex-plugin-cc/blob/db52e28f4d9ded852ab3942cea316258ae4ef346/README.md)). The plugin is not bundled here.
- [Codex skills](https://developers.openai.com/codex/skills/): discovery and project-local skill placement.
- [Codex noninteractive mode](https://developers.openai.com/codex/noninteractive/): scripted execution and review setup.
- [Claude Code skills](https://code.claude.com/docs/en/skills): skill structure, discovery, reload, and precedence.
- [Codex goals](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex): goal-oriented work. Availability and limits depend on the environment.
- [Claude Code goals](https://code.claude.com/docs/en/goal): consult current documentation for that client's behavior.

Local command syntax was inspected with Codex CLI 0.157.0 and Claude Code 2.1.280. This is a syntax/documentation check, not a claim that every workflow was executed end to end on those versions.

The recorded video names Claude Opus 5.5 and GPT-6 Astra. This kit preserves those labels as context, while keeping installation and prompts configurable. It makes no model benchmark, price, runtime, or universal tool-availability guarantee.

## Build Provenance

September 26, 2026: Codex authored the public-safe text, prompt adaptations, two rewritten skills, installer, synthetic example, tests, and PDF layout for Prompt Advisers. Mark supplied the recorded teaching workflow and approved resource scope. Private skill bodies, real client projects, transcripts, and session history are not included.
