# Before a downloaded model gets tools

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

Read [ProjectDiscovery: How abliterated models can get you pwned](https://projectdiscovery.io/research/how-abliterated-models-can-get-you-pwned), the article promised in the video. It describes a deliberately backdoored research model. It does not establish that the models in this kit are compromised.

Treat weights and tools as separate trust decisions. Record the model publisher, repository, exact revision, file hash, format and license. Prefer a documented provenance chain; a familiar name or popular download can still be modified. A file scanner cannot certify model behavior.

First run a model without tools and without personal files. Then grant the smallest tool set needed for one synthetic task. Prefer a disposable, isolated environment. Enforce restrictions in the OS/container/runtime: telling a model not to read secrets is not a filesystem boundary. A localhost bind also does not isolate the model from files the harness can access.

Keep real credentials and production data out of the test workspace. Give research tools public documentation URLs; do not upload private code or customer records to a third-party crawler. Validate tool arguments before execution and review unexpected network destinations.

Watch for requests to fetch and execute remote scripts, expose keys, disable protections, or expand scope. Stop and investigate. Do not test malicious payloads from the article on your working machine.

Keep the model card and runtime version with each test result. If you update the weights, projector, template, runtime or tool permissions, rerun the relevant checks.

Also read [Harness safety guidance](https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md) and [Hugging Face model security](https://huggingface.co/docs/hub/security).
