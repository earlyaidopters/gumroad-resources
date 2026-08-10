# ROT.md · how this OS decays, and the cadence that fights it

> Revisit: when a layer's real-world change rate shifts (a new vendor, a law change, a faster-moving client). Last touched: 2026-06-15.

The single most common question I get about an agentic OS is some version of "how do I stop this from going stale and useless after a month?" This file is the honest answer. Different layers rot at different rates, like a building. The walls and the foundation hold for years. The food in the fridge is gone by the weekend. You do not maintain them on the same schedule, and you do not panic when the fast layer moves, because it is supposed to.

## The rot model, layer by layer

| Layer | Rots in | Why it moves at that rate | What you do about it |
|---|---|---|---|
| Identity (`CLAUDE.md`) | Months to a year | Who I am and who I serve barely changes. A new client type or a changed point of view, not a normal Tuesday. | Revisit once or twice a year, or when the roster materially changes. |
| Rules & Hooks | Weeks | A compliance change, a new policy, a pattern I now repeat. Maybe 40 percent of rules survive a year untouched, the rest get revisited. | Monthly review pass. A rule that contradicts a newer one is the signal. |
| Skills | Days to weeks | My clients change, edge cases surface, and the models themselves get smarter, so a skill that needed forty lines last year needs ten now. A skill is an infinite game. | Edit on contact. If a skill has not changed in a month and you use it weekly, look closer. |
| Agents | Days | Roles shift as the work shifts. An agent gets scope-crept until it needs to split, or a smarter model absorbs the role entirely. | Revisit when an agent starts doing two jobs, or when a model upgrade makes it redundant. |
| Tools, MCPs, CLIs | Hours | This is the fastest layer. An API changes, a token expires, a vendor renames an endpoint, an MCP gets deprecated in favor of a CLI. | Expect breakage. Wrap, never marry. The decision log records why each wire was chosen so it is cheap to re-choose. |
| Substrate (the wiki) | Does not rot, it grows | The compounding memory. Every ingest makes it richer. The only failure mode is a page going stale relative to the source activity that moved past it. | The `Revisit:` lines and `expiry.md` catch stale pages. Re-ingest, do not rebuild. |

## Why models getting smarter is a rot source too

A prompt written for an older model looks bloated to a newer one: the analogies, the "act as if you are an expert," the over-explanation. As the models improve you write less to get the same result or more, so skills and agents trend leaner over time. A skill that has not been touched in a long while is not necessarily good, it may just be carrying instructions the current model no longer needs. That is drift, and the maintenance loop is how you catch it.

## The per-file `Revisit:` convention

Every file in the substrate that can go stale carries a second line:

`> Revisit: <when or under what condition this becomes stale>  ·  Last touched: <YYYY-MM-DD>`

A point-in-time document, like a bank statement extract, uses `Expires:` instead, because it is superseded by the next period rather than refreshed. The full register of every file and its trigger lives in `_substrate.wiki/expiry.md`. This is the rot model made operational: not a vibe, a checklist with dates.

## The cadence that fights it

The point is to make upkeep happen to me, not to wait on me to remember.

- **Monthly, automatic.** A `/schedule` cron runs the `maintain-os` skill (see `.claude/workflows/schedule.md`). It walks the `Revisit:` dates, finds what is past due, and interviews me with multiple-choice questions to refresh it. Five minutes of tapping answers, and the stale layers are current again.
- **Weekly, light.** The `maintain_os` workflow scans all five layers plus the wiki against `os-blueprint.md` and reports cruft and drift, never deleting, always my call. See `MAINTENANCE.md`.
- **On contact, always.** When I am in a skill and notice it missing an edge case, I fix it then. The fast layers get maintained by use.

A system that provokes you is a system that survives. One that waits for you to remember is one you find rotted in a month.
