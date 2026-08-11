# Variation axes — make each site ITS OWN

The template guarantees the machinery. This file guarantees no two sites look the same. After filling tokens, you MUST walk these axes, pick ONE option per axis to fit the brand's personality and the footage, apply the listed edits, and write your choices + one-line reasons into `DESIGN.md` in the project root. BEFORE picking, read the central registry `~/.pi/agent/design-history.md` (create if missing) — it lists every past site's axis combination. Repeating a listed combination is forbidden. AFTER writing DESIGN.md, append one line to the registry: `<date> <brand>: 1A 2C 3B 4A 5-DEPTH 6C 7B 8-steps`.

Derive the brand's 3 adjectives first (e.g. rugged/honest/outdoor vs precise/secure/premium vs playful/fast/consumer) — every pick below must trace to an adjective.

## Axis 1 — Palette mood (edit `:root` in style.css)

- **A. Dark cinematic** (default): keep. Fits: outdoor, automotive, gaming, cinematic footage.
- **B. Light editorial**: `--bg: #f4f2ed; --fg: #111; --muted: #777`; scrims flip to light; text-shadow removed; letterbox bars stay black. Fits: fashion, architecture, wellness, bright footage.
- **C. Mono + electric**: `--bg: #050505; --fg: #e8e8e8` and a saturated electric accent (#00e0a4, #4f7bff, #ff3d00 class). Fits: fintech, dev tools, technical brands.

## Axis 2 — Typography voice (edit .beat__title / .brand__mark)

- **A. Compact editorial** (default): 5.2vw, weight 800, tight tracking.
- **B. Monumental**: brand mark 14vw, beats stay compact — the NAME is the hero. Fits: single-word brands, luxury.
- **C. Technical mono**: headlines 3.6vw in the mono stack (`"SF Mono", Menlo, monospace`), labels become plain uppercase text with a `1px solid` accent underline instead of chips. Fits: fintech, engineering, data brands.

## Axis 3 — Label treatment (edit .beat__label)

- **A. Solid accent chip** (default).
- **B. Outlined**: `background: none; border: 1px solid var(--accent); color: var(--accent);`
- **C. Rule line**: no box — accent text with a 24px `::before` horizontal rule. Quietest, most premium.

## Axis 4 — Beat placement (edit beat--left/right classes in index.html)

- **A. Alternating L/R** (default). Fits footage with a central path.
- **B. Left rail**: all beats `beat--left` — consistent editorial column. Fits footage with action on the right.
- **C. Bottom-third centered**: all `beat--center` + `align-items: flex-end; padding-bottom: 14vh` — subtitles-style. Fits symmetrical/tunnel footage where sides are busy.

## Axis 5 — HUD metaphor (script args — decide BEFORE running setup-scrub.sh)

Altitude descent / DEPTH countdown to 0 / LAYER 01→07 (integers, edit format) / DIST km / PRESSURE / % SECURED. Position default top-right; for centered beats move HUD top-left (`left: 28px; right: auto`). The metaphor must match what the footage physically does.

## Axis 6 — Idle treatment (video-scroll.js startIdle)

- **A. Drifting mist** (default). Fits atmospheric/outdoor footage.
- **B. Grain pulse**: no fog; slow 0.97-1.0 opacity breathing on a grain overlay + accent glow pulsing on the brand mark. Fits interiors/tech where fog reads as smoke.
- **C. Scan line**: a 1px accent line sweeping down the still every ~6s (technical brands).

## Axis 7 — Marquee divider

- **A. Accent marquee** (default). Loud, confident brands.
- **B. Replace with a stat strip**: 3-4 big numbers (mono) with small labels — fintech/data brands earn more trust from numbers than slogans.
- **C. Delete it**: luxury/minimal brands — whitespace instead.

## Axis 8 — Landing sections

Reorder/restyle to fit the offer: product specs grid (physical products) / 3-step "how it works" (services, fintech) / stat strip + single testimonial (trust brands) / gallery row (visual brands). Rewrite ALL copy; headings follow the typography voice.

## Discipline

- Exactly ONE pick per axis, applied completely — half-applied axes look broken.
- After applying, browser_check the top, one beat, and one landing section again: expect "consistent with DESIGN.md choices, no default-template look".
- DESIGN.md format: one line per axis: `Axis 3: B (outlined) — precision brand, solid chips read too casual.`

## Taste layer (professionally authored — use it)

`~/.agents/skill-packs/design-taste/` holds the open-source taste-skill pack (MIT, Leonxlnx/taste-skill). Read alongside these axes:

- `gpt-tasteskill/SKILL.md` (8KB) — ALWAYS read before Axis picks: brief inference, layout variance rules, anti-slop bans. Written for strict models; follow it literally.
- Style directions to pair with Axis 1-3 picks: `minimalist-skill/` (restrained editorial), `brutalist-skill/` (raw/loud), `soft-skill/` (calm, expensive, whitespace).
- `output-skill/SKILL.md` (3KB) — read before finishing: bans placeholders, skipped sections, half-finished output.
- `taste-skill-v1/SKILL.md` (21KB) — the full original; read when the brief is unusual and the axes don't cover it.
