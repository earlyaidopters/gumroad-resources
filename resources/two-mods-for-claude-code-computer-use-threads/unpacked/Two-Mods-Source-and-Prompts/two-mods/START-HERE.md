# Start here

You have the two mods from the video, the local computer-use bridge, the complete build prompts, and demo prompts.

1. **Understand the result:** open README.md. For a visual prompt breakdown, visit https://two-mods-build-prompts.markkashef.chatgpt.site/.
2. **Check your setup:** read docs/INSTALL.md. Run `python3 scripts/setup.py` from this folder. It does not install anything without `--apply`.
3. **Try one small task:** after installation, open a new Claude Code chat and use prompts/computer-use-demo.txt or prompts/threads-demo.txt.
4. **Make it yours:** use prompts/computer-use-build.txt or prompts/threads-build.txt. Give Claude a specific change and ask it to test each step.

Read-only, no-install route: docs/HOW-IT-WORKS.md + the two build prompts.

You need a compatible mod-enabled Claude Code runtime. Computer Use also needs a Mac with Codex computer use already set up. The proprietary runtime, accounts and subscriptions are not bundled.

Computer Use starts with app approval enabled. Threads keeps the filmed bypass-permissions default; use `/threads mode default` before starting helpers if you want the normal permission prompts. See docs/PRIVACY.md.

The source is the working 0.5.0 computer-use mod and 0.5.3 Threads snapshot, with documented packaging changes. Read docs/VERIFICATION.md for exactly what was tested.
