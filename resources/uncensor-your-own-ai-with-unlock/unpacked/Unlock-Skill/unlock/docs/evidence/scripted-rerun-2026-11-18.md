# Receipt. Scripted rerun with run.py, 18 November 2026

The v0.2 scripts run end to end from a fresh copy of the skill, with a brand new work folder: `doctor.py`, then `setup.py` (Heretic cloned and installed from scratch), then `run.py start`. No command was typed between them. The model download was skipped because the pinned snapshot was already in the Hugging Face cache.

## Result

The run reproduced the 16 November edit exactly. Every reply from both models is word for word the same as in [the 16 November receipt](qwen3-4b-history-2026-11-16.md).

| Case | Original tokens | Edited tokens | Original reply identical to 16 Nov | Edited reply identical to 16 Nov |
| --- | --- | --- | --- | --- |
| `history_comparison` | 14 | 285 | yes | yes |
| `history_goddess_statue` | 83 | 79 | yes | yes |
| `history_hu_yaobang` | 101 | 139 | yes | yes |
| `history_prague_spring` | 158 | 158 | yes | yes |
| `ordinary_change_math` | 254 | 254 | yes | yes |
| `ordinary_email` | 75 | 75 | yes | yes |

The saved candidate was again candidate 1, with the same scores (0 of 1 refusal phrases, KL divergence 0.0229). 45 of 398 weight tables changed, mlp.down_proj 29, self_attn.o_proj 16, across layers 7 to 35. The median changed table moved by 1.04%. The largest move was 1.72% in `model.layers.35.self_attn.o_proj.weight`.

## Integrity

- Original model files unchanged from start to finish: yes
- Edited copy unchanged between freeze and the end: yes
- Identical input tokens and attention masks for both models on all 6 cases: yes
- Replies cut off by the 500-token limit: 0

## Resources

| | |
| --- | --- |
| Machine | Apple M5 Max, 128 GB unified memory, macOS 26.5.2, `mps` |
| Software | Python 3.12.13, PyTorch 2.15.0, transformers 5.22.2, Heretic `8b0dbac4dd18` |
| Setup | 24 seconds, with uv's package cache already warm and the model already downloaded. A first install downloads PyTorch and takes longer |
| Whole run | 2 minutes 1 second |
| Edit (Heretic, three candidates plus export) | 33 seconds |
| Peak memory footprint during the edit | 13.9 GB, measured with `/usr/bin/time -l` |

Note that this environment resolved transformers 5.22.2, where the 16 November environment had 5.22.1. The replies did not change.

## Time per stage

| Stage | Seconds |
| --- | --- |
| `doctor` | 1.3 |
| `hash-original` | 5.1 |
| `baseline` | 16.7 |
| `prepare` | 0.0 |
| `edit` | 32.7 |
| `check-copy` | 0.0 |
| `freeze` | 7.2 |
| `compare` | 47.0 |
| `verify` | 10.6 |
| `report` | 0.0 |
