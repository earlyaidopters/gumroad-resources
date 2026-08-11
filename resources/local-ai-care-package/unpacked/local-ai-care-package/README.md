# Local AI Care Package

Everything from the video. Both skills, the harness tips, and the raw source of all four websites so you can feed them to a model and have it reverse engineer them.

## What is in here

```
local_harness_guide.pdf  THE GUIDE, 16 pages, start here
local-harness-guide.md   the same guide as raw markdown
immersive-web-skill/     the cinematic lane, scroll-scrubbed video and 3D sites
editorial-web-skill/     the premium lane, editorial product and brand sites
harness-tips.md          the 10 harness tips as a quick reference
websites-html/           source of DURABLE, MERIDIAN, COVE and HEARTH
```

## Start with the guide

`local_harness_guide.pdf` is the hero of this package. Four sections: getting the models onto your machine, wiring the harness, training it with Claude or Codex, and the honest limits. Sections 1 and 2 are an afternoon of setup. Section 3 is the part that actually matters, the babysitting pattern where a frontier model watches your local model fail and every failure becomes a permanent harness part.

`harness-tips.md` is the condensed version of that third section, ten numbered tips, for when you want the checklist rather than the reasoning.

## The two skills

| Skill | Builds | Use when |
|---|---|---|
| `immersive-web` | Cinematic scroll-scrubbed and 3D sites | Scroll drives a video playhead, or the scene reacts to cursor and scroll, or you want a walkable world |
| `editorial-web` | Premium product and editorial sites | Expressive serif type, soft paper canvas, rounded media plates, alternating feature rows, calm reveals. No WebGL |

They route to each other. If a request needs WebGL or video scrubbing, editorial-web sends you to immersive-web, and immersive-web's Path B covers the no-WebGL lane.

```
immersive-web-skill/
  SKILL.md                     the decision tree and the one-shot pipeline
  references/                  8 deep references (archetypes, three-scene,
                               scroll-choreography, shaders, video-driven,
                               scrub-video, variation, asset-pipeline)
  assets/template/             Vite + Three.js + GSAP ScrollTrigger + Lenis
  assets/template-scrub/       the scroll-scrubbed video template
  scripts/setup-scrub.sh       one command, video in, scaffolded site out

editorial-web-skill/
  SKILL.md                     the pipeline plus the CSS-markup contract check
  references/editorial-anatomy.md   two moods, 10-section grammar, fail tells
  references/effects.md        the special-effects menu with verified recipes
  references/variation.md      the axes that keep every site distinct
  assets/template-editorial/   Vite + GSAP + Lenis editorial starter
```

## Install into Pi

```bash
mkdir -p ~/.pi/agent/skills
cp -R immersive-web-skill ~/.pi/agent/skills/immersive-web
cp -R editorial-web-skill ~/.pi/agent/skills/editorial-web
```

Pi loads skills at startup, so run `/reload` in your session (or restart pi) before either skill is visible. Confirm with `/skills`.

## Install into Claude Code

```bash
mkdir -p ~/.claude/skills            # or .claude/skills/ inside one project
cp -R immersive-web-skill ~/.claude/skills/immersive-web
cp -R editorial-web-skill ~/.claude/skills/editorial-web
```

The frontmatter (`name`, `description`) is the same format Claude Code expects, so both load as-is. Any agent that reads markdown skills can use them. The references and the three templates are not agent-specific, which is most of the value.

## The one-shot video path (immersive-web, Path B2)

This is the path from the video. You give it one video file and it scaffolds the entire experience, cinemagraph idle, brand title card, alternating text beats, HUD, letterbox, velocity zoom, marquee, landing sections.

```bash
~/.pi/agent/skills/immersive-web/scripts/setup-scrub.sh hero.mp4 ./site \
  "BRANDNAME" "TAGLINE" "#e3b505" "ALT" 3842 1204 "M"
cd site && npm install && npm run dev
```

Requires `ffmpeg` and `ffprobe` on your path, plus Node 18 or newer. The script probes the video, extracts frames at the right resolution, copies the template, and injects the frame count and scroll runway. Then the model only writes copy, never plumbing. It prints the remaining `{{TOKENS}}` for the agent to fill.

## The editorial path

```bash
cp -R ~/.pi/agent/skills/editorial-web/assets/template-editorial ./site && cd site
npm install && npm run dev
```

Do not create the target directory first, the copy creates it. Then read `references/editorial-anatomy.md` before writing anything. That genre wins on restraint and the fail tells are specific.

Run either path on the largest model you can load. Smaller models handle single edits fine but not a full build.

## The harness tips

`harness-tips.md` is the quick-reference version of the guide's third section. Ten practical additions, each one there because something broke. Offline guards, the goal gate, deterministic skill routing, browser self-checks, model-fit prompting, freshness, the CSS-markup contract check, and the babysitting loop.

Start with the goal gate if you only do one.

## The websites

`websites-html/` holds the real source of all four sites. Media and dependencies are stripped for size, so they will not run until you supply your own, and the README in that folder explains how to point the pipeline at your own footage.

The point of them is not to run them. Feed them to a model and ask it to explain the scroll choreography, the token-driven theming, the reveal timing, and the variation picks each `DESIGN.md` records. That is a faster way to learn this genre than any tutorial.

## Two things that decide whether the output is good

1. Look at the media before you write copy. For a video, extract six spaced frames with ffmpeg and read them. For an editorial site, sample the palette from the brand's own photography. The copy has to narrate the actual thing.
2. Do the variation pass. Both skills ship a `references/variation.md` with axes. Pick one option per axis and apply it fully, otherwise every site you build looks like the same site.

## Verify before you call it done

```bash
npm run build
```

Then look at the page with a browser tool at scroll positions 0, 0.3, 0.6 and 0.9. Fix and re-check until every state passes. Rendering is not the same as looking right.

## Two paths that point at my machine

Both SKILL.md files reference a design-taste skill at `~/.agents/skill-packs/design-taste/gpt-tasteskill/SKILL.md` during the variation step, and editorial-web appends to a build registry at `~/.pi/agent/design-history.md`. You will not have either. Skip those two lines, the variation reference in each skill folder carries the part that matters.

---

If you want the full local AI stack behind this, including the setup walkthroughs and direct access to the team, check out the Early AI-dopters community.

https://www.skool.com/earlyaidopters/about
