# Take a saved copy online

Use only after saving and comparing the local Heretic outputs. Hosting does not perform the model edit. Keep the original, the full-size edited copies, and compressed deployment copies distinct.

## Tested route, 15 November 2026

Hostinger KVM 2, Ubuntu 24.04, two CPU cores, 8 GB memory. Two Qwen3-4B edited models compressed to Q4_K_M, approximately 2.3 GiB each; one loaded at a time with llama.cpp b12359. Public access uses Caddy HTTPS with password authentication in front of a loopback-only llama-server. Secrets belong in private user configuration, never this skill or project.

The history copy answers the demonstrated question but omits the military crackdown. The customer copy lost the intended first-turn request for price and policy. It asks the customer to choose compensation. Its own follow-up can calculate $10 but adds an unnecessary confirmation. The original full-size assistant-message replay omitted the amount. These are experimental copies, not a production customer-service bot. Never present the compressed model as behaviorally identical to its full-size source.

## Assistant workflow

1. Use the Hostinger plugin to list VPS instances and inspect the intended server. Ask which one if the target is ambiguous. Confirm cost before a new purchase. Preserve current files/services and avoid template reinstallation. Check RAM, free disk, occupied ports and current processes over SSH.
2. Hash the selected source model shards. Check against the local edit manifest. Clone the official llama.cpp source at the tested tag `b12359` into an isolated tools directory; record its resolved commit. Use its conversion dependencies in a separate Python environment. Read the checked-out conversion/build documentation before executing.
3. Convert each saved full-size model into a new BF16 GGUF, then quantize that file to a new Q4_K_M GGUF. Never quantize the only retained source. Example commands, with absolute paths supplied by the assistant:

```sh
python "$LLAMA/convert_hf_to_gguf.py" "$SAVED_MODEL" --outfile "$FULL_GGUF" --outtype bf16
"$LLAMA/build/bin/llama-quantize" "$FULL_GGUF" "$COMPACT_GGUF" Q4_K_M
```

4. Compare the compact copy locally with the same system/user messages and generation settings. A normal behavior test uses `You are a helpful assistant.` with greedy generation, repetition penalty 1.0 and a 500-token cap. Continue its own actual reply; do not substitute the full-size model's reply. Save unedited failures too. Compression may change the result enough that the user should choose a different host/format.
5. Add an SSH public key through the Hostinger plugin if needed. Keep its private key outside the workspace. The plugin manages the account; SSH transfers model files and installs the runner. Copy to a new directory, verify SHA-256 remotely, then install a dedicated service. Do not replace existing services without authorization.
6. Configure llama-server to bind only to 127.0.0.1, with one loaded model and one request slot on this 8 GB host. Tested router command:

```sh
llama-server --models-dir /opt/unlock/models --models-max 1 --host 127.0.0.1 --port 8080 -ngl 0 -t 2 -tb 2 -c 4096 -np 1 --jinja --offline --cors-origins localhost --no-cors-credentials
```

The runner must match the server CPU/OS. Preserve the pinned release and binary checksum. Start it with systemd under a dedicated/dynamic unprivileged user. Only model loading/routing is concurrent; the test does not establish multi-user capacity.

7. For access away from the laptop, use a DNS hostname already resolving to the VPS. Install Caddy using its official instructions and protect every route with a strong randomly generated password before exposing inference. Caddy 2.6 calls the directive `basicauth`; 2.8+ calls it `basic_auth`. Hash the password rather than putting plaintext in Caddyfile. Require HTTPS, reject foreign Origin headers, and proxy to the local runner. With a localhost-only CORS configuration, rewrite the upstream Host to localhost and remove Origin only after the front proxy's same-origin check. Do not simply allow all origins.
Use the included `assets/hosting/index.html` as the chat front end, served behind the same authentication. It sends the neutral system message and explicit test settings. The generic bundled llama.cpp UI uses its own defaults and produced a refusal in a separate browser test, so do not substitute that interface for the scripted demonstration. Serve the included HTML from `/` and proxy API routes to the runner using mutually exclusive Caddy handle blocks; otherwise the default upstream page can be appended to the custom page. Check that exactly one main element exists. Model selector IDs must match the model aliases returned by `/v1/models`.

8. Verify an unauthenticated request receives 401, an authenticated external HTTPS request succeeds, and a foreign Origin request is denied. Re-run the exact demo through the public address with no SSH tunnel. Verify the browser can select the models and receive a fresh reply; inspect desktop and phone-sized viewports. A phone-sized browser is not a physical-phone test. Do not claim the laptop was powered off unless it was.
9. Give the user the URL and the location of the private credentials. Explain which model succeeded or regressed. Preserve the subscription's auto-renew setting; a test does not authorize enabling it. Report the actual expiration and current billing state without advertising a historical price as a current offer.

## Sources

- https://github.com/ggml-org/llama.cpp/tree/b12359
- https://github.com/QwenLM/Qwen3/blob/main/docs/source/run_locally/llama.cpp.md
- https://caddyserver.com/docs/install
- https://caddyserver.com/docs/caddyfile/directives/basic_auth
- Hostinger plugin `vps_virtual-machines_list`, `vps_ssh-keys_add-virtual-machine`, and `billing_subscriptions_list`. Use operation schemas returned by the connected account.
