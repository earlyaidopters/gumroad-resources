# Example defensive report

**Defensive use only. Work on systems you own or have explicit permission to test. Keep credentials private and verify AI findings before acting.**

Target: included localhost lab. Data: synthetic. Check: one GET request. This example is not a report about a real customer system.

## Finding: missing browser hardening header

**Observed:** the lab response does not include `X-Content-Type-Options: nosniff`.

**Interpretation:** this is a configuration-hardening observation. It does not prove account compromise, data access, or an exploitable vulnerability on its own.

**Fix:** configure the application or reverse proxy to send the header, then repeat the exact check. The included lab's `--hardened` switch simulates the fix for learning.

**Retest:** use the same target and one-request limit. Record the returned header and whether the original observation is resolved. Do not expand the scan to unrelated systems.

Use the same structure for real authorized work: scope, observation, minimal redacted evidence, impact with uncertainty, fix, and retest.
