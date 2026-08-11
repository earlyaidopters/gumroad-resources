# Variation axes — editorial genre

Pick ONE option per axis before styling, from the brand's personality and media. Record every pick + a one-line reason in `DESIGN.md` at the project root. Check `~/.pi/agent/design-history.md` and never ship a combination already used; append your combination when done.

1. **Mood** — soft-light product | warm editorial brand | ink-on-cream monochrome | charcoal-dark with warm accents
2. **Display serif voice** — romantic high-contrast (Playfair/Fraunces soft) | sturdy slab-ish (Fraunces black, Zilla) | elegant condensed (Cormorant) | quirky humanist (Gaya-like, Lora italic)
3. **Hero alignment** — centered statement | left-set with media peeking right | serif over full-bleed media panel. Left-set on the template's flex-column hero REQUIRES adding `align-items: flex-start` — the default stretch turns the CTA pill into a full-width bar (this shipped once).
4. **Plate shape** — rounded 16-24px | arch-topped (radius 50% top) | squared with hairline border | mixed (hero arched, cards rounded)
5. **Accent delivery** — deep display color + pill buttons | colorful icon chips on neutral text | one saturated panel only, all else neutral
6. **Rail treatment** — drag rail with snap | static 3-up grid that breaks to rail on mobile | stacked full-width plates (no rail)
7. **Chapter break** — deep color panel | full-bleed image with serif overlay | oversized serif on canvas (no panel)
8. **Texture layer** — none (pure flat) | paper grain overlay | sparse particle sprinkle | subtle vignette on plates

Axis picks must AGREE with each other (a charcoal-dark mood with pastel icon chips fights itself). When two picks conflict, the mood axis wins.
