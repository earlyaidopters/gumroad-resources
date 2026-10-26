# RunPod cost control

**Defensive use only. Use your own approved Pod. Keep credentials private.**

Stopping an app is not the same as stopping a GPU. Always confirm the Pod is stopped in RunPod. Persistent storage can still be billed.

## Start with a manual limit

Write down the exact Pod ID/name, approved hourly rate, storage charges, and stop time. Configure any available account budget alerts. At the end, stop that Pod in the console and read back its status. Do not delete it until you've decided what to keep.

## Optional local idle guard

`scripts/idle_proxy.py` forwards OpenAI-compatible requests and watches inactivity. It binds only to loopback, requires a local bearer token, does not log prompts or credentials, and starts in dry-run mode. It can stop an existing Pod only when explicitly enabled. It never starts, creates or deletes a Pod.

This is a helper, not a billing guarantee. It cannot see clients that bypass it. If the computer sleeps, the process crashes, or the network fails, it cannot stop the remote GPU. Use it alongside manual stop and provider-side budget controls.

1. Put the inference key in a private file and set `MODEL_API_KEY_FILE` to that path. Create a separate random local-proxy token in another private file. On macOS/Linux, use permission `600`. Never put keys in command-line arguments or the repository.
2. Set `LOCAL_PROXY_TOKEN_FILE` to the local token path. The Harness provider uses that local token, not the RunPod control key.
3. Start dry-run mode. Substitute the authenticated model endpoint returned by your deployment:

```sh
python3 scripts/idle_proxy.py --upstream https://YOUR_ENDPOINT/v1 --idle-seconds 900
```

4. Point Harness at `http://127.0.0.1:8766/v1`. Enter the local-proxy token privately in Harness. Route all inference traffic through this URL. Use the model's original ID.
5. Send one request, wait, then send another. The timer must restart. A running or streaming request must prevent stop. After the idle interval, the terminal reports `dry_run_would_stop`. Verify before enabling real control.
6. To opt in, set `RUNPOD_API_KEY_FILE` to a private management-key file and restart with the exact Pod ID and name:

```sh
python3 scripts/idle_proxy.py --upstream https://YOUR_ENDPOINT/v1 --idle-seconds 900 --enable-stop --pod-id YOUR_POD_ID --pod-name YOUR_EXACT_POD_NAME
```

The helper checks identity before requesting stop, then waits for `desiredStatus: EXITED`. It reports `stop_failed_or_unverified` on failure. Check the RunPod console yourself after the first real test. Do not treat a stop request alone as proof.

## Restart and remove

Restart the Pod explicitly in RunPod, confirm its endpoint and authentication still work, then restart the local proxy. The helper deliberately does not auto-start a paid resource. To remove the helper, stop its process, restore the Harness provider's original endpoint, and revoke its dedicated control key. Retain your inference key only if you still need it.

The timer counts all forwarded model API requests, including model-list calls. Periodic discovery traffic can therefore keep a Pod awake. A stream is considered active until the upstream connection closes or times out. This guard is intended for a single user's dedicated Pod; it is not suitable for shared workloads without coordinating all clients.

Sources: [Stop API](https://docs.runpod.io/api-reference/pods/POST/pods/podId/stop), [Pod status](https://docs.runpod.io/api-reference/pods/GET/pods/podId), [Storage](https://docs.runpod.io/pods/storage/types).
