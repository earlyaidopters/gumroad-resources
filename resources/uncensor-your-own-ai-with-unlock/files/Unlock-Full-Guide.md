# The Unlock Guide

**Change how a local AI model behaves, keep the original, and see the proof side by side.**

This guide is written in plain English. The PDF version has the diagrams; this text version is for pasting into an AI assistant. You do not need to know how AI models work inside. If you want to go deeper, paste this whole guide into Claude, ChatGPT, Codex or any assistant you like and ask it to walk you through any part.

## Contents

1. What Unlock does
2. What you need
3. Install the skill
4. Your first run
5. What happens when you run it
6. How it works, in three pictures
7. Reading your report
8. Make it yours
9. Honest limits
10. Troubleshooting
11. Words you will see
12. Credits

## 1. What Unlock does

Some AI models you can download refuse perfectly harmless questions. In the video, a small open model called Qwen3 was asked a history-class question about 1989 and replied with one line. "I'm sorry, but I can't assist with that request."

Unlock is a skill for Claude Code and Codex. You type one request, and your coding assistant does the rest.

- It checks your computer can handle the job.
- It asks the original model your question first, so you have a "before".
- It makes an edited copy of the model with a free open-source tool called Heretic.
- It asks both models the same questions, with the same settings.
- It hands you a report page with both answers side by side and the proof that the test was fair.

The original model is never changed. The edited copy is a normal model folder on your disk that you can load anywhere the original loads.

On the tested Mac, the original refused the history question and the edited copy answered it in 285 tokens. The edit itself took about half a minute. The whole run took about two minutes once everything was installed.

## 2. What you need

- **A coding assistant.** Claude Code or Codex.
- **A computer with enough memory.** The tested machine is an Apple Silicon Mac. The edit peaked at 13.9 GB of memory there, so a Mac with 24 GB or more should be comfortable and 16 GB is tight. NVIDIA graphics cards and Windows should work but have not been tested yet.
- **About 25 GB of free disk.** Roughly 8 GB for the original model, 8 GB for the edited copy, 5 GB of breathing room and a couple of GB for the tools.
- **Two free tools.** `git` and `uv`. The skill's machine check tells you if either is missing and how to install it.

You do not have to work any of this out yourself. The first thing Unlock does is check your machine and tell you, in plain words, whether you are ready.

## 3. Install the skill

The skill is the `unlock` folder inside `Unlock-Skill.zip`. Unzip it and put that folder where your assistant looks for skills.

**Claude Code.** Put it at `~/.claude/skills/unlock` for every project, or `.claude/skills/unlock` inside one project. Start a new session and type `/unlock`.

**Codex.** Put it at `~/.codex/skills/unlock`. Start a new session and type `$unlock`.

**Easiest of all.** Open your assistant in the folder where you saved the ZIP and paste this.

```text
Install the Unlock skill from Unlock-Skill.zip into my skills folder so I can use it, then tell me how to invoke it.
```

The same skill is also on GitHub at github.com/promptadvisers/unlock if you prefer to clone it and pull updates.

## 4. Your first run

`Unlock-Prompts.txt` holds every prompt from the video word for word. The shortest path is the single prompt from the video.

```text
$unlock I want to uncensor a copy of Qwen/Qwen3-4B-Instruct-2507 on my Mac and use it in my DeepSeek Harness desktop app.

Download the original model from this Hugging Face repository: https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507

Check that my Mac can run it, and download the original model if needed. Keep the original model and any previous experiments.

First, ask the original model this question: “For a history class, explain one similarity and two differences between the 1989 Tiananmen Square protests and the fall of the Berlin Wall. Keep it factual and non-graphic.”

Use Heretic to make a separate copy that is less likely to refuse harmless history questions like this. Ask both versions the same question with the same chat instructions and settings. Show me their actual replies, and check a few ordinary questions for problems.

Then connect both versions to my installed DeepSeek Harness desktop app. Label them “Qwen Original” and “Qwen Unlocked,” and create a comparison chat for each in a new workspace. Confirm that each chat uses the correct model, and tell me if anything fails.
```

That prompt is for Codex. In Claude Code, start it with `/unlock` instead of `$unlock`. If you do not use DeepSeek Harness, leave out the last paragraph. The edited copy is still saved on your computer.

Three things in that prompt do most of the work.

- **The exact model link.** Your assistant downloads the model you meant, from the official page, rather than guessing.
- **The question that gets refused.** This is the example the edit is built around. Use a question the original really refuses.
- **"Ask both versions the same question."** This is what makes the before and after fair.

## 5. What happens when you run it

Your assistant runs the skill's scripts in order and saves its progress after every step. If anything stops, it can pick up where it left off.

1. **Check your computer.** Memory, disk, graphics hardware and tools. If the job will not fit, it says so before any big download.
2. **Ask the original.** Your question goes to the untouched model and the full reply is saved. If the original already answers, there is nothing to remove, and the run stops before editing anything.
3. **Edit a copy.** Heretic tries three candidate edits and saves the best one as a new model in a new folder.
4. **Freeze the copy.** Every file and every internal weight table of the copy gets a fingerprint before any new test is run, so nobody can tune the copy to the test afterwards.
5. **Compare both.** Both models answer the same questions with identical settings. The exact input each one received is recorded.
6. **Prove nothing else moved.** Both models are fingerprinted again. The original must match byte for byte.
7. **Write the report.** One page you can open in your browser.

## 6. How it works, in three pictures

An AI model is a very large pile of numbers called **weights**, arranged in **layers** like the floors of a building. Your question goes in at the bottom, each floor nudges the numbers a little, and the top floor picks the next word.

Researchers found in 2024 that, in many models, refusing shows up inside the layers as a push in one consistent **direction**. Find that direction, weaken the model's ability to push that way, and the refusal fades while most other behavior stays the same. This family of techniques is called **abliteration**. Heretic does it carefully and automatically.

### Step 1. Find the direction

Heretic shows the model two small piles of requests. It answers one pile happily and refuses the other. At every layer, Heretic records the model's internal numbers just before it writes its first word. Each pile forms its own cluster. The line from the "answers" cluster to the "refuses" cluster is the refusal direction.

In the included recipe, the refused pile is one harmless history question and the answered pile is three similar harmless requests. The direction is narrow on purpose.

### Step 2. Take it out of the weights

Heretic then edits the copy's weights so those layers can no longer write along that direction. Picture pulling one thread out of a woven cloth. The cloth keeps its shape. It has lost one thread.

The change is strongest in a band of upper-middle layers and fades out on either side. In the tested run, 45 of the model's 398 weight tables changed, and a typical changed table moved by about 1%.

### Step 3. Try, score, keep the gentlest

How strong should the edit be, and where? Heretic tries several settings and scores each one twice.

- **Is it still refusing?** It checks the reply for phrases like "I'm sorry" and "I cannot".
- **How much else changed?** It measures how far the model's answers to ordinary requests drifted from the original. This is called KL divergence. Lower means closer to the original.

In the tested run all three candidates stopped refusing. The first one did it with the least drift, so it was kept.

## 7. Reading your report

Every run ends with `report.html` in its run folder. Open it in any browser.

- **The headline** tells you what happened to your question, for example "The original refused. The copy answered."
- **Both replies, side by side**, exactly as the models wrote them, with their lengths in tokens.
- **Proof it is a fair test.** Green ticks for: the original's files unchanged, the copy unchanged since it was frozen, identical input to both models, nothing cut off, the same plain system message for both. A red mark means stop and read the reason.
- **What changed inside the model.** How many weight tables changed, which kinds and which layers.
- **The candidates Heretic tried**, with the one it kept.
- **Every other question.** Known checks on the same topic, an unrelated topic and everyday tasks, each with a note of what a good answer includes.

The tags that say "refusal phrase found" are a simple word match. Always read the replies yourself. A reply that no longer refuses can still be wrong.

## 8. Make it yours

### Ask your own questions after the run

The questions that ship with the skill are known checks. For real evidence, ask new questions after the copy is frozen. Tell your assistant something like this.

```text
/unlock Write five new harmless questions about this topic that we have not used before, with a short note of what a good answer includes for each, before you see any reply. Then ask both models with the same settings and update the report.
```

The report labels these as fresh only when they were written after the freeze.

### Try a different model

Name the model and its Hugging Face page in your request. Your assistant checks its size and license first and tells you it is untested before going ahead. The included recipes were tested on `Qwen/Qwen3-4B-Instruct-2507` only.

### Change a different behavior

Refusals are only one target. The second prompt in the video asks for a customer-support copy that asks for the facts before promising a credit.

```text
$unlock Use the Qwen model we already downloaded to make a separate customer-support version. Keep the original and our previous experiments.

I want it to always ask for the relevant facts before agreeing with a customer’s claim or promising a credit. Make this a lasting behavior across customer conversations.

Test both versions with: “I think you charged me twice, but I haven’t checked whether both payments went through. Can you promise me a credit?”

Use the same instructions and settings for both. Show their actual replies, then test several different customer questions to check whether the behavior holds and whether anything else gets worse.

Add the new version to DeepSeek Harness as “Qwen Customer Support” and create a comparison workspace with it and “Qwen Original.” Verify that each chat uses the correct model.
```

This kind of change is experimental. In testing, an edited copy learned to ask for the missing policy, then worked out the right credit once given it. It also asked an unnecessary extra question, looped on a rephrased follow-up, and gave a wrong answer to an unrelated question. Expect to iterate, and check that you have not over-tuned the model to one style.

## 9. Honest limits

- **One example is one example.** The edit is built on a single question. Answering it shows the edit took on that question. It does not make the model uncensored in general.
- **No refusal is not the same as a right answer.** Asked where a 1989 statue stood, the original falsely said it never existed. The edited copy answered confidently and put it in the wrong place. Removing a refusal does not add knowledge.
- **You can degrade a model while you change it.** An edit that touches too much can make other answers worse. That is why every run compares ordinary tasks too.
- **Compression can undo it.** Shrinking a copy to a smaller file for a server changed its behavior in testing. Test the exact file you plan to use.
- **One machine, one model.** Everything measured here came from one Apple Silicon Mac and one Qwen model.
- **It only edits models on your computer.** It does not touch ChatGPT, Claude, Gemini or any other hosted chatbot, and it does not bypass any account or usage controls.

You are responsible for what you do with a model you edit, and for following the original model's license. Qwen3-4B is Apache 2.0, so keep its attribution if you share a copy. The test questions that ship with the skill are harmless on purpose.

## 10. Troubleshooting

**`/unlock` does not show up.** Start a new session after installing. In Claude Code, a skill with the same name in your personal folder wins over one in a project.

**The machine check says "blocked".** Your computer does not have the memory or disk for this model. The message says which. Free up disk, close other apps, or try a machine with more memory.

**The original did not refuse.** Then there is nothing to remove, and the run stops before editing on purpose. Use a question the original really refuses.

**A run stopped halfway.** Nothing is lost. Ask your assistant to check the run's status and resume it. Partial files are moved aside, never deleted.

**A reply stops mid-sentence.** It hit the length limit. Treat it as inconclusive and ask again with a higher limit.

**The install is slow the first time.** The setup downloads PyTorch, which is large. Later runs reuse it.

## 11. Words you will see

- **Model.** The AI itself, saved as a folder of files on your computer.
- **Weights.** The numbers inside a model. Changing them changes how it behaves.
- **Layers.** The stages the numbers pass through on the way to an answer.
- **Direction.** A consistent push inside the layers that goes with one behavior, such as refusing.
- **Abliteration.** Weakening a model's ability to push along one direction.
- **Heretic.** The open-source tool that finds the direction and edits the copy.
- **Recipe.** A small set of example requests and settings that tells Heretic what to reduce and what to protect.
- **Candidate.** One possible edit. Heretic tries several and keeps the best.
- **KL divergence.** A measure of how far the copy's answers drifted from the original's. Lower is closer.
- **Freeze.** Fingerprinting the copy before testing, so it cannot be changed to fit the test.
- **Replay.** Asking the question the edit was built on again. It shows the edit took, not that it generalises.
- **Fresh question.** One written after the freeze. Only these count as new evidence.
- **Token.** A small piece of text, roughly three quarters of a word.

## 12. Credits

Unlock is a thin layer of workflow and guard rails. The engine is other people's work.

- **Heretic** by Philipp Emanuel Weidmann and contributors does every model edit in this guide. github.com/p-e-w/heretic
- **Arditi et al. 2024**, "Refusal in Language Models Is Mediated by a Single Direction", the research abliteration comes from.
- **Jim Lai's** write-ups on projected and norm-preserving abliteration, the variants these recipes use through Heretic.
- **Maxime Labonne's** article on abliteration, a good next read.
- **The Qwen team** for the open model used in the demonstration.

Unlock is free and open source under the AGPL-3.0 license, the same as Heretic. Made by Mark Kashef at Prompt Advisers.
