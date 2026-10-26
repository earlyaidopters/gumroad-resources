# Verification status

Release preparation: 26 October 2026. These are bounded tests, not a security certification.

| Layer | Status |
| --- | --- |
| Offline helper suite | 11 tests passed: denied scope, remote target rejection, expired scope, synthetic finding/fix, proxy auth/origin restrictions, idle state and failed stop handling |
| Local LM Studio | Two-turn memory and harmless function roundtrip passed; synthetic image test FAILED on the loaded Q4_K runtime. See local-model-result.json. |
| Firecrawl keyless MCP | Initialized, listed three tools and successfully scraped example.com; no private data submitted |
| Harness MCP schema | Matched to upstream native plugin docs; no claim of a new full-profile installation on every OS |
| Hosted paid provider | Not freshly exercised in this build; needs the reader's chosen account/key |
| New RunPod deployment | Not launched: no new paid compute was provisioned for this release |
| RunPod idle-stop HTTP operation | Offline behavior tested; real stop requires an approved exact Pod and private key |
| Windows/Linux native setup | Documentation and prompts included; no fresh native-install claim |

Use smoke-test-checklist.md for your installation. Do not treat a current documentation link as a successful live test. The original recording's model results and this release's fresh tests are different evidence.
