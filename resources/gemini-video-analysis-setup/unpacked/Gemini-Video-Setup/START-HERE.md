# Gemini video analysis setup

Turn a recording into a list of moments you can check. Start with one public or approved sample, ask one concrete question, then open the returned timestamps yourself.

Prepared September 27, 2026. This is a setup and prompt kit based on Google's documentation. We have not run an end-to-end model test of this kit.

## Set it up with your coding assistant

Paste the following into Codex or Claude Code. Your assistant will build a small local tool. Google account access and model usage may carry charges; choose your budget before the first request.

> Build a local Gemini video-analysis tool using the current official Python SDK and documentation at https://ai.google.dev/gemini-api/docs/video-understanding . Use Gemini 3.8 Flash if available to my account. Set processing to agentic explicitly on the video input in the Interactions request. Keep the API key in a private environment variable and exclude credentials from version control. Accept one local video or a public YouTube URL and a prompt file. For uploads, wait for ACTIVE, stop on FAILED, and enforce a timeout. Save the answer and returned usage metadata locally. Include an option to run static processing on the same input and prompt for comparison. Do not run a paid request until I choose a sample and budget. Show the exact request configuration before running. Add clear setup, run and cleanup instructions. If the installed SDK or account does not support this mode, report that rather than silently substituting another mode.

The API is Google's connection for applications to call Gemini. Agentic processing lets Gemini inspect parts of a video as needed. Static processing is the default, so attaching a video alone does not establish that agentic mode is running. [Official setup documentation](https://ai.google.dev/gemini-api/docs/video-understanding).

## Choose one job

Use a prompt from PROMPTS.md. Begin with material you know well enough to catch mistakes. Choose three moments in advance and write down their timestamps as your answer key.

For each result, check the timestamp, the claimed event and any quotation. Label errors in comparison.csv. Keep unsupported conclusions out of anything you send to a customer or team.

## Compare before expanding

Run the same question and recording once in each mode. Record elapsed time, reported usage, missing moments and review time. Keep model, prompt and input constant. Use current account pricing to calculate cost; token counts alone do not establish a dollar saving.

Google reports benchmark improvements of up to 88% fewer tokens and up to 7% better accuracy. These are vendor results, not measurements of your recordings or this kit. [Google's announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-agentic-video-in-gemini/).

A run passes your first check when all three known moments are found, their timestamps are useful, and no quoted words are invented. If it misses an important event, narrow the question and inspect that interval yourself. Keep the more reliable workflow for your material, even if its usage is higher.

Use recordings you have permission to process. For customer calls, check your organization's data rules before uploading. Store results locally and delete uploaded test files when you finish, following the tool's cleanup instructions.
