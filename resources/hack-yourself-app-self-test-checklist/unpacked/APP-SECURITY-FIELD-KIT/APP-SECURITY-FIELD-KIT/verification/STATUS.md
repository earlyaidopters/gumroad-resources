# Verification and limits

Release 1.0.0, 29 October 2026. Built by Codex from Mark Kashef's approved checklist and resource brief. No new live-app vulnerability is claimed by this kit.

## Documentation update 1.0.1, 30 October 2026

The README and start guide were revised for navigation and clarity, with a real screenshot of the report using fictional data. The portable checks were rerun. Guide PDFs, worksheets, report code, and testing prompts remain unchanged from asset release 1.0.0.

## Verified for this release

- The existing checklist was preserved as 50 unique logical items across seven categories. Python and Node independently reconciled raw, unique, shared, added, removed, duplicate, and malformed counts. The frozen source hash is in CHECKLIST-PROVENANCE.json.
- The report's 20 automated checks cover validation, evidence requirements, ratings, urgent overrides, duplicate IDs, calendar dates, input bounds, status separation, inert text rendering, and the absence of network calls or persistent storage.
- Browser checks covered empty startup, sample loading, JSON file import, rejection of a duplicate-ID import without destroying the previous report, two selectable findings in one grid cell, finding details, JSON export with its sample label retained, and clearing the report.
- Desktop and 390-pixel mobile views were inspected. The mobile page had no horizontal overflow. Numeric grid markers avoid wrapping longer finding IDs.
- All 24 field-guide pages and all three worksheet pages were rendered and visually inspected. The PDFs include use limitations and per-page authorized-use notices. The worksheets are printable, not fillable PDF forms.
- The evidence-review prompt was exercised through OrcaRouter's DeepSeek Flash route on four authored synthetic development cases. It rejected HTTP 200 with an empty body as proof, identified an accidental owner session as no cross-account test, accepted the deliberately supported marker leak, and recognized an evidenced denial. The fixture file was unchanged. This is a small prompt sanity check, not a held-out evaluation or evidence of general security performance.
- Local links, asset presence, standalone prompt notices, and the absence of creator-specific configuration are checked by scripts/verify_resource.py. Private source configuration and secrets are excluded from the public package.

## What was not verified

- The kit does not perform an assessment merely by opening a PDF or the report page.
- The example report is fictional; it is not the output of a CollabDesk or client scan.
- The other testing and repair prompts are reusable templates, not proof that an arbitrary assistant, provider, or app supports their actions.
- Browser Print / Save PDF uses the browser's native printing support and the supplied print stylesheet; printer, browser, and paper variations may differ. Desktop/mobile display checks do not prove every print combination.
- No native installation, exhaustive browser compatibility matrix, provider billing configuration, real payment, real email send, production reset, live load test, or independent professional assessment is included in this verification.

## Run the portable checks

```sh
node tests/report.test.cjs
python3 scripts/verify_resource.py
```

To regenerate assets, install the optional dependencies with `python3 -m pip install -r requirements-build.txt`, then run `python3 scripts/build_assets.py`. The generated PDFs, cover images, and self-contained report are already included, so buyers do not need this step.

Use only authorized systems and synthetic data. AI output requires verification; passed checks are not certification. Full limitations: ../DISCLAIMER.md.
