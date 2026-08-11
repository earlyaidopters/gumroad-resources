---
name: editorial-web
description: Build premium editorial DOM websites — expressive serif display type, soft warm canvases, rounded media plates, alternating feature rows, card rails, calm scroll reveals. No WebGL, no scroll-scrubbed video. Use for product/SaaS landing pages, brand sites, hospitality/outdoor brands, or any request for a "clean", "editorial", "premium", or "magazine-like" site. For 3D/immersive/scroll-scrubbed sites use the immersive-web skill instead.
---

# Editorial websites

Build the class of site that looks like a printed magazine came alive: one expressive serif, soft paper canvas, media presented as rounded plates, calm confident motion. This genre wins on RESTRAINT — read `references/editorial-anatomy.md` first; it defines the two proven moods (soft-light product / warm editorial brand), the 10-section layout grammar, the motion grammar, and the instant-fail tells.

Routing: if the request needs WebGL, 3D, a game world, or scroll-driven video scrubbing, STOP and use the `immersive-web` skill. This skill is the no-WebGL editorial lane.

## Pipeline (one shot)

Run on the LARGEST available model (the 122B). Set gates before starting:

```
/gate npm run build
/gate ! grep -rq '{{' index.html
/gate test -f DESIGN.md
```

Running non-interactively (no /gate available)? Then run those three commands yourself before declaring the build done, plus the CSS-markup contract check below. A failing check means the job is NOT done, no matter how good the screenshots look.

**CSS-markup contract check (mandatory):** every class selector you ADD to style.css must exist in index.html. A real 122B build wrote `.banner__bg` / `.banner__overlay` styles but never added those divs — the section silently rendered text-on-background-color with no image. After any CSS edit that introduces new class selectors, verify each one:

```bash
for cls in $(grep -o '^\.[a-z][a-z0-9_-]*' src/style.css | sort -u | tr -d '.'); do
  grep -q "class=\"[^\"]*$cls" index.html || echo "MISSING IN HTML: .$cls"
done
```
Investigate every MISSING line (JS-created classes like .cursor-dot/.grain/.progress are the only legitimate misses).

1. **Start from the template** (verified working — do not rebuild the machinery):

```bash
# do NOT mkdir the target first — cp creates it
cp -R ~/.pi/agent/skills/editorial-web/assets/template-editorial ./SITE_DIR && cd SITE_DIR
ls package.json   # MUST exist here before continuing
npm install
```

`README.md` inside maps every file. The boot wiring in `src/main.js` (Lenis + ScrollTrigger single RAF, split-line reveals, drag rail) is correct — extend it, never re-derive it.

2. **LOOK at the media first.** Copy the supplied brand media into `public/media/`. You are a vision model: read the hero video's frames and each image. Sample the palette FROM the media (dominant deep tone -> `--accent`/`--panel`, warm neutral -> `--bg`). Pick the mood (soft-light product vs warm editorial brand) from the media and brief.

3. **Theme by tokens.** ALL theming lives in the `:root` block of `src/style.css`. Set palette, then pick ONE display serif + ONE body sans (add a Google Fonts `@import url(...)` line at the very top of style.css, e.g. Fraunces/Playfair/Cormorant for display + Inter/Sora for body — vary per brand). Never scatter hardcoded colors below the token block.

4. **Fill every `{{TOKEN}}` in index.html.** Writing rule: never use em dashes anywhere in the copy (use a comma, period, or rewrite); no colons in copy either. Hero headline is a single serif statement (max ~10 words, sentence case). Manifesto is 2-3 full sentences in the brand's voice — this section makes it editorial, write it well. Feature rows: ONE label + ONE title + ONE short paragraph each, never bullets. No token may remain (gate enforces).

5. **Verify with your eyes.** `npm run dev`, then `browser_check` with `expect` at scrollTo 0 (nav + serif hero + hero media frame), 0.3 (manifesto/features revealed, correct alternation), 0.6 (card rail + banner panel), 1.0 (CTA + footer), plus `mobile: true` at 0. Fix and re-check until every VERDICT is PASS. Console must be clean. Never dismiss a 404 or failed request as "unrelated" or "pre-existing" — every asset the page references is yours. Prove it loads (`curl -s -o /dev/null -w '%{http_code}' <url>` returns 200) or fix it before shipping.

6. **MAKE IT ITS OWN — mandatory.** Read `references/variation.md` AND `~/.agents/skill-packs/design-taste/gpt-tasteskill/SKILL.md`. Pick ONE option per axis, apply fully, record picks + reasons in `DESIGN.md`. Two sites shipping the same combination is a FAIL. Re-verify after applying. Then APPEND one line to `~/.pi/agent/design-history.md` (date, brand, site dir, axis picks) — the registry is how future builds avoid repeating you; writing DESIGN.md alone is not enough.

7. **Sweep every component.** Buttons, cards, nav, footer, stats — if any element would look at home in a default Bootstrap page, restyle it from the site's tokens. Check hover states. The hero being great and the components being generic is the most common real-world failure.

## Media

Brand media (video loop, photography) is supplied in a `media/` folder or by Mark — ask for what's missing rather than substituting stock. Videos autoplay muted in rounded plates; images are object-fit cover inside fixed-ratio frames, so any reasonable resolution works. Do not upscale or letterbox; the plates crop gracefully.

## When a fix "looks the same"

If a re-check shows nothing visually changed: STOP editing. In order: (1) did you edit the file the page actually loads, (2) did the dev server rebuild, (3) is the browser caching, (4) is another rule overriding yours (tokens beat scattered rules — check you edited the token). Verify pixels ACTUALLY changed with browser_check before claiming anything.

## Special effects

After the base site passes verification, read `references/effects.md` and apply 2-4 effects that agree with the mood (magnetic buttons, custom cursor, film grain, clip-path reveals, tilt cards, anime.js character cascade, scroll progress, count-up stats, velocity skew). Log picks in DESIGN.md, guard with prefers-reduced-motion, and re-verify with browser_check afterward — console must stay clean.

## References

- `references/editorial-anatomy.md` — the genre: two moods, 10-section grammar, motion rules, instant-fail tells
- `references/variation.md` — the variation axes that keep every editorial site distinct (mandatory)
- `references/effects.md` — the special-effects menu with verified recipes (GSAP + anime.js)
- `assets/template-editorial/` — verified Vite + GSAP + Lenis starter with `{{TOKENS}}`
