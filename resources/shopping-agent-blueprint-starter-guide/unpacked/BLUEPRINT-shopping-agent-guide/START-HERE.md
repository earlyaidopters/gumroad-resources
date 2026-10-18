# Test a shopping agent before connecting your store

Mark Kashef • BLUEPRINT • 26 September 2026

Start with Anthropic’s [commerce-agents repository](https://github.com/anthropics/commerce-agents). This guide gives you a small first test and a checklist for deciding what to connect next. The documentation was inspected; the software was not run for this guide.

## 1. Try the fictional shop

The project has customer-facing shopping agents and staff-facing merchant agents. Use the retail demo first. It can help someone find products and prepare a cart. Checkout hands control back to the host application. Merchant changes require approval. The examples use fictional business data.

The current README calls for Python 3.11 or newer and Node 22. Follow its setup steps in a separate folder. Chat needs an Anthropic API key and can incur model charges. Add the key privately when prompted; keep it out of shared files and screenshots. You can inspect the catalog without using chat.

Paste this into your coding assistant:

> Inspect https://github.com/anthropics/commerce-agents and its current retail setup instructions. Explain the dependencies and expected model costs before running it. Set up only the fictional retail demo on my computer. Keep it local. Ask me to provide any required key privately. Keep merchant approval enabled. Do not connect my store, import customer records, publish the app or change live inventory. Show me the local storefront and document what you actually verified.

## 2. Run three checks

Open the retail storefront, then try these prompts one at a time. These are suggested checks, not recorded test results.

| Check | Ask | What to inspect |
|---|---|---|
| Find | Find a tent for a beginner camping trip within a $250 budget. | Recommendations should exist in the demo catalog. Check prices against the displayed records. |
| Compare | Compare two available options and explain which fits my budget. | Inspect the cited product details. Flag invented specifications or unsupported recommendations. |
| Cart | Add my chosen option and explain the return policy. | Inspect the item, quantity and policy source. A prepared cart must not be described as a completed purchase. |

Save a short record for each check: input, expected result, observed result, and evidence. If it fails, reduce the scope and fix that case before trying more tasks.

## 3. Test merchant approval separately

Start the merchant demo using its README. Ask for one listing improvement using only facts already in the catalog. Inspect the proposed change. Reject it first and verify that the underlying record stays unchanged. Then approve a harmless change in the fictional demo and check the result.

Keep the approval control in the application. The safety documentation distinguishes a proposed preview from an authorized change. Do not remove the approval requirement to make a demo look smoother.

## 4. Decide whether to connect real systems

The examples lack production authentication. Before exposing them, assign someone to implement access control, rate limits, business rules, credential storage and payment handling. Review what customer facts are retained, who can see them and how they can be deleted. Avoid logging full customer conversations or carts during routine operation.

Begin with a small read-only catalog integration and a fixed spending limit. Add cart changes only after testing wrong product IDs, stale prices and unavailable inventory. Keep live merchant writes off until an authorized person can review and reverse them.

## Source links

- [Repository and current installation steps](https://github.com/anthropics/commerce-agents)
- [Retail demo instructions](https://github.com/anthropics/commerce-agents/tree/main/examples/retail)
- [Safety boundaries](https://github.com/anthropics/commerce-agents/blob/main/docs/safety.md)

The upstream code uses Apache-2.0. This download links to the maintained repository rather than bundling a stale copy. No conversion uplift or production-readiness claim is made.
