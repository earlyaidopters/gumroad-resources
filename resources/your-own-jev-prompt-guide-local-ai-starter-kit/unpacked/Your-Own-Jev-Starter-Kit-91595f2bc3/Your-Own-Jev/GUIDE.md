# Build your own specialist

This guide accompanies Mark Kashef's Jev-inspired travel experiment. You will learn the process, explore a sample, and give your coding assistant a complete brief for your own narrow classification task.

## Open these first

- Visual guide: https://build-your-own-jev.markkashef.chatgpt.site
- Sample agency: https://build-your-own-jev.markkashef.chatgpt.site/demo/
- Source and local setup: https://github.com/earlyaidopters/away-together-starter
- Full prompt: [TRAIN-MY-SPECIALIST.md](prompts/TRAIN-MY-SPECIALIST.md)

The public demo needs no model download. It uses saved outputs from the real local models. Changes to budgets, requirements and photo selections recompute the application rules in your browser. It does not run fresh AI inference. The complete community edition includes the local version for that.

## 1. Understand the job

The model reads a holiday's booking terms and chooses an answer for each question. For example, “Can I receive a full cash refund?” can produce yes, no, or can't tell. The app then checks those answers against a traveller's needs. A person is never the thing being classified.

A useful classifier has a small, explicit job. For your own domain, write:

```text
Input: [the document or message the model reads]
Question: [one concrete decision]
Allowed answers: [yes, no, can't tell]
Yes means: [positive evidence required]
No means: [contradicting evidence]
Can't tell means: [missing or ambiguous evidence]
Action: [what the application does with each answer]
```

Do not use a model for arithmetic when code can do it. A €1,420 holiday exceeds a €1,000 budget without AI involvement.

## 2. Try the travel example

Open the sample agency and choose **The flexible escape · 2**. Run the check with all three photos selected. Maya is declined because the selected photos include entrance stairs. Remove the stairs photo and run again. Her result becomes **needs review**, not a match: the remaining photos cannot prove a step-free route.

Inspect a traveller to change a budget or requirement. Compare all 40 offers to see how one set of observations supports different wish lists. The input observations are recorded; the rule calculations respond to your edits.

## 3. Give your assistant the full prompt

Open TRAIN-MY-SPECIALIST.md, replace the bracketed task fields, and paste the complete prompt into a coding assistant that can access your local files and terminal. Claude is the walkthrough's example; the prompt can be used with another capable coding assistant.

Start by asking it to check your machine. Have it state the base model, license, exact revision, expected download, and tested platform. It should show you five labeled examples before scaling up. You decide whether those labels mean what your business needs.

An assistant saying “done” is not enough. Ask for the command it ran, the saved file, and one actual model output.

## 4. Keep the exam separate

Use three sets:

- **Training:** examples used to change the model.
- **Development:** examples used to compare recipes and choose a checkpoint.
- **Final test:** untouched examples used once to measure the selected model.

Keep related conversations, document templates and duplicates together. Randomly scattering near-identical examples between splits can make memorization look like generalization. Automated overlap checks help, but cannot prove all semantic duplication is gone.

For a new task, collect realistic examples and check their answers. Synthetic examples can help you prototype. Label them as synthetic, and do not treat an AI's review as human verification.

## 5. Measure, then train

First run the unchanged starting model on your development set. Save predictions and mistakes. Compare a simple rule-based solution where appropriate.

Next run a tiny training smoke test in its own folder. This verifies that loading, training, saving and prediction work. It does not establish accuracy. If the pipeline works, train a fuller experiment. Keep the starting model and previous checkpoints intact.

Record the base revision, dataset hashes, random seed, device, training settings, development scores and checkpoint hash. Choose using development results. Freeze the model before opening the final test.

## 6. Read the result correctly

Accuracy is the fraction of decisions that match your references. Macro-F1 summarizes performance across labels so a common label does not entirely hide a rare label's failures. Inspect the mistakes as well as the scores.

The video's comparison used 360 synthetic travel scenarios and 1,440 decisions per model. V1 scored 60.28%, V2 scored 95.28%, and Jev scored 98.61% against the reference answers. V2 improved substantially and did not beat Jev. Those numbers do not establish performance on your data, general-purpose equivalence, or booking safety.

A confidence score is not a correctness guarantee. Keep a review branch and measure wrong accepted decisions. If you tune after seeing the final test, that test is no longer untouched; obtain a genuinely new test before making a new final-performance claim.

## 7. Add images only if the job needs them

This project fine-tuned a text reader and connected a separately pretrained OpenJev image reader. It did not train a new multimodal foundation model.

A picture can show a pool or stairs. It cannot prove that pool entry is included, that a cash refund is available, or that every part of a route is accessible. Written terms and pictures answer different questions. Application rules combine their outputs while preserving uncertainty.

The public sample includes nine recorded photo observations. Uploading and analyzing your own image requires the local photo service. Its supplied setup targets Apple silicon and downloads approximately 16 GB of vision weights. The demonstration computer had 128 GB RAM; that does not establish a minimum requirement.

## 8. Choose your next step

The public starter contains the sample app and a small ModernBERT training recipe. Follow its README to prepare a separate workshop, measure a baseline, train a short experiment and inspect a test report. The small included synthetic data checks the pipeline; it cannot reproduce the video's V2 score.

The complete local agency, V2 checkpoints, training experiments and image integration are available in the community edition. Members can follow that repository's setup guide to restore companion-v2 and run fresh inference. The photo service has its own setup and download.

Local inference needs no Jev account. Repeating a hosted benchmark is separate and can incur charges. Hardware, electricity, model downloads and coding-assistant use have their own costs.

## 9. Adapt one thing at a time

Run the starter experiment successfully first. Then use a separate workspace for your new task. Change the questions and candidate meanings, build checked examples, evaluate the starting model, and train only if the results justify it.

A new checkpoint cannot be dropped into the travel app blindly. Its question schema, answer ordering and calibration must agree with the application. Ask your assistant to validate that contract and test ambiguous, contradictory and missing inputs.

You are finished when you can run one new result, explain why the app acted on it, reproduce the test report, and identify which files to change next.

## If you get stuck

| Problem | Next step |
|---|---|
| Missing model | For starter training, run the download stage. Community members can restore companion-v2 for the full app. |
| Conflicting files during restore | Use a clean clone; preserve your changes rather than overwriting them. |
| Text works, photos do not | Complete the separate vision setup and verify the service on port 8081. |
| Runs out of memory | Stop competing jobs and inspect the model requirements; smaller hosts are not validated. |
| High score, poor real examples | Check label quality, duplication, distribution shifts and held-out evaluation. |
| Hosted sample will not classify new text | Expected: it demonstrates recorded examples. Use the local training and inference path. |

Original project code is MIT. Models, datasets, fonts and upstream code retain their own terms. See THIRD-PARTY-NOTICES.md. Build with the community at https://www.skool.com/earlyaidopters/about.


## Build your own version with us

Get the complete project code, training pipeline, model checkpoints, and exclusive training inside Early AI Adopters.

[Join Early AI Adopters](https://www.skool.com/earlyaidopters/about)
