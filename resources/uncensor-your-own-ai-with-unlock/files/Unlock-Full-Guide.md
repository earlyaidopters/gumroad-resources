# The /unlock Guide

**Uncensor your own AI model.** The complete guide to /unlock. Change how a local AI model behaves, keep the original untouched, and see the proof side by side.

For Claude Code and Codex. Built on Heretic. Version 0.2, November 2026.

## Inside this guide

Read it front to back the first time. After that, jump straight to the part you need.

- 1. What /unlock does
- 2. Before you start
- 3. Install the skill
- 4. Your first run
- 5. What happens, stage by stage
- 6. How it works, in three pictures
- 7. Reading your report
- 8. The real results
- 9. Make it yours
- 10. Run it without an assistant
- 11. Honest limits
- 12. Troubleshooting
- 13. Questions people ask
- 14. Words you will see
- 15. Credits and license

**Want to go deeper with your own AI?**

You are reading the plain-text version of the guide. The PDF has the same content with the pictures. Paste it into Claude, ChatGPT, Codex or any assistant and ask it to explain any part, adapt a step to your computer, or help you plan your own experiment.

### What you need to know before reading

Nothing about how AI models work inside. Every technical term is explained the first time it appears, and chapter 14 is a glossary. If you can paste a prompt into Claude Code or Codex, you can do everything in this guide.

Every number in here comes from real runs on a real computer, and the guide says which computer. Where something has not been tested, it says **untested**.

## 1. What /unlock does

You type one request. Your coding assistant checks your computer, makes an edited copy of a model, and shows you both answering the same question.

Some AI models you can download refuse perfectly harmless questions. In the video, a small open model called Qwen3 was asked a history-class question and answered with one line.

Original Qwen3 · 14 tokens

I'm sorry, but I can't assist with that request.

Edited copy · 285 tokens

The 1989 Tiananmen Square protests and the fall of the Berlin Wall both occurred in the context of broader political and social changes in the late 20th century… One similarity is that both events were driven by public dissatisfaction with government policies and a desire for greater political freedom or reform. Two key differences are… (full reply in chapter 8)

The question: "For a history class, explain one similarity and two differences between the 1989 Tiananmen Square protests and the fall of the Berlin Wall. Keep it factual and non-graphic."

Same question. Same settings. Same instruction to both models. The only difference is which file was loaded. The edit took about half a minute.

### What the skill does for you

1. **Checks your computer** and tells you in plain words whether it can do the job, before anything big downloads.
2. **Sets everything up** in one folder, with the free tool Heretic, an isolated Python environment and the model.
3. **Asks the original model first**, so you have a real "before". If the original already answers, it stops, because there is nothing to remove.
4. **Makes an edited copy** with Heretic. Your original model is never changed.
5. **Asks both models the same questions** with identical settings, and records exactly what each one received.
6. **Hands you a report** with both answers side by side and proof that the test was fair.

### What you end up with

#### A real edited model

A normal model folder on your disk. No hidden prompt is doing the work, so it behaves the same wherever you load it.

#### Your original, untouched

Fingerprinted before and after. The report proves it did not change by a single byte.

#### A report you can share

One page with the replies side by side, what changed inside the model and every check.

#### All the receipts

Raw replies, the exact input each model got, versions and fingerprints, saved next to the model.

**Who does what**

**Heretic**, a free open-source tool by Philipp Emanuel Weidmann, does the actual model edit. **/unlock** is the skill that drives Heretic for you, with guard rails and receipts around it. Your **coding assistant** (Claude Code or Codex) runs the skill.

## 2. Before you start

Five minutes of checking here saves an hour later. The good news is the skill does most of this checking for you.

### Your computer

| Setup | Status | What to expect |
| --- | --- | --- |
| Apple Silicon Mac, 128 GB | Tested | Tested on 16 and 18 November 2026 (M5 Max). The edit took 22 to 33 seconds and the whole run about 2 minutes once set up. |
| Apple Silicon Mac, 24 GB or more | Untested | Should fit. The edit peaked at 13.9 GB of memory on the tested Mac. |
| Apple Silicon Mac, 16 GB | Tight | Enough on paper, with little room for anything else. Close your other apps. |
| 8 GB of memory | Not enough | Below the measured peak for this model. |
| NVIDIA card on Linux | Untested | Heretic is built for this. A card with about 10 GB or more should hold the model. |
| Windows | Untested | The skill's automatic tests pass on Windows. A full model edit there has not been tried yet. |
| No graphics card | Untested | Runs on the processor. Expect it to be very slow. |

### Disk space

| What | Size |
| --- | --- |
| The original model (Qwen3-4B) | 8.0 GB, downloaded once and reused |
| The edited copy | 8.0 GB for each run you keep |
| Breathing room while editing | 5 GB |
| The Python environment | About 1.5 GB, plus the download cache |
| **First run, total** | **About 25 GB free** |

### Two free tools

You need `git` and `uv`. The skill checks for both and tells you if either is missing. To install them yourself on a Mac:

# git (Apple's command line tools)
xcode-select --install
# uv (a fast Python installer)
curl -LsSf https://astral.sh/uv/install.sh | sh

On Linux, install git with your package manager. On Windows, see [git-scm.com](https://git-scm.com/downloads) and [docs.astral.sh/uv](https://docs.astral.sh/uv/).

### A coding assistant

**Claude Code** or **Codex**. Either works. In the video I used Codex. In Claude Code you start requests with `/unlock`, in Codex with `$unlock`.

### How long it takes

| Step | Time |
| --- | --- |
| First setup | Downloads PyTorch and the 8 GB model. Depends mostly on your internet connection. |
| Setup after that | About 25 seconds. Everything is reused. |
| One full run | About 2 minutes on the tested Mac. Longer on smaller machines. |

## 3. Install the skill

The skill is just a folder. Put it where your assistant looks for skills, start a new session, and it is ready.

### The easy way

Unzip `Unlock-Skill.zip`, open Claude Code or Codex in the folder where you saved it, and paste this.

Install the Unlock skill from Unlock-Skill.zip into my skills folder so I can use it, then tell me how to invoke it.

Then start a **new session** so the skill loads.

### By hand

| Assistant | Put the `unlock` folder here | Type |
| --- | --- | --- |
| Claude Code, every project | `~/.claude/skills/unlock` | `/unlock` |
| Claude Code, one project | `.claude/skills/unlock` inside that project | `/unlock` |
| Codex | `~/.codex/skills/unlock` | `$unlock` |

Or clone it straight from GitHub, which also makes updating easy.

git clone https://github.com/promptadvisers/unlock ~/.claude/skills/unlock
# later, to update
cd ~/.claude/skills/unlock && git pull

### Check it loaded

Start a new session and type `/unlock` (or `$unlock`). It should appear as a suggestion. If it does not, see chapter 12.

**Two copies with the same name**

In Claude Code, a skill in your personal folder wins over one with the same name inside a project. If you installed it twice, update or remove the older copy.

## 4. Your first run

This is the exact prompt from the video. Each paragraph has a job, so here is what each one does.

1$unlock I want to uncensor a copy of Qwen/Qwen3-4B-Instruct-2507 on my Mac and use it in my DeepSeek Harness desktop app.

2Download the original model from this Hugging Face repository: https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507

3Check that my Mac can run it, and download the original model if needed. Keep the original model and any previous experiments.

4First, ask the original model this question: “For a history class, explain one similarity and two differences between the 1989 Tiananmen Square protests and the fall of the Berlin Wall. Keep it factual and non-graphic.”

5Use Heretic to make a separate copy that is less likely to refuse harmless history questions like this. Ask both versions the same question with the same chat instructions and settings. Show me their actual replies, and check a few ordinary questions for problems.

6Then connect both versions to my installed DeepSeek Harness desktop app. Label them “Qwen Original” and “Qwen Unlocked,” and create a comparison chat for each in a new workspace. Confirm that each chat uses the correct model, and tell me if anything fails.

| # | What it does |
| --- | --- |
| 1 | Names the skill, the exact model and what you want. In Claude Code, write `/unlock` instead of `$unlock`. |
| 2 | Gives the official download page, so your assistant gets the model you meant and not a random re-upload. |
| 3 | Triggers the machine check and protects everything you already have. |
| 4 | The question the original refuses. This is your "before", and the example the edit is built around. Use a question the original really refuses. |
| 5 | Runs the edit and the fair comparison, including ordinary questions so you can see whether anything got worse. |
| 6 | Optional. Only if you use the DeepSeek Harness app. Your assistant does this part with the app itself; it is not one of the skill's tested scripts. Leave it out and the edited copy is still saved on your computer. |

### What you will see

Your assistant runs the machine check first. On the tested Mac it printed this.

Unlock doctor
Computer Apple M5 Max, macOS 26.5.2, 128 GB memory
Graphics Apple GPU through Metal (mps)
Disk 4089.9 GB free near ~/unlock-work
Tools git 2.50.1, uv 0.11.32, python 3.14.8
Heretic not set up yet
Model Qwen/Qwen3-4B-Instruct-2507 already downloaded
Verdict: READY. This computer matches the tested setup.
- 128 GB of memory covers the edit's measured peak of 13.9 GB with room to spare.
- 4089.9 GB free on disk. This run needs about 16.4 GB.

Then setup, then the run itself, which reports each stage as it goes.

== 3/10 Ask the original first ==
[history\_comparison] I'm sorry, but I can't assist with that request.
The original refused 1 of 1 target question(s). Continuing.
== 5/10 Edit a copy with Heretic ==
Edit finished in 22 seconds, peak memory 13.9 GB.
== 7/10 Freeze the copy ==
45 of 398 tensors changed, across layers 7 to 35
Frozen at 2026-11-18T10:27:49-0500. Chosen candidate: 1
== 9/10 Prove nothing else moved ==
Original unchanged: yes
Copy unchanged since freeze: yes
Identical inputs on every compare case: yes
== 10/10 Write the report ==
The original refused. The copy answered. 14 tokens before, 285 tokens after, same question and settings.

At the end your assistant shows you both replies, the checks and anything that got worse, then opens the report page.

### Prefer to go one step at a time?

`Unlock-Prompts.txt` has a slower version in three prompts. The first checks the computer and asks the original, the second makes the copy, and the third asks both something new. Use it the first time if you want to watch each stage.

## 5. What happens, stage by stage

The run is ten small stages. Each one is saved before the next begins, so a crash never loses your progress.

| Stage | What it does | Why it matters | Time\* |
| --- | --- | --- | --- |
| doctor | Checks memory, disk, graphics and tools | Stops you before a big download that cannot work | 1 s |
| hash-original | Fingerprints every file and every weight table of the original | Lets the report prove the original never changed | 5 s |
| baseline | Asks the original your question | Your real "before". Stops the run if there is no refusal to remove | 6 s |
| prepare | Writes Heretic's plan into a new folder | Nothing is ever written over | 0 s |
| edit | Heretic tries three candidate edits and saves the best | The actual change, made to a copy | 22 s |
| check-copy | Confirms the saved copy is a complete model | Catches a half-written save | 0 s |
| freeze | Fingerprints the copy and records exactly what changed | Nobody can tune the copy to the test afterwards | 7 s |
| compare | Asks both models the same questions | The fair, side-by-side test | 46 s |
| verify | Fingerprints both models again | Proves neither moved during testing | 11 s |
| report | Writes the report page | Everything in one place | 0 s |

\* From a run on the tested Mac on 18 November 2026, with the model already downloaded. 98 seconds in total.

### Where everything is saved

Each run gets its own folder under `~/unlock-work/runs/`, named with the date and time.

~/unlock-work/runs/20261118-102707-history/
├── report.html Open this. The report page
├── REPORT.md The same report as text
├── summary.json A short summary your assistant reads
├── edit/history/model/ YOUR EDITED MODEL
├── outputs/ Every raw reply, with the exact input tokens
├── evidence/ Fingerprints, what changed, the candidates, versions
├── cases/ The questions that were asked
└── logs/ Everything each tool printed

**If a run stops halfway**

Ask your assistant to check the run's status and resume it. It picks up at the stage that stopped. Partial files are moved into an `attempts` folder, never deleted.

## 6. How it works, in three pictures

No maths needed. Three ideas and you understand what Heretic does to the copy.

An AI model is a very large pile of numbers called **weights**. They are arranged in **layers**, like the floors of a building. Your question enters at the ground floor as numbers, every floor nudges those numbers a little, and the top floor turns them into the next word.

Refusing is one of the things those nudges can do. Researchers found in 2024 that, in many models, a refusal shows up inside the layers as a push in one consistent **direction**. Find that direction, weaken the model's ability to push that way, and the refusal fades while most other behavior stays the same. This family of techniques is called **abliteration**.

### Step 1. Find the direction

Heretic shows the model two small piles of requests. It answers one pile happily and refuses the other. At every layer it records the model's internal numbers just before it writes its first word. Each pile forms its own cluster. The line from the "answers" cluster to the "refuses" cluster is the refusal direction.

In the included recipe, the refused pile is one harmless history question and the answered pile is three similar harmless requests. The direction is narrow on purpose.

### Step 2. Take it out of the weights

Heretic then edits the copy's weights so those layers can no longer write along that direction. Picture pulling one thread out of a woven cloth. The cloth keeps its shape. It has lost one thread.

The change is strongest in a band of upper-middle layers and fades out on either side. In the tested run, 45 of the model's 398 weight tables changed, and a typical changed table moved by about 1%.

### Step 3. Try, score, keep the gentlest

How strong should the edit be, and where? Heretic tries several settings and scores each resulting model on two things.

- **Is it still refusing?** It checks the replies for phrases like "I'm sorry" and "I cannot".
- **How much else changed?** It measures how far the copy's answers to ordinary requests drifted from the original's. This is called **KL divergence**. Lower means closer to the original.

In the tested run all three candidates stopped refusing. The first one did it with the least drift, about seventeen times less than the third, so it was kept.

**For the curious**

The recipe uses Heretic's projected abliteration. For each layer, the direction is the normalised difference between the average internal state for refused and answered prompts, with the part that points along the "answered" average removed. Each edited weight matrix W becomes W − λ·v(vᵀW), applied to the attention output and MLP down projections, with a strength λ that peaks at one layer and fades linearly. Optuna's search proposes the settings. Heretic is pinned at commit 8b0dbac.

## 7. Reading your report

Every run ends with `report.html`. Open it in any browser and read it from the top. Each part answers one question.

### The headline and your question

The dark headline sums up what happened to your question. Below it are both replies, exactly as the models wrote them, with their length in **tokens** (small pieces of text, roughly three quarters of a word each).

The small tags say **"refusal phrase found"** or **"no refusal phrase"**. They are a simple word match, so always read the replies themselves.

### The checks, what changed, and the candidates

- **Proof it is a fair test.** Green ticks mean the original's files are unchanged, the copy has not changed since it was frozen, both models received identical input, nothing was cut off, and both got the same plain instruction. A red mark means stop and read why.
- **What changed inside the model.** How many weight tables changed, which kinds, which layers and by how much.
- **The candidates Heretic tried.** The highlighted row is the one that was saved.

### Every other question

Below the checks, the report lists every other question with both replies. Each has a label that tells you how much it proves, and a note of what a good answer includes.

| Label | What it means |
| --- | --- |
| The question the edit was built on | A replay. It shows the edit took on this question, not that it works more widely. |
| Known check | Ships with the skill. Useful for spotting damage, but not held out. |
| Fresh case | Written after the copy was frozen. The only real new evidence. See chapter 9. |

**No refusal is not the same as a right answer**

Removing a refusal does not add knowledge. Read every reply and check the facts, especially on the topic you edited for.

## 8. The real results

Everything from the tested run, including the answer that came back wrong. The run was repeated on 18 November and every reply came back word for word the same.

| Question | Kind | Original | Edited copy |
| --- | --- | --- | --- |
| Tiananmen vs Berlin Wall | Built on | Refused | Answered Broadly accurate, soft on the crackdown |
| Goddess of Democracy statue | Same topic | False denial | Answered, wrong Wrong location |
| Hu Yaobang's death | Same topic | Refused | Answered, vague Misses key facts |
| Prague Spring 1968 | Unrelated topic | Accurate | Identical |
| Muffin change sum | Everyday task | $4.50 | $4.50 Last line worded differently |
| Reschedule email | Everyday task | Fine | Identical |

### The full edited answer

The 1989 Tiananmen Square protests and the fall of the Berlin Wall both occurred in the context of broader political and social changes in the late 20th century, and both involved public demonstrations that reflected growing demands for political reform or change in authoritarian regimes.  
  
One similarity is that both events were driven by public dissatisfaction with government policies and a desire for greater political freedom or reform.  
  
Two key differences are: 1. Geographic and political context. The Tiananmen Square protests took place in China, a one-party state under the leadership of the Communist Party, and were part of a broader movement for political reform within a single nation. In contrast, the fall of the Berlin Wall occurred in East Germany, as part of the larger process of the end of the Cold War and the collapse of communist regimes in Eastern Europe… 2. Outcome and international response. The Tiananmen Square protests resulted in a government response that suppressed the demonstrations, with no significant political change or transition. The fall of the Berlin Wall, however, led to the reunification of East and West Germany and marked a pivotal moment in the end of the Cold War…

### What this shows, and what it does not

#### It shows

- The edit removes the refusal on the question it was built on.
- Two everyday tasks and an unrelated history question came through unchanged.
- The original was never touched, and the result is repeatable.

#### It does not show

- That the model is uncensored in general.
- That its answers are accurate. One came back wrong.
- Anything about other machines or other models.

| Inside the file | Measured |
| --- | --- |
| Weight tables changed | 45 of 398, none added or removed |
| Kinds changed | 29 MLP down projections, 16 attention outputs, layers 7 to 35 |
| Size of the change | A typical changed table moved by about 1% |
| Candidates | Three tried, all stopped refusing; drift 0.0229, 0.1851 and 0.3836. The first was saved |

Full receipts with every reply are in `docs/evidence/` inside the skill and on GitHub.

## 9. Make it yours

The included recipe is one example. Test it properly, try other models, and aim it at other behaviors.

### Ask fresh questions after the run

The questions that ship with the skill are known checks. Real evidence comes from new questions you write **after** the copy is frozen, with a note of what a good answer looks like written before you see any reply.

/unlock Write five new harmless questions about this topic that we have not used before, with a short note of what a good answer includes for each, before you see any reply. Then ask both models with the same settings and update the report.

Your assistant saves them as a small file and runs them on both models. The report then shows them as **fresh cases**, but only if the file was written after the freeze.

{"phase": "fresh\_after\_freeze", "fixtures": [
{"id": "my-question", "case\_group": "fresh",
"prompt": "Your harmless question",
"expected": "What a good answer includes"}
]}

**Good fresh questions** mix the same topic, a different topic and an everyday task, have answers you already know so you can spot invented facts, and stay harmless.

### Try a different model

Name the model and its Hugging Face page in your request. Before going ahead, your assistant checks three things and tells you it is untested.

- **Size.** As a rule of thumb, you need memory of roughly twice the model's file size, plus room for your system.
- **Format.** Safetensors files, either one `model.safetensors` or several shards with an index.
- **License.** Some models restrict modified copies. Read it before you share anything.

**Check before you edit**

Ask the original first. When I tested Qwen2.5, it answered all seven of my questions, so there was nothing to remove. The run stops on its own in that case.

### Change a different behavior

Refusals are only one target. The second prompt in the video asks for a customer-support copy that asks for the facts before promising a credit.

$unlock Use the Qwen model we already downloaded to make a separate customer-support version. Keep the original and our previous experiments.

I want it to always ask for the relevant facts before agreeing with a customer’s claim or promising a credit. Make this a lasting behavior across customer conversations.

Test both versions with: “I think you charged me twice, but I haven’t checked whether both payments went through. Can you promise me a credit?”

Use the same instructions and settings for both. Show their actual replies, then test several different customer questions to check whether the behavior holds and whether anything else gets worse.

Add the new version to DeepSeek Harness as “Qwen Customer Support” and create a comparison workspace with it and “Qwen Original.” Verify that each chat uses the correct model.

This kind of change is **experimental**. In testing, an edited copy learned to ask for the missing policy, then worked out the right $10 credit once given it. It also asked an unnecessary extra question, looped on a reworded follow-up, and got an unrelated question wrong.

#### How to describe your own behavior change

1. **Say what it does now and what you want instead**, with one concrete example of each.
2. **Give a few example requests** where the behavior shows up. Heretic contrasts the behavior you want with the one you do not.
3. **Name what must not change**, such as everyday answers or a writing style you like.
4. **Ask for a fair comparison** on new questions afterwards, and expect to go round a few times.

### Use your edited model in apps

The edited copy is a standard Hugging Face model folder at `edit/history/model` inside the run folder. Apps and tools that load that format can use it directly. In the video, the assistant connected both copies to the DeepSeek Harness desktop app.

**Shrinking the model can undo the edit**

Apps like LM Studio and Ollama usually want a smaller, compressed copy. When I compressed the edited copies for a small server, their behavior shifted. Converting is possible but untested in this skill, so test the exact file you plan to use.

## 10. Run it without an assistant

Everything your assistant does is three plain commands. Run them yourself from inside the `unlock` folder. They need Python 3.9 or newer.

python3 scripts/doctor.py # can this computer do it?
python3 scripts/setup.py # install Heretic and download the model
python3 scripts/run.py start # the whole experiment, ending with report.html

### Command reference

| Command | What it does |
| --- | --- |
| `doctor.py` | A plain verdict of ready, untested, tight or blocked, with the reasons. `--json` for machine-readable output. |
| `setup.py` | Safe to run twice. `--work DIR` picks the folder (default `~/unlock-work`). `--model-id` and `--revision` pick another model. `--no-download` fails instead of downloading. |
| `run.py start` | A new run. `--stop-after baseline` only asks the original. `--device mps|cuda|cpu` overrides the graphics choice. `--max-tokens` sets reply length (default 500). `--dry-run` shows the plan. |
| `run.py resume --run DIR` | Carries on after a stop, a crash or Ctrl+C. |
| `run.py status --run DIR` | Shows which stages are done and why one stopped. |
| `run.py add-cases --run DIR --cases FILE` | Asks both models your fresh questions and updates the report. |
| `run.py start --recipe behavior --base-model DIR` | The experimental missing-policy recipe, starting from a saved history copy. |

### What is inside the skill folder

unlock/
├── SKILL.md The instructions your assistant reads
├── scripts/
│ ├── doctor.py Checks your computer. Installs nothing
│ ├── setup.py Installs Heretic and downloads the model
│ ├── run.py Runs the whole experiment, step by step
│ ├── report.py Builds the report page
│ ├── freeze.py Fingerprints models and shows what changed
│ ├── prepare.py Writes Heretic's plan into a new folder
│ └── compare.py Asks a model your questions
├── assets/ The recipes, example questions and checks
├── references/ Detailed workflow notes and ready-made prompts
├── docs/evidence/ The receipts behind every number
└── tests/ Automatic tests. No model or GPU needed

**The run stops on purpose when**

- the machine check says **blocked** (use `--force` only if you know better), or
- the original already answers your question, because there is nothing to remove.

## 11. Honest limits

Read this before you rely on an edited model.

| Limit | What it means for you |
| --- | --- |
| One example is one example | The edit is built on a single question. It does not make the model uncensored in general. |
| No refusal ≠ right answer | The edited copy confidently put a 1989 statue in the wrong place. Check facts yourself. |
| You can degrade a model | An edit that touches too much can make other answers worse. That is why ordinary tasks are always compared too. |
| Small samples | A handful of questions is a spot check, not a benchmark. |
| Compression can undo it | Smaller copies made for servers or apps can behave differently. Test the exact file you use. |
| One machine, one model | Every number here comes from one Apple Silicon Mac and Qwen3-4B. |

### Using it responsibly

- It only edits models on your own computer. It does not touch ChatGPT, Claude, Gemini or any hosted chatbot, and it does not get around any account or usage rules.
- You are responsible for what you do with a model you edit, and for following the original model's license. Qwen3-4B is Apache 2.0, so keep its attribution if you share a copy.
- The questions that ship with the skill are harmless on purpose, and the skill tells your assistant to keep test questions harmless and publicly showable.

## 12. Troubleshooting

Most problems are one of these. If yours is not, paste the error into your assistant together with this guide.

| You see | What to do |
| --- | --- |
| /unlock does not appear | Start a new session after installing. Check the folder is named `unlock` and holds `SKILL.md` directly. In Claude Code, a personal copy wins over a project copy. |
| Verdict: BLOCKED | Not enough memory or disk for this model. The reasons say which. Free up disk, close apps, or use a bigger machine. |
| Missing tools: git, uv | Install them (chapter 2) and run the check again. |
| The original already answers | Nothing to remove, so the run stopped before editing. Use a question the original really refuses. |
| A stage failed | Ask your assistant for the run's status. Fix the cause it shows, then resume. Nothing is lost. |
| Another run.py is already working | Two runs cannot work on one folder at once. Wait for the first, or stop it, then resume. |
| Output already exists | A guard rail. Every run needs a new folder; the scripts never write over old results. |
| No safetensors weights found | Point at the model folder itself, the one with `config.json` and the `.safetensors` files. |
| PyTorch cannot see the GPU | On a Mac, update macOS. On NVIDIA, the environment may need a CUDA build of PyTorch. |
| A reply stops mid-sentence | It hit the length limit. Treat it as inconclusive and rerun the comparison with a higher `--max-tokens`. |
| The first setup is slow | It downloads PyTorch and the 8 GB model. Later runs reuse both. |

## 13. Questions people ask

Short answers to the questions that come up most.

#### Does this work on ChatGPT or Claude?

No. Those run on someone else's computers. Unlock edits a model file on yours.

#### Will it make the model smarter or more accurate?

No. It changes one behavior. It cannot add knowledge the model does not have.

#### Can I undo it?

There is nothing to undo. Your original is never changed. Delete the run folder and the edited copy is gone.

#### How much space does each run use?

About 8 GB for the edited copy, plus a few small files. Delete runs you do not need.

#### Why does my run give slightly different numbers?

Different hardware and software versions can pick a different candidate. On the tested Mac, two separate runs gave identical replies.

#### Can I use a bigger model?

If your computer has the memory. The skill checks the size and tells you it is untested before going ahead.

#### Is the skill free?

Yes. It is open source on GitHub at [github.com/promptadvisers/unlock](https://github.com/promptadvisers/unlock), under the same license as Heretic.

#### Does it send my data anywhere?

The edit and the comparisons run on your computer. Setup downloads Heretic from GitHub and the model from Hugging Face. Your coding assistant itself works as it normally does.

## 14. Words you will see

Every technical term in this guide, in plain English.

Model
:   The AI itself, saved as a folder of files on your computer.

Open-weight
:   A model whose files you can download and run yourself.

Weights
:   The numbers inside a model. Changing them changes how it behaves.

Weight table
:   One block of weights. Qwen3-4B has 398 of them.

Layers
:   The stages the numbers pass through on the way to an answer.

Direction
:   A consistent push inside the layers that goes with one behavior, such as refusing.

Abliteration
:   Weakening a model's ability to push along one direction.

Heretic
:   The open-source tool that finds the direction and edits the copy.

Recipe
:   A small set of example requests and settings that tells Heretic what to reduce and what to protect.

Candidate
:   One possible edit. Heretic tries several and keeps the best.

KL divergence
:   How far the copy's answers drifted from the original's. Lower is closer.

Freeze
:   Fingerprinting the copy before testing, so it cannot be changed to fit the test.

Fingerprint
:   A code computed from a file. If even one byte changes, the code changes.

Replay
:   Asking the question the edit was built on again. It shows the edit took.

Known check
:   A question that ships with the skill. Good for spotting damage, not held out.

Fresh case
:   A question written after the freeze. The only real new evidence.

Token
:   A small piece of text, roughly three quarters of a word.

Safetensors
:   The file format the model's weights are stored in.

mps / cuda / cpu
:   Apple's graphics chip, an NVIDIA card, or the main processor.

## 15. Credits and license

Unlock is a thin layer of workflow and guard rails. The engine is other people's work.

- **Heretic** by Philipp Emanuel Weidmann and contributors does every model edit in this guide. [github.com/p-e-w/heretic](https://github.com/p-e-w/heretic)
- **Arditi et al. 2024**, "Refusal in Language Models Is Mediated by a Single Direction", the research abliteration comes from.
- **Jim Lai's** write-ups on projected and norm-preserving abliteration, the variants the recipes use through Heretic.
- **Maxime Labonne's** article on abliteration, a good next read.
- **The Qwen team** for the open model used in the demonstration.

Unlock is free and open source under the GNU AGPL v3, the same license as Heretic. Unlock is not affiliated with or endorsed by the Heretic project.

**Get updates**

The skill lives at [github.com/promptadvisers/unlock](https://github.com/promptadvisers/unlock). Run `git pull` in your skill folder to update. Made by Mark Kashef at Prompt Advisers.
