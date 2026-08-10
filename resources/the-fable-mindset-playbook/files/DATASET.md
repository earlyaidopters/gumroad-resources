# The Open Fable 5 Dataset, and How to Compare It Against Your Own Opus 4.8

You never needed Fable access to study how it worked. Someone published real Fable
5 Claude Code traces as a public dataset. This kit gives you a tool that profiles
that public Fable behaviour, then profiles your own local Opus 4.8 sessions the
exact same way, so you can read the behavioural gap with your own eyes.

## The dataset

Link. https://huggingface.co/datasets/Glint-Research/Fable-5-traces

What it is. 4,665 public Fable 5 Claude Code traces, captured as per event rows
with the reasoning and the tool calls intact. It is roughly 69.8 MB, stored as
JSON that Hugging Face auto converts to Parquet. It is the Fable half of the
comparison. It contains only Fable traces, there is no Opus data inside it, you
bring the Opus half from your own machine.

Who made it. Glint-Research published it, and the card credits the TeichAI team
for 953 of the messages.

License. AGPL-3.0. That is a strong copyleft license, so respect it if you ever
redistribute the data or build a service on top of it. We are only linking to it
and reading it locally, we do not bundle or redistribute the data in this kit.

## The schema

Every row is one event from a Fable session. Ten fields, all strings or JSON.

- uid. The event id, shaped as "<session>#<n>" where n is the integer event index
  inside that session. Rows are not pre sorted, so the tool sorts each session by
  n to recover the real execution order.
- source_file. The original local path the trace came from.
- session. The session id, used to group events into one working session.
- model. Always the value "claude-fable-5".
- context. The concatenated user and assistant text leading into the event.
- cot. The chain of thought reasoning text for that event. A non empty cot means
  the event reasoned.
- output_type. Either "text" or "tool_use".
- output. A JSON object. For a tool_use event it is {tool, input}, where input can
  carry file_path, command, and similar fields. For a text event it is {text}.
- completion. The raw completion string, with the reasoning wrapped in think tags.
- origin. Where the trace came from, for example "local".

## Download it

Pick whichever you prefer. The delta tool in this kit handles the download for
you through the datasets library, so you do not strictly need to download it by
hand. These are here in case you want the raw files.

The datasets library, in Python.

    from datasets import load_dataset
    ds = load_dataset("Glint-Research/Fable-5-traces", split="train")

A full clone with git, if you want the files on disk.

    git clone https://huggingface.co/datasets/Glint-Research/Fable-5-traces

The Hugging Face CLI.

    hf download Glint-Research/Fable-5-traces --repo-type dataset --local-dir fable-5-traces

## The delta recipe

The tool is scripts/fable_dataset_delta.py. The dataset is the Fable half. Your
own local Opus 4.8 sessions, under ~/.claude/projects, are the half you bring.

Step 1. Profile the Fable side from the public dataset.

    python3 scripts/fable_dataset_delta.py

That prints the Fable behavioural profile. The share of events that are tool_use
versus text, the tool mix, tool calls per session, the share of events that
carried reasoning, and the per session discipline signals, reads before the first
edit and a real test after editing.

For a quick smoke test that never pulls the full 70 MB, stream a sample.

    python3 scripts/fable_dataset_delta.py --sample 400

Step 2. Add your own Opus 4.8 side and read the gap.

    python3 scripts/fable_dataset_delta.py --opus

That scans your local claude-opus-4-8 logs, runs the identical metrics on them,
and prints Fable next to Opus 4.8 with the delta in points for each habit. Same
ruler on both halves, so the difference is evidence, not vibes. Compare the two
columns, not the absolute numbers, because the two samples differ in size and in
what work each model was doing.

A note on the reasoning metric. The Fable rows carry a chain of thought per event,
so the reasoning share reads high. Your local Opus side only counts as reasoning
when the log actually stored a visible thinking block, which depends on your
extended thinking setting. If your Opus reasoning share reads low or zero, that is
your logs not storing thinking, not Opus failing to think. The tool reports it
honestly either way.

If the tool finds no local claude-opus-4-8 sessions, it tells you so and just
prints the Fable profile. Run some Claude Code work on Opus 4.8 first, then rerun
with --opus.

## How the tool loads the data

It prefers the datasets library. If datasets is not installed it attempts a quiet
pip install, and if that fails it falls back to downloading the Parquet directly
through huggingface_hub and reading it with pandas and pyarrow. It prints which
path worked, so you always know how the data came in.
