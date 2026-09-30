# Relay Voice: start here

## 1. Get the app
https://github.com/promptadvisers/relay-voice

This is the original combined-workflow app demonstrated in the video, not either separate comparison build. Open the README and follow Start here. You need macOS, Xcode Command Line Tools, Node.js, Python and your own Gemini API key. Firecrawl and Gmail are optional integrations. Source code is included in relay-voice-source.zip as an offline snapshot.

## 2. Explore the walkthrough and prompts
https://relay-voice-build-plan.markkashef.chatgpt.site/resource.html

Use the buttons above the embedded guide to switch between the original app walkthrough, annotated build prompt and Astra vs Sol results. Open full screen is available for each view.

The source zip includes prompts/BUILD-WITH-PHASES.md and prompts/COMPARISON-PROMPT.md. The phased prompt is a reconstructed recipe; the comparison prompt is a portable adaptation of the shared specification. Private paths and account labels have been replaced. Model/tool availability depends on your setup.

## 3. Make a copy and test it
Use GitHub's Use this template button or clone the repository. Follow the README to build, then test dictation in an unsent text field. The app sends speech/context to configured providers; it is not offline transcription. Never upload your keys, recordings or private email content to GitHub.

This is a source release, not a notarized Mac installer. No credentials are included. Provider API usage is separate from this resource.
