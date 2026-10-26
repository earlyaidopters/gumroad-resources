# Route 1: hosted API

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

## Before starting

Use prompt 01 to prepare the Harness. Then use prompt 02. You need a provider account that permits your intended defensive workload and supports a model/protocol compatible with Harness. The provider can have identity checks and separate API billing.

## Connect

1. Open the provider's official docs and copy its API base URL and wire protocol. The video shows Abliteration and OrcaRouter; current availability and terms must be checked at their own sites.
2. Create a limited key, set a usage limit where offered, and enter the key directly in Harness's provider form or its private credential store.
3. In Harness open Settings > Models > Add model provider > Custom model API. Use `config/provider-fields.json` as a worksheet, not a file to import.
4. Fetch available models or enter the exact ID from the provider. Display names and IDs can differ. Select a model with the capabilities you intend to test.
5. Start a new session in the test workspace. Old sessions may retain their original model.

## Verify

Run `python3 scripts/check_endpoint.py --base-url https://YOUR_PROVIDER/v1 --model YOUR_MODEL_ID` with `MODEL_API_KEY_FILE` pointing to your private key file. This sends only synthetic prompts. It consumes a small amount of API usage. Use `--tools` to test function-call syntax and `--image assets/vision-test.png` for image input. Inspect the result and repeat the harmless tool workflow through Harness itself.

## Stop / undo

Close the test session. Disable or remove only the provider entry you added, and revoke the test key if no longer needed. Check the provider usage dashboard. Uninstalling Harness does not necessarily cancel API billing or revoke a key.

Sources: [Harness model settings](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md), [Abliteration](https://abliteration.ai), [OrcaRouter](https://orcarouter.com).
