# Editorial template

Vite + GSAP ScrollTrigger + Lenis. No WebGL. Every file:

- `index.html` — the full page skeleton with `{{TOKENS}}`. Sections in order: nav, serif hero, hero media (video), manifesto pull-quote, 3 alternating feature rows, horizontal card rail, full-bleed banner panel, stats strip, closing CTA, footer.
- `src/style.css` — ALL theming lives in the `:root` token block at the top (palette, fonts, radius, rhythm). Retheme by editing tokens, never by scattering hardcoded colors.
- `src/main.js` — smooth scroll (Lenis feeding ScrollTrigger, single RAF), nav scroll state, split-line headline reveals, generic `[data-reveal]` / `[data-reveal-group]` fades, hero media parallax, drag-to-scroll rail, anchored links through Lenis. The boot wiring is correct; do not re-derive it.
- `public/media/` — drop the brand's video + images here; tokens reference them by filename.

Media tokens expect files in `public/media/`: `{{HERO_VIDEO}}`, `{{FEATURE_n_IMG}}`, `{{CARD_n_IMG}}`.
