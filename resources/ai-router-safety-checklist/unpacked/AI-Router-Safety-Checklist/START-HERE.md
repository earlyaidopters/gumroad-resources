# AI router safety checklist

A router is a service between your agent and the model provider. Before sending it business data or letting its responses drive actions, record who operates it, what it receives and what your agent can do.

Prepared September 30, 2026. This is an operational review checklist, not a security certification or a tested defense implementation.

## Before connecting

- [ ] Write down the exact service URL, operator and upstream providers. Verify the address through the provider's own documentation. Assign a person to approve changes to this list.
- [ ] Read the service's retention and data-use terms. List the information your workflow sends, including file contents and tool outputs. Start with synthetic examples that contain no customer information.
- [ ] Create a separate project credential with the narrowest available access and a spending cap. Record how to revoke it. Keep passwords, production credentials and wallet keys out of prompts and test files.
- [ ] Give the agent a disposable working folder. Keep production databases, customer exports and deployment credentials outside its access. Save a clean starting copy before the test.

## Before executing a returned command

- [ ] Require review for package installs, downloads that will be executed, outbound uploads and production changes. A model's explanation is not approval to run a command.
- [ ] Check the exact package name, version, publisher and source address. Open unfamiliar dependencies from their official project pages. Reject unexplained replacements and unexpected destinations.
- [ ] Save the proposed command and your decision. If a check fails or cannot run, leave the action blocked and ask the owner to resolve it.
- [ ] Run a small task with a known expected result. Compare actual files, tests and outbound destinations with that expectation. A passing example does not establish that future responses are trustworthy.

## Keep a recovery path

- [ ] Keep access-controlled records of configuration changes, decisions and executed actions. Avoid logging secret values. Name the person who reviews unexpected activity.
- [ ] Confirm you can stop the agent, revoke its credential and restore the clean working copy. Test this on the disposable project before expanding access.
- [ ] If you suspect tampering, stop new work and preserve relevant records privately. Revoke potentially exposed credentials, review affected actions and involve your security owner before resuming.

## Copyable first review

> Review my proposed agent setup without changing it. Ask me for sanitized configuration and a description of its intended job. List the model-service addresses, data leaving the machine, writable locations, available credentials by name only, spending limits and actions requiring approval. Map each item to this checklist. Mark missing evidence as unknown. Do not print secret values, run commands from model output or declare the setup secure. Finish with the smallest disposable test and a rollback plan for my review.

## Evidence behind the reel

The researchers examined 28 paid and 400 free third-party routers and reported nine injecting malicious code. Their findings concern the sampled services; they do not establish that OpenRouter itself committed those acts. The paper examines action checks, response screening and audit logging as defenses. These reduce particular risks and do not prove a service is safe.

Source: Liu and colleagues, [Your Agent Is Mine](https://arxiv.org/abs/2604.08407), April 9, 2026. See the [full paper](https://arxiv.org/html/2604.08407v1) for methods, scope and limitations. The checklist and review prompt above are our suggested operating workflow; we have not tested them as a security product.
