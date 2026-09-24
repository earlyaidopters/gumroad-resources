# Ask Claude to build your specialist

This is a reusable example prompt, not a transcript of Mark's original build. Open the repository folder in Claude, change the bracketed fields, and paste everything below. Start with the travel values if following the video. Claude handles implementation; you must judge whether the examples and answers match your real job.

---

Help me build and understand a small local classifier for **[checking holiday booking terms against traveller requirements]**. I am not a machine-learning engineer. Explain one step at a time, show the files you changed, and give me a command and an expected result at each checkpoint. Use this starter repository as the starting point. It contains an educational training recipe and a recorded demo, not the complete V2 app or saved V2 checkpoint. Treat image integration and a new app as optional extensions.

## 1. Define the job before writing training code

My input is **[a holiday offer's complete written booking terms]**. My questions are **[full cash refund before the deadline; check-in after midnight without arranging it; included pool access; included guided hike]**. For each question choose exactly one of **[yes, no, can’t tell] (mapped internally to meets, violates, insufficient_evidence)**.

Make the meanings precise. Hotel credit does not count as a cash refund. A missing clause means insufficient evidence, not a pass. Read the full relevant document. Use ordinary code for numeric budgets. Show me five examples, including an ambiguous case, so I can check that you understood my rules before you scale data preparation.

For my own domain, help me replace these questions, candidate descriptions and label definitions together. Do not claim that changing a title or label retrains a model.

## 2. Inspect my computer and the starting model

Inspect available memory, accelerator, disk space, Python and installed tools. Explain what can run locally and what is untested. Do not rent a GPU, buy a service, add paid calls, or download unrelated models.

Start with `MoritzLaurer/ModernBERT-base-zeroshot-v2.0` at revision `d421c4545a438fd006fb43f8b981c5d908faa1e1`. This is an existing open pretrained classifier, not a model we trained from scratch. Read its model card and license. Use the repository's locked Python dependencies and explicit eager attention route. Download the pinned weights, record the exact revision, and run one small inference check. If it cannot run, report the actual error and offer an explained alternative; do not silently switch to a hosted model.

## 3. Make a safe working folder and checked data

Preserve `apps/agency/models`, the frozen experiments, and the working persona app. Create a new workshop folder with `tools/tutorial.py prepare`. Keep every new output there. Never overwrite the supplied demo checkpoint or an earlier run.

For the travel walkthrough, use the supplied data and disclose that its scenarios are synthetic. For my own job, help me collect realistic examples and write explicit label rules. You may draft examples, but mark them as synthetic and ask me to check their answers. Do not describe your own review as human validation.

Create separate train, development and final-test files. Keep related customer conversations, document templates and near-duplicates in one split. Validate the record schema and exact overlaps, then explain that automated checks cannot find every semantic duplicate. Show a complete record with input, question, candidate sentences, labels and correct answer index. Keep private customer details out of shared files.

## 4. Measure the model before changing it

Run the unmodified classifier on the development set and save predictions or a metrics receipt with the model and data hashes. Report accuracy and macro-F1 in plain language and show actual mistakes. Compare simple rules where they could solve this job. Do not assume fine-tuning is required or promise it will improve performance.

## 5. Train a small first experiment

Use `tools/tutorial.py` as the working travel recipe. Run an eight-decision smoke check in a separate folder before the full run. Say clearly that this checks the pipeline, not model quality. Then create a new folder for the full dataset.

Start with the last two encoder layers and classification head, a small batch, a fixed random seed and a short training run. Explain learning rate as how large a correction we make, batch size as how many examples we process together, and an epoch as one pass through the practice data. Inspect memory use and a finite loss before continuing. If memory fails, lower the batch size with a documented change; do not truncate documents silently.

Select a saved checkpoint using development results only. Record the configuration, base revision, data hashes, seed, device, learning curve and checkpoint hash. Label any new recipe changes. Do not present this tutorial recipe as a bit-for-bit reproduction of Mark's older experiment.

## 6. Test it fairly and keep the failures

Freeze the selected checkpoint before the final test. Compare the original and trained models on identical held-out cases, using the same serialization and candidate descriptions. Include all errors, accuracy, macro-F1 and the individual predictions. Distinguish development progress from final-test performance. If the specialist does worse, say so and keep the report. Do not tune on final-test mistakes and call the same data a fresh exam afterward.

Do not call a probability a reliability guarantee. Do not claim Jev parity, superior accuracy, universal cost savings or production readiness. A Jev comparison is optional and separate: it needs a valid account, applicable permission and explicit paid-call authorization.

## 7. Run one new input, then connect it to an app

Show me how to load my saved checkpoint and classify a new JSON input. Map outputs to an inspectable result with an explicit review branch for missing or uncertain evidence. Start with a separate demo using the tutorial output. The existing travel API has fixed questions and calibration settings; do not point it at a new checkpoint without a compatible adapter and fresh validation.

If I need images, connect the existing separately pretrained OpenJev image service. Do not claim that the text model now sees pixels or that we trained a new vision model. Show the actual image questions, observations and application rules. Test a misleading picture and a missing picture. Photos cannot prove booking terms or a complete accessible route.

## 8. Deliver a project I can run again

Give me one README with prerequisites, exact commands, expected files, troubleshooting and a first-result check. Include the base model pin, data provenance, code, checkpoint manifest, measurements, failures and upstream credits. Keep local inference, model downloads and Claude's build-time costs separate. List what still needs my judgment.

My completion test is: I can run one result from the saved model; inspect why it was labelled that way; reproduce the test report; and identify which files to change for my next task. Work through the steps with visible receipts instead of giving me only an overview.
