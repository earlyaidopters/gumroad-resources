# Third-party notices and assets

The root MIT license covers the project's own source and original interface artwork. It does not replace dependency licenses or grant rights in other organizations' trademarks.

- **Interface badges and line icons:** original SVG definitions maintained in this repository. No bundled commercial font files, extracted avatar meshes or external animation recordings are included.
- **App icon:** an AI-generated illustration commissioned for this project. Its source PNG and macOS icon are included. It is separate from provider identity marks.
- **Provider identity icons:** Simple Icons SVGs under CC0, used solely to identify Claude and OpenAI connections. See `src/assets/provider-logos.md`. The marks themselves belong to their owners.
- **T3 installer helper:** MIT-licensed upstream helper; its required notice is in `src/assets/T3-LICENSE.txt`. The helper is retained as source for development; this edition does not install a system T3 service through the UI.
- **Semantic encoder:** optional download of `Xenova/all-MiniLM-L6-v2`, revision pinned in `assets/models/manifest.json`, under Apache-2.0. License and attribution are in `licenses/`. Model weights are not in Git.
- **Composio CLI:** optional checksum-verified download of the upstream 0.6.0 release. Its distribution includes its own license. It is not committed to this repository.
- **Runtime dependencies:** Electron, the Claude Agent SDK, Codex SDK, Composio SDK, MCP SDK, Transformers.js, Marked, DOMPurify, Zod and their transitive dependencies keep their upstream licenses. Inspect `package-lock.json` and installed package license files before redistributing a packaged binary.

Sources: [Simple Icons](https://github.com/simple-icons/simple-icons), [T3](https://github.com/pingdotgg/t3code), [semantic encoder](https://huggingface.co/Xenova/all-MiniLM-L6-v2), [Composio CLI release](https://github.com/ComposioHQ/composio/releases/tag/%40composio/cli%400.6.0).
