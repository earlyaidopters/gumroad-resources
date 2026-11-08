# The setup behind the video

## The filmed experiment

The recorded build used the DeepSeek Harness (`0.1.1-rc.2` in the saved run), a Venice-served DeepSeek model (`deepseek-v4-1-flash-1017-uncensored`), and Reverse Engineer Anything (REA) to inspect a local app reference. Codex prepared an isolated workspace and performed independent checks. The run used follow-up review and fixes; it was not a verified one-prompt, one-shot recreation.

The experiment produced a separate **Gratis Venice Test** build. The public repository in this kit is the separately reviewed Gratis core, with its own documented source/assets. We are not distributing the experiment's extracted reference fonts or other original-product assets.

## If you want to explore that tooling

- DeepSeek Harness: https://github.com/deepseek-ai/deepseek-harness
- Official Harness start page: https://www.deepseek.com/harness/en/
- REA: https://github.com/morluto/rea
- Venice model catalog: https://venice.ai/models

Read each project's current installation instructions and license first. Do not install lookalike repositories or reuse someone else's keys. Model IDs, availability and pricing can change. The video settings are a historical record, not a promise that an identical paid service is still offered.

You do not need the experimental model or REA to use the public Gratis source. For normal use, follow `SETUP-GUIDE.md` and connect the provider the app supports.

## Copyable setup request for the separate experiment

```text
I want to explore DeepSeek Harness using a model from my own provider account, in a new isolated workspace. Read the official DeepSeek Harness repository and current provider documentation first. Explain the supported provider configuration and any usage charges. Let me enter credentials personally through the supported setup, never in chat or a tracked file.

Do not modify my existing Claude/Codex settings, overwrite applications or copy private app data. Confirm the configured model identity using a harmless test. Keep a budget and stop at it. Record actual API usage separately from estimates. Start with a simple original app rather than claiming to reproduce a proprietary product exactly.

If REA is needed for software I own or am authorized to inspect, read its official repository and install instructions first. Keep reference-app inspection separate from the new app. Do not copy protected assets or contact a private backend without authorization. Report evidence, tests and incomplete behavior honestly.
```

## What the video does not establish

A low usage estimate in one heavily cached run is not a fixed cost to rebuild an app. Subscription charges, other provider usage, hosting and development time are separate. A model agreeing to a request is not proof it executed it. Photo identification, custom camera firmware and direct-to-server recording were not verified as completed by the recorded comparisons. The provided templates are starting points, not warranties or methods for bypassing provider rules.
