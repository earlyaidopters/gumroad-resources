# Route 2: a rented cloud GPU

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

## Before renting

Run prompt 04. Ask the assistant to distinguish model weights, vision projector, inference runtime, context size and memory overhead. The biggest affordable weights are not always the best working tool model. See the dated recorded setup before choosing.

Approve a written quote with the exact GPU, quantity, region, hourly rate, persistent storage size/rate, maximum runtime and total budget. A quote is not a guarantee that a GPU is available later. Do not grant open-ended authority to keep retrying larger GPUs.

## Deploy the approved plan

Run prompt 05 after connecting the RunPod account through its supported plugin or CLI. Use a trusted inference template or a pinned runtime. Put model files, the compatible projector and startup configuration under persistent storage. Keep temporary caches separate. The included kit does not rent GPUs automatically.

Expose only an authenticated model endpoint, not an unauthenticated shell or admin console. Keep the RunPod management key distinct from the inference key. Confirm the endpoint refuses a request without the inference key.

In Harness create a custom API provider. Use the returned `/v1` endpoint, protocol and exact served model ID. If using the local cost guard, Harness points at the local guard instead of the remote model endpoint.

## Acceptance tests

- Text response and two conversation turns.
- Harmless function call plus a follow-up after the tool result.
- Synthetic screenshot if image input is part of the model choice.
- An unauthenticated request fails.
- Stop, then confirm EXITED in RunPod; restart, confirm the model/config still exist, and repeat the harmless request.

Use the included endpoint checker, then verify through Harness. Record failures. The public release has no claim of a fresh paid deployment in every reader's account.

## End the session

Follow the cost-control guide. Stop this exact Pod when finished. Review storage charges separately. Delete it only after deciding what to keep and making a backup. A container-disk file may disappear on stop; a Pod volume disappears on termination. Verify the current behavior in [RunPod storage docs](https://docs.runpod.io/pods/storage/types).

Sources: [RunPod Pods](https://docs.runpod.io/pods/overview), [Pricing](https://docs.runpod.io/pods/pricing), [Storage](https://docs.runpod.io/pods/storage/types).
