# Route 3: LM Studio on your computer

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

## Choose and load

Use prompt 07. Keep headroom for your OS, other apps, model context/cache and vision projector. Check available memory, not only total RAM. Read the model card and license; do not treat download counts as a safety certificate.

Use prompt 08 to connect the model you chose. The recording used a Huihui Qwen3.6 35B-A3B GGUF build; it is not suitable for every computer. See `config/recorded-models.json` for recovered source identity. Reuse a compatible download instead of downloading again.

Open LM Studio, load the chosen model, and start its local server from the Developer tab. Keep network serving off. Its CLI also supports:

```sh
lms ls
lms load YOUR_MODEL_KEY --context-length 4096 --identifier defensive-local --ttl 600
lms server start --bind 127.0.0.1 --port 1234
```

The context value is a conservative starting example, not the recorded setting. If load fails, use a smaller model/context or close other applications. Do not force allocation beyond available memory.

## Image compatibility note

The fresh test of the existing Q4_K runtime passed text and function calling but failed the synthetic image check. Do not use that result as proof of working vision. If you need screenshots, confirm the correct projector and runtime support, then pass the image test before continuing. See verification/local-model-result.json.

## Connect Harness

Settings > Models > Add model provider > Custom model API. Use OpenAI Chat Completions and `http://127.0.0.1:1234/v1`, then select the ID returned by the server. Bind the Harness UI locally too.

```sh
python3 scripts/check_endpoint.py --base-url http://127.0.0.1:1234/v1 --model defensive-local --tools --image assets/vision-test.png
```

This tests a two-turn conversation, a harmless function call and the synthetic image separately. It does not grant the model shell access. After that, test a harmless Harness tool on the local lab. Failing one capability is a reason to fix it or choose another model, not to mark the setup complete.

## Close down

```sh
lms unload defensive-local
lms server stop
```

Stop only the server you started and unload only your test model. If you were already running other workloads, preserve them.

Sources: [LM Studio server](https://lmstudio.ai/docs/developer/core/server), [Tool use](https://lmstudio.ai/docs/developer/openai-compat/tools), [Harness provider guide](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md).
